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
from pathlib import Path
from app.models.claim_act import ClaimAct

router = APIRouter(prefix="/claims", tags=["Claims"], dependencies=[Depends(get_current_user)])

# ── Load model once at startup ─────────────────────────────────────────────
MODEL_PATH = Path(__file__).parent.parent / "ml" / "models" / "sihaiq_xgboost_model.pkl"
model = joblib.load(MODEL_PATH)
explainer = shap.TreeExplainer(model, feature_perturbation="tree_path_dependent")

SHAP_MESSAGES = {
    "ngap_code": "Code NGAP Invalide : Vérifiez le référentiel des actes CNSS/CNOPS.",
    "immatriculation_valid": "Erreur d'Immatriculation : Clé de contrôle invalide.",
    "inpe_present": "INPE Manquant : L'Identifiant National du Praticien est obligatoire.",
    "docs_completeness_ratio": "Dossier Incomplet : Des pièces justificatives manquent.",
    "droits_active": "Droits AMO Expirés : Vérifiez les droits ouverts du patient.",
    "cin_valid": "CIN Invalide : Le numéro de carte d'identité nationale contient une erreur.",
    "prescription_legible": "Prescription Illisible : La prescription doit être numérisée clairement.",
    "pec_obtained": "PEC Manquante : Une prise en charge préalable est requise.",
    "payer": "Caisse non reconnue : Vérifiez le type d'assurance du patient.",
    "ngap_coding_valid": "Codage NGAP Invalide : Le code acte ne correspond pas à la spécialité.",
    "days_since_service": "Délai trop long : Risque de rejet pour dépassement de délai.",
    "pec_required": "PEC Requise non obtenue : Cet acte nécessite une autorisation préalable.",
}
def write_audit_log(db: Session, tenant_id: str, user_email: str, action: str, resource_type: str, resource_id: str, details: str):
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
    status: str
    rejection_reason: Optional[str] = None
    contestation_reason: Optional[str] = None

# ── ML helper ─────────────────────────────────────────────────────────────
def run_prediction(claim_data: dict) -> dict:
    try:
        X = encode_features(claim_data)
        risk_score = float(model.predict_proba(X)[0][1])

        if risk_score >= 0.70:
            risk_label = "ÉLEVÉ"
        elif risk_score >= 0.40:
            risk_label = "MODÉRÉ"
        else:
            risk_label = "FAIBLE"

        shap_values = explainer.shap_values(X, approximate=True)
        if isinstance(shap_values, list):
            shap_vals = shap_values[1][0]
        else:
            shap_vals = shap_values[0]

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
    except Exception:
        return {}

# ── Routes ─────────────────────────────────────────────────────────────────

@router.post("/", response_model=ClaimResponse)
def create_claim(
    claim: ClaimCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service_date = claim.service_date.date() if hasattr(claim.service_date, 'date') else claim.service_date

    # Ensure the patient belongs to the caller's tenant before creating a claim.
    patient = db.query(Patient).filter(
        Patient.id == claim.patient_id,
        Patient.tenant_id == current_user.tenant_id,
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient introuvable")

    # If acts are provided, the entered total amount must match their sum.
    # The platform never calculates this for the agent — it only flags disagreement.
    if claim.acts:
        acts_sum = round(sum(act.amount for act in claim.acts), 2)
        entered_amount = round(claim.amount, 2)
        if acts_sum != entered_amount:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Discordance détectée : le montant total saisi ({entered_amount} MAD) "
                    f"ne correspond pas à la somme des actes ({acts_sum} MAD). "
                    f"Veuillez vérifier et recalculer."
                ),
            )

    prediction = run_prediction({
        "payer": claim.insurance_type,
        "service_type": claim.service_type,
        "days_since_service": (date.today() - service_date).days,
    })

    new_claim = Claim(
        id=uuid.uuid4(),
        tenant_id=current_user.tenant_id,
        patient_id=claim.patient_id,
        claim_number=claim.claim_number,
        amount=claim.amount,
        insurance_type=claim.insurance_type,
        service_type=claim.service_type,
        service_date=claim.service_date,
        status="pending",
        forclusion_deadline=service_date + timedelta(days=60),
        days_in_ar=(date.today() - service_date).days,
        risk_score=prediction.get("risk_score"),
        risk_level=prediction.get("risk_level"),
        ml_top_factors=prediction.get("ml_top_factors"),
        rejection_cause_predicted=prediction.get("rejection_cause_predicted"),
    )
    db.add(new_claim)
    db.flush()  # assigns new_claim.id without committing yet

    # If acts were provided, create one ClaimAct row per act.
    if claim.acts:
        for act in claim.acts:
            new_act = ClaimAct(
                id=uuid.uuid4(),
                tenant_id=current_user.tenant_id,
                claim_id=new_claim.id,
                ngap_code=act.ngap_code,
                service_type=act.service_type,
                quantity=act.quantity,
                amount=act.amount,
                ngap_coding_valid=act.ngap_coding_valid,
                prescription_legible=act.prescription_legible,
                pec_required=act.pec_required,
                pec_obtained=act.pec_obtained,
                status="pending",
            )
            db.add(new_act)

    db.commit()
    db.refresh(new_claim)
    return new_claim

@router.get("/stats/summary")
def get_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
    results = (
        db.query(Claim, Patient.full_name)
        .join(Patient, Claim.patient_id == Patient.id)
        .filter(Claim.tenant_id == current_user.tenant_id)
        .all()
    )
    claims_with_names = []
    for claim, full_name in results:
        claims_with_names.append({
            "id": str(claim.id),
            "claim_number": claim.claim_number,
            "patient_name": full_name,
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
    return db.query(Claim).filter(Claim.tenant_id == current_user.tenant_id).all()


@router.get("/{claim_id}", response_model=ClaimResponse)
def get_claim(claim_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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

    db.execute(text("""
        INSERT INTO training_feedback (
            id, tenant_id, claim_id,
            payer, service_type,
            days_since_service,
            actual_outcome, rejection_reason,
            days_to_resolution, resolved_at,
            label_source, rule_version
        ) VALUES (
            gen_random_uuid(), :tenant_id, :claim_id,
            :payer, :service_type,
            :days_since_service,
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
    reason: str

@router.post("/scan")
async def scan_fse(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload a CNSS FSE PDF scan.
    Runs OCR + extraction + prediction.
    Returns extracted fields for agent review — nothing is saved yet.
    Agent confirms via POST /claims/ with the returned data.
    """
    # Validate file type
    # Validate file type — accept PDF and common image formats
    allowed_extensions = (".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".tif")
    filename_lower = file.filename.lower()
    if not filename_lower.endswith(allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail="Format non supporté. Formats acceptés : PDF, JPG, PNG, TIFF."
        )

    # Preserve original extension so fse_parser knows how to read the file
    original_ext = Path(filename_lower).suffix

    # Write upload to a temp file — deleted immediately after processing
    try:
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=original_ext, prefix="sihaiq_fse_"
        ) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Run the FSE parser
        from app.services.fse_parser import parse_fse
        result = parse_fse(tmp_path)

    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Erreur lecture document : {str(e)}"
        )
    finally:
        # Always delete the temp file — scanned document never stays on disk
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    # Run prediction on extracted fields
    prediction = run_prediction(result["prediction_input"])

    # Return extracted fields + prediction for agent review
    # Nothing written to DB yet — agent must confirm first
    return {
        "extracted": {
            "claim_number":   result["claim"]["claim_number"],
            "amount":         result["claim"]["amount"],
            "service_date":   result["claim"]["service_date"],
            "insurance_type": result["claim"]["insurance_type"],
            "service_type":   result["claim"]["service_type"],
            "acts":           result["acts"],
        },
        "prediction": {
            "risk_score":                prediction.get("risk_score"),
            "risk_level":                prediction.get("risk_level"),
            "rejection_cause_predicted": prediction.get("rejection_cause_predicted"),
            "ml_top_factors":            prediction.get("ml_top_factors"),
        },
        "validation": {
            "immatriculation_valid": result["prediction_input"]["immatriculation_valid"],
            "cin_valid":             result["prediction_input"]["cin_valid"],
            "inpe_present":          result["prediction_input"]["inpe_present"],
            "pec_obtained":          result["prediction_input"]["pec_obtained"],
        },
        "confidence":       result["confidence"],
        "needs_review":     result["needs_review"],
        "critical_missing": result["critical_missing"],
        "tenant_id":        str(current_user.tenant_id),
        "message":          (
            "Document lu avec succès — vérifiez les champs extraits avant confirmation."
            if not result["needs_review"] else
            "Champs manquants détectés — veuillez compléter avant de confirmer."
        )
    }

@router.delete("/{claim_id}")
def delete_claim(
    claim_id: UUID,
    request: DeleteClaimRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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