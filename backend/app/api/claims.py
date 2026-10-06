"""Claims router (``/claims``): intake, ML scoring, outcomes.

Loads the Random Forest v3 model (``ml/models/sihaiq_rf_v3.joblib``) and a SHAP
``TreeExplainer`` once at import. ``run_prediction`` is shared by manual
creation, CSV import, OCR scan and the ``/claims/predict`` simulator.

Endpoints:
    POST   /claims/predict          Score a hypothetical claim (nothing saved).
    POST   /claims/import-csv       Bulk-create scored claims from a CSV (identity columns refused).
    POST   /claims/                 Create a claim (patient resolved/created by NE) and score it.
    GET    /claims/stats/summary    Counts, total amount, rejection rate.
    GET    /claims/with-patients    Flat claim list with patient NE.
    GET    /claims/                 Full claim list.
    GET    /claims/{claim_id}       One claim.
    PATCH  /claims/{claim_id}/status  Record the outcome; writes training_feedback + audit log.
    POST   /claims/scan             OCR a scanned document and pre-fill the 5 model fields.
    DELETE /claims/{claim_id}       Delete a claim (reason required); writes the audit log.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import tempfile
import os
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from app.database import get_db
from app.models.claim import Claim
from app.models.patient import Patient
from app.models.user import User
from app.schemas.claim import ClaimCreate, ClaimResponse
from app.ml.features import encode_features
from app.api.auth import get_current_user
from typing import List, Optional
from uuid import UUID
from datetime import timedelta, date, datetime
import uuid
import joblib
import shap
import json
import logging
import numpy as np
from pathlib import Path
from app.models.claim_act import ClaimAct

router = APIRouter(prefix="/claims", tags=["Claims"], dependencies=[Depends(get_current_user)])

# ── Load model once at startup ─────────────────────────────────────────────
# SihaIQ v3 : Random Forest (scikit-learn) entraîné sur 3 organismes réels.
MODEL_PATH = Path(__file__).parent.parent / "ml" / "models" / "sihaiq_rf_v3.joblib"
model = joblib.load(MODEL_PATH)
explainer = shap.TreeExplainer(model)

# ── Seuils SihaIQ v3 ───────────────────────────────────────────────────────
# Deux familles de seuils VOLONTAIREMENT INDÉPENDANTES : ne pas les fusionner
# même si elles portent aujourd'hui la même valeur (0.40).
#
# 1) Seuil de DÉCISION — déclenche l'alerte danger / sûr pour l'agent BAF.
#    Orienté recall (mieux vaut une fausse alerte qu'un rejet non anticipé) :
#    il peut être abaissé sans que les zones d'affichage bougent.
SEUIL_DECISION = 0.40

# 2) Seuils d'AFFICHAGE des zones (ÉLEVÉ / MODÉRÉ / FAIBLE) — vocation visuelle :
#    répartir les dossiers en 3 groupes lisibles. Calés sur les quantiles p40/p75
#    de la distribution des scores du RF v3 sur les plages réalistes
#    (séjour 0-14 j, montant 300-40 000 MAD, part 0.60-1.00) : p40=0.39, p75=0.68,
#    arrondis à 0.40 / 0.70 -> répartition ÉLEVÉ 23% / MODÉRÉ 35% / FAIBLE 42%.
#    À recalibrer sur les risk_score réellement observés quand le volume de
#    dossiers le permettra (voir app/ml/calibration_percentiles.sql).
ZONE_MODERE = 0.40
ZONE_ELEVE = 0.70

SHAP_MESSAGES = {
    "duree_sejour":   "Durée de séjour élevée : facteur de risque majeur de rejet.",
    "montant_total":  "Montant élevé : risque de surfacturation / dépassement tarifaire.",
    "part_organisme": "Part organisme atypique : vérifiez la répartition de prise en charge.",
    "mois":           "Période à taux de rejet élevé (saisonnalité).",
    "org_CNOPS":      "Régime CNOPS : profil de rejet spécifique à vérifier.",
    "org_CNSS":       "Régime CNSS : profil de rejet spécifique à vérifier.",
    "org_FAR":        "Régime FAR : profil de rejet spécifique à vérifier.",
}
def write_audit_log(db: Session, tenant_id: str, user_email: str, action: str, resource_type: str, resource_id: str, details: str):
    """Insert one row into ``audit_logs``; errors are printed, never raised.

    Args:
        db: Database session (the caller commits).
        tenant_id: Tenant of the event.
        user_email: Acting user.
        action: Event code, e.g. ``DOSSIER_REJETÉ``.
        resource_type: ``claim`` or ``patient``.
        resource_id: Business identifier (claim number / NE).
        details: Free-text details.
    """
    try:
        db.execute(text("""
            INSERT INTO audit_logs (id, tenant_id, user_email, action, resource_type, resource_id, details)
            VALUES (gen_random_uuid(), :tenant_id, :user_email, :action, :resource_type, :resource_id, :details)
        """), {
            "tenant_id": tenant_id,
            "user_email": user_email,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "details": details,
        })
    except Exception as e:
        print(f"Audit log error: {e}")
# ── Pydantic schemas ───────────────────────────────────────────────────────
class StatusUpdate(BaseModel):
    """Payload of ``PATCH /claims/{claim_id}/status``."""
    status: str
    rejection_reason: Optional[str] = None
    contestation_reason: Optional[str] = None

# ── ML helper ─────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)


def _shap_row_classe_1(shap_values) -> np.ndarray:
    """
    Extrait le vecteur SHAP de la classe 1 (rejet) pour la ligne unique passée au modèle.

    TreeExplainer renvoie selon le modèle et la version de shap :
      - une liste [classe_0, classe_1] de tableaux (n_lignes, n_features)
      - un tableau (n_lignes, n_features, n_classes)   <- cas RandomForest
      - un tableau (n_lignes, n_features)
    """
    if isinstance(shap_values, list):
        arr = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        return np.asarray(arr)[0]

    row = np.asarray(shap_values)[0]
    if row.ndim == 2:            # (n_features, n_classes) -> colonne de la classe 1
        return row[:, -1]
    return row


def run_prediction(claim_data: dict) -> dict:
    """
    Score de risque de rejet + explication SHAP pour un dossier.

    Limite connue du RF v3 : le score n'est pas monotone sur duree_sejour au-delà
    de 30 jours (30 j -> 0.76 mais 60 j -> 0.73). Trop peu de séjours longs dans
    le jeu d'entraînement pour que les feuilles extrapolent correctement. Impact
    pratique faible (peu de séjours réels > 30 j), non corrigé volontairement.
    """
    try:
        X = encode_features(claim_data)
        risk_score = float(model.predict_proba(X)[0][1])

        # Zones d'AFFICHAGE (ZONE_*), distinctes du seuil de décision.
        if risk_score >= ZONE_ELEVE:
            risk_label = "ÉLEVÉ"
        elif risk_score >= ZONE_MODERE:
            risk_label = "MODÉRÉ"
        else:
            risk_label = "FAIBLE"

        shap_vals = _shap_row_classe_1(explainer.shap_values(X))

        from app.ml.features import FEATURE_NAMES
        feature_impacts = list(zip(FEATURE_NAMES, shap_vals))
        top_3 = sorted(feature_impacts, key=lambda x: abs(x[1]), reverse=True)[:3]

        top_factors = [{"feature": f, "impact": round(float(v), 4)} for f, v in top_3]
        top_action = next(
            (SHAP_MESSAGES[f] for f, v in top_3 if v > 0 and f in SHAP_MESSAGES),
            None
        )

        return {
            "risk_score": round(risk_score, 4),
            "risk_level": risk_label,
            "ml_top_factors": json.dumps(top_factors),
            "rejection_cause_predicted": top_action
        }
    except Exception as e:
        # Comportement inchangé (dossier créé sans score), mais l'erreur est tracée :
        # sans ça une régression du modèle passerait totalement inaperçue.
        logger.exception("run_prediction a échoué : %s", e)
        print(f"[SihaIQ] run_prediction ERROR: {type(e).__name__}: {e}")
        return {}

# ── Routes ─────────────────────────────────────────────────────────────────
class PredictInput(BaseModel):
    """Payload of ``POST /claims/predict``: the 5 model fields."""
    organisme: str
    duree_sejour: int
    part_organisme: float
    montant_total: float
    mois: int


@router.post("/predict")
def predict_only(
    payload: PredictInput,
    current_user: User = Depends(get_current_user),
):
    """
    Prédit le risque de rejet SANS créer de dossier.
    Outil d'analyse pour l'agent BAF (simulation).
    """
    prediction = run_prediction(payload.dict())
    if not prediction:
        raise HTTPException(status_code=422, detail="Erreur lors de la prédiction.")

    risk_score = prediction["risk_score"]
    factors = json.loads(prediction["ml_top_factors"])

    return {
        "risk_score": risk_score,
        "risk_level": prediction["risk_level"],
        "risk_percentage": f"{round(risk_score * 100)}%",
        # Alerte opérationnelle : seuil de DÉCISION (pas les zones d'affichage).
        "zone": "danger" if risk_score >= SEUIL_DECISION else "sure",
        "seuil": SEUIL_DECISION,
        "top_factors": [
            {
                "feature": f["feature"],
                "impact": f["impact"],
                "direction": "augmente le risque" if f["impact"] > 0 else "réduit le risque",
            }
            for f in factors
        ],
        "recommended_action": prediction.get("rejection_cause_predicted"),
        "model_used": "Random Forest v3 (3 organismes réels)",
    }

# ── Import CSV (Phase D) ───────────────────────────────────────────────────
import csv, io
from datetime import datetime
from fastapi import UploadFile, File

_FALLBACK_RATES = {"CNOPS": 0.80, "CNSS": 0.70, "FAR": 0.90, "AMO": 0.75, "AMO-Tadamon": 0.85}
_FORBIDDEN_COLS = {"nom", "prenom", "full_name", "name", "cin", "patient_name", "nom_patient"}
_PAYER_NORM = {"CNOPS": "CNOPS", "CNSS": "CNSS", "FAR": "FAR", "AMO": "AMO", "AMO-TADAMON": "AMO-Tadamon"}


@router.post("/import-csv")
async def import_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create scored claims from an uploaded CSV, one per row.

    Required columns: ne_number, organisme, date_entree, date_sortie, montant_total.
    Optional: part_patient, claim_number, service_type. Unknown NEs create a
    patient. Files containing name/CIN columns are refused (CNDP).

    Args:
        file: UTF-8 CSV upload.
        current_user: Injected authenticated user.
        db: Database session.

    Returns:
        dict: created count, per-line errors, number of estimated payer shares, message.

    Raises:
        HTTPException: 400 for forbidden or missing columns.
    """
    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    cols = [c.strip().lower() for c in (reader.fieldnames or [])]

    # 1. Rejet CNDP
    forbidden = _FORBIDDEN_COLS.intersection(cols)
    if forbidden:
        raise HTTPException(
            status_code=400,
            detail=f"Fichier refusé (CNDP) : colonnes interdites {sorted(forbidden)}. "
                   f"Remplacez les noms/CIN par le Numéro d'Entrée (NE)."
        )

    required = {"ne_number", "organisme", "date_entree", "date_sortie", "montant_total"}
    missing = required - set(cols)
    if missing:
        raise HTTPException(status_code=400, detail=f"Colonnes manquantes : {sorted(missing)}")

    created, errors, estimated = 0, [], 0

    for i, raw in enumerate(reader, start=2):
        row = {k.strip().lower(): (v.strip() if v else "") for k, v in raw.items()}
        try:
            payer = _PAYER_NORM.get(row["organisme"].upper())
            if not payer:
                errors.append(f"Ligne {i}: organisme inconnu '{row['organisme']}'"); continue

            # patient par NE (dans le tenant courant)
            patient = db.query(Patient).filter(
                Patient.ne_number == row["ne_number"],
                Patient.tenant_id == current_user.tenant_id,
            ).first()
            if not patient:
                # Création automatique du patient (NE seul, conforme CNDP).
                patient = Patient(
                    id=uuid.uuid4(),
                    tenant_id=current_user.tenant_id,
                    ne_number=row["ne_number"],
                    payer_type=payer,
                    is_active=True,
                )
                db.add(patient)
                db.flush()   # obtient patient.id sans commit complet

            d_in = datetime.strptime(row["date_entree"], "%Y-%m-%d")
            d_out = datetime.strptime(row["date_sortie"], "%Y-%m-%d")
            duree = (d_out - d_in).days
            if duree < 0:
                errors.append(f"Ligne {i}: date de sortie avant l'entrée"); continue
            duree = max(duree, 1)

            montant = float(row["montant_total"])
            if montant <= 0:
                errors.append(f"Ligne {i}: montant invalide"); continue

            part_patient = row.get("part_patient", "")
            if part_patient:
                part_org = round(1 - (float(part_patient) / montant), 2)
                part_org = min(max(part_org, 0.0), 1.0)
            else:
                part_org = _FALLBACK_RATES[payer]
                estimated += 1

            prediction = run_prediction({
                "organisme": payer,
                "duree_sejour": duree,
                "part_organisme": part_org,
                "montant_total": montant,
                "mois": d_out.month,
            })

            claim_number = row.get("claim_number") or f"CSV-{row['ne_number']}-{int(datetime.utcnow().timestamp())}-{i}"

            new_claim = Claim(
                id=uuid.uuid4(),
                tenant_id=current_user.tenant_id,
                patient_id=patient.id,
                claim_number=claim_number,
                amount=montant,
                insurance_type=payer,
                service_type=row.get("service_type", "hospitalisation"),
                service_date=d_out,
                duree_sejour=duree,
                part_organisme=part_org,
                status="pending",
                forclusion_deadline=(d_out.date() + timedelta(days=60)),
                days_in_ar=(datetime.utcnow().date() - d_out.date()).days,
                risk_score=prediction.get("risk_score") if prediction else None,
                risk_level=prediction.get("risk_level") if prediction else None,
                rejection_cause_predicted=prediction.get("rejection_cause_predicted") if prediction else None,
                ml_top_factors=prediction.get("ml_top_factors") if prediction else None,
            )
            db.add(new_claim)
            created += 1
        except Exception as e:
            errors.append(f"Ligne {i}: {e}")

    db.commit()
    return {
        "created": created,
        "errors": errors,
        "estimated_count": estimated,
        "message": f"{created} dossier(s) créé(s), {len(errors)} erreur(s), "
                   f"{estimated} part(s) organisme estimée(s).",
    }

@router.post("/", response_model=ClaimResponse)
def create_claim(
    claim: ClaimCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a claim, resolving (or creating) the patient by NE, and score it.

    Args:
        claim: Claim payload.
        current_user: Injected authenticated user.
        db: Database session.

    Returns:
        Claim: The stored claim, serialised as ``ClaimResponse``.

    Raises:
        HTTPException: 400 if no NE / patient can be resolved.
    """
    service_date = claim.service_date.date() if hasattr(claim.service_date, 'date') else claim.service_date

    # Résoudre le patient par NE (crée à la volée si absent — cohérent avec l'import CSV
    # et la vision "intégration SIH" : le NE suffit, aucune donnée d'identité requise).
    patient = None
    if getattr(claim, "ne_number", None):
        patient = db.query(Patient).filter(
            Patient.ne_number == claim.ne_number,
            Patient.tenant_id == current_user.tenant_id,
        ).first()
        if not patient:
            patient = Patient(
                id=uuid.uuid4(),
                tenant_id=current_user.tenant_id,
                ne_number=claim.ne_number,
                payer_type=claim.insurance_type,
                is_active=True,
            )
            db.add(patient)
            db.flush()
    elif getattr(claim, "patient_id", None):
        # Compatibilité : si un patient_id est fourni, on l'utilise
        patient = db.query(Patient).filter(
            Patient.id == claim.patient_id,
            Patient.tenant_id == current_user.tenant_id,
        ).first()

    if not patient:
        raise HTTPException(status_code=400, detail="Numéro d'Entrée (NE) requis.")

    prediction = run_prediction({
        "organisme":      claim.insurance_type,
        "duree_sejour":   claim.duree_sejour,
        "part_organisme": claim.part_organisme,
        "montant_total":  claim.amount,
        "mois":           service_date.month,
    })

    new_claim = Claim(
        id=uuid.uuid4(),
        tenant_id=current_user.tenant_id,
        patient_id=patient.id,
        claim_number=claim.claim_number,
        amount=claim.amount,
        insurance_type=claim.insurance_type,
        service_type=claim.service_type,
        service_date=claim.service_date,
        duree_sejour=claim.duree_sejour,
        part_organisme=claim.part_organisme,
        status="pending",
        forclusion_deadline=service_date + timedelta(days=60),
        days_in_ar=(date.today() - service_date).days,
        risk_score=prediction.get("risk_score"),
        risk_level=prediction.get("risk_level"),
        ml_top_factors=prediction.get("ml_top_factors"),
        rejection_cause_predicted=prediction.get("rejection_cause_predicted"),
    )
    db.add(new_claim)
    db.commit()
    db.refresh(new_claim)
    return new_claim

@router.get("/stats/summary")
def get_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return claim counts by status, total amount and rejection rate for the tenant.

    Returns:
        dict: total_claims, pending, approved, rejected, total_amount_mad, rejection_rate (%).
    """
    tenant_id = current_user.tenant_id
    total = db.query(func.count(Claim.id)).filter(Claim.tenant_id == tenant_id).scalar()
    pending = db.query(func.count(Claim.id)).filter(Claim.tenant_id == tenant_id, Claim.status == "pending").scalar()
    approved = db.query(func.count(Claim.id)).filter(Claim.tenant_id == tenant_id, Claim.status == "approved").scalar()
    rejected = db.query(func.count(Claim.id)).filter(Claim.tenant_id == tenant_id, Claim.status == "rejected").scalar()
    total_amount = db.query(func.sum(Claim.amount)).filter(Claim.tenant_id == tenant_id).scalar() or 0.0
    rejection_rate = round((rejected / total * 100), 1) if total > 0 else 0.0

    return {
        "total_claims": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "total_amount_mad": total_amount,
        "rejection_rate": rejection_rate
    }


@router.get("/with-patients")
def get_claims_with_patients(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List the tenant's claims with the patient NE, flattened for dashboards.

    Returns:
        list[dict]: One entry per claim (amount, payer, status, risk fields, forclusion deadline...).
    """
    results = (
        db.query(Claim, Patient.ne_number)
        .join(Patient, Claim.patient_id == Patient.id)
        .filter(Claim.tenant_id == current_user.tenant_id)
        .all()
    )
    claims_with_names = []
    for claim, ne_number in results:
        claims_with_names.append({
            "id": str(claim.id),
            "claim_number": claim.claim_number,
            "patient_ne": ne_number,
            "amount": claim.amount,
            "insurance_type": claim.insurance_type,
            "service_type": claim.service_type,
            "service_date": claim.service_date.isoformat(),
            "status": claim.status,
            "rejection_reason": claim.rejection_reason,
            "risk_score": claim.risk_score,
            "risk_level": claim.risk_level,
            "rejection_cause_predicted": claim.rejection_cause_predicted,
            "forclusion_deadline": claim.forclusion_deadline.isoformat() if claim.forclusion_deadline else None,
            "created_at": claim.created_at.isoformat(),
        })
    return claims_with_names


@router.get("/", response_model=List[ClaimResponse])
def get_claims(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all claims of the tenant.

    Returns:
        list[Claim]: Serialised as ``ClaimResponse``.
    """
    return db.query(Claim).filter(Claim.tenant_id == current_user.tenant_id).all()


@router.get("/{claim_id}", response_model=ClaimResponse)
def get_claim(claim_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return one claim of the tenant.

    Raises:
        HTTPException: 404 if the claim does not exist in the tenant.
    """
    claim = db.query(Claim).filter(
        Claim.id == claim_id,
        Claim.tenant_id == current_user.tenant_id,
    ).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim


@router.patch("/{claim_id}/status")
def update_claim_status(
    claim_id: UUID,
    update: StatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record the payer outcome of a claim.

    Sets the status (approved, rejected, contested, settled, closed, abandoned),
    inserts a labelled row into ``training_feedback`` (actual_outcome = 1 if
    rejected) and writes an audit log entry.

    Args:
        claim_id: Claim to update.
        update: New status and optional rejection / contestation reasons.
        current_user: Injected authenticated user.
        db: Database session.

    Returns:
        dict: Message, claim id, new status, resolved_at, training_feedback_saved.

    Raises:
        HTTPException: 404 if not found, 400 for an invalid status.
    """
    claim = db.query(Claim).filter(
        Claim.id == claim_id,
        Claim.tenant_id == current_user.tenant_id,
    ).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Dossier introuvable")

    VALID_STATUSES = ("approved", "rejected", "contested", "settled", "closed", "abandoned")
    if update.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Statut invalide. Valeurs acceptées : {', '.join(VALID_STATUSES)}")

    # Update claim
    claim.status = update.status
    claim.resolved_at = datetime.utcnow()
    if update.rejection_reason:
        claim.rejection_reason = update.rejection_reason

    # Days to resolution
    days_to_resolution = None
    if claim.created_at:
        days_to_resolution = (datetime.utcnow() - claim.created_at).days

    # Write labeled outcome to training_feedback
    actual_outcome = 1 if update.status == "rejected" else 0
    service_date = claim.service_date.date() if hasattr(claim.service_date, "date") else claim.service_date
    days_since_service = (date.today() - service_date).days if service_date else None

    mois_val = service_date.month if service_date else None

    db.execute(text("""
        INSERT INTO training_feedback (
            id, tenant_id, claim_id,
            payer, service_type,
            days_since_service,
            duree_sejour, part_organisme, montant_total, mois,
            risk_score_predicted,
            actual_outcome, rejection_reason,
            days_to_resolution, resolved_at,
            label_source, rule_version
        ) VALUES (
            gen_random_uuid(), :tenant_id, :claim_id,
            :payer, :service_type,
            :days_since_service,
            :duree_sejour, :part_organisme, :montant_total, :mois,
            :risk_score_predicted,
            :actual_outcome, :rejection_reason,
            :days_to_resolution, now(),
            :label_source, :rule_version
        )
    """), {
        "tenant_id": str(claim.tenant_id),
        "claim_id": str(claim.id),
        "payer": claim.insurance_type,
        "service_type": claim.service_type,
        "days_since_service": days_since_service,
        "duree_sejour": claim.duree_sejour,
        "part_organisme": claim.part_organisme,
        "montant_total": claim.amount,
        "mois": mois_val,
        "risk_score_predicted": claim.risk_score,
        "actual_outcome": actual_outcome,
        "rejection_reason": update.rejection_reason,
        "days_to_resolution": days_to_resolution,
        "label_source": "BAF_INTERNAL",
        "rule_version": "2026-01",
    })
    ACTION_MAP = {
        "approved":  "DOSSIER_APPROUVÉ",
        "rejected":  "DOSSIER_REJETÉ",
        "contested": "DOSSIER_CONTESTÉ",
        "settled":   "DOSSIER_RÉGLÉ",
        "closed":    "DOSSIER_SOLDÉ",
        "abandoned": "DOSSIER_ABANDONNÉ",
    }
    action = ACTION_MAP.get(update.status, "STATUT_MODIFIÉ")
    details = f"Statut mis à jour → {update.status}"
    if update.rejection_reason:
        details += f" | Motif rejet: {update.rejection_reason}"
    if update.contestation_reason:
        details += f" | Motif contestation: {update.contestation_reason}"
    write_audit_log(
        db,
        tenant_id=str(claim.tenant_id),
        user_email=current_user.email,
        action=action,
        resource_type="claim",
        resource_id=claim.claim_number,
        details=details,
    )
    db.commit()
    db.refresh(claim)

    return {
        "message": f"Dossier {claim.claim_number} mis à jour — {update.status}",
        "claim_id": str(claim.id),
        "status": claim.status,
        "resolved_at": claim.resolved_at.isoformat(),
        "training_feedback_saved": True
    }
class DeleteClaimRequest(BaseModel):
    """Payload of ``DELETE /claims/{claim_id}``: mandatory reason."""
    reason: str

@router.post("/scan")
async def scan_fse(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """OCR a scanned hospitalisation document and pre-fill the 5 model fields.

    The upload is written to a temp file and deleted right after OCR. The claim is
    not created here: the agent reviews the fields and saves through ``POST /claims/``.
    A prediction is returned only when all 5 fields were found.

    Args:
        file: PDF / JPG / PNG / TIFF upload.
        current_user: Injected authenticated user.
        db: Database session.

    Returns:
        dict: extracted fields, optional prediction, missing fields, needs_review, message.

    Raises:
        HTTPException: 400 for unsupported formats, 422 if the document cannot be read.
    """
    allowed_extensions = (".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".tif")
    if not file.filename.lower().endswith(allowed_extensions):
        raise HTTPException(status_code=400, detail="Format non supporté (PDF, JPG, PNG, TIFF).")

    original_ext = Path(file.filename.lower()).suffix
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=original_ext, prefix="sihaiq_fse_") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        from app.services.fse_parser import parse_fse
        result = parse_fse(tmp_path)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Erreur lecture document : {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    ex = result["extracted"]

    # Prédiction seulement si les 5 features sont présentes ; sinon on renvoie
    # les champs détectés et l'agent complète (pas de prédiction sur du vide).
    prediction = None
    if not result["needs_review"]:
        prediction = run_prediction({
            "organisme": ex["organisme"],
            "duree_sejour": ex["duree_sejour"],
            "part_organisme": ex["part_organisme"],
            "montant_total": ex["montant_total"],
            "mois": ex["mois"],
        })

    return {
        "extracted": ex,
        "prediction": {
            "risk_score": prediction.get("risk_score") if prediction else None,
            "risk_level": prediction.get("risk_level") if prediction else None,
            "rejection_cause_predicted": prediction.get("rejection_cause_predicted") if prediction else None,
        } if prediction else None,
        "missing": result["missing"],
        "needs_review": result["needs_review"],
        "message": (
            "Document lu — vérifiez les champs avant confirmation."
            if not result["needs_review"] else
            f"Champs à compléter : {', '.join(result['missing'])}."
        ),
    }

@router.delete("/{claim_id}")
def delete_claim(
    claim_id: UUID,
    request: DeleteClaimRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a claim and its training_feedback rows, and log the deletion.

    Args:
        claim_id: Claim to delete.
        request: Mandatory reason.
        current_user: Injected authenticated user.
        db: Database session.

    Returns:
        dict: Confirmation message.

    Raises:
        HTTPException: 404 if the claim does not exist in the tenant.
    """
    claim = db.query(Claim).filter(
        Claim.id == claim_id,
        Claim.tenant_id == current_user.tenant_id,
    ).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Dossier introuvable")
    claim_number = claim.claim_number
    tenant_id    = str(claim.tenant_id)
    # Delete training feedback rows first
    db.execute(text("DELETE FROM training_feedback WHERE claim_id = :cid"), {"cid": str(claim_id)})
    db.delete(claim)
    # Write audit log before commit
    write_audit_log(
        db,
        tenant_id=tenant_id,
        user_email=current_user.email,
        action="DOSSIER_SUPPRIMÉ",
        resource_type="claim",
        resource_id=claim_number,
        details=f"Raison: {request.reason}",
    )
    db.commit()
    return { "message": f"Dossier {claim_number} supprimé." }