from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.claim import Claim
from app.models.patient import Patient
from app.schemas.claim import ClaimCreate, ClaimResponse
from app.ml.features import encode_features
from typing import List
from uuid import UUID
from datetime import timedelta, date
import uuid
import joblib
import shap
import json
from pathlib import Path

router = APIRouter(prefix="/claims", tags=["Claims"])

# Load model once at startup
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

def run_prediction(claim_data: dict) -> dict:
    """Run ML prediction and return risk score + SHAP factors."""
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

@router.post("/", response_model=ClaimResponse)
def create_claim(claim: ClaimCreate, db: Session = Depends(get_db)):
    service_date = claim.service_date.date() if hasattr(claim.service_date, 'date') else claim.service_date

    # Run ML prediction automatically
    prediction = run_prediction({
        "payer": claim.insurance_type,
        "service_type": claim.service_type,
        "days_since_service": (date.today() - service_date).days,
    })

    new_claim = Claim(
        id=uuid.uuid4(),
        tenant_id=claim.tenant_id,
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
    db.commit()
    db.refresh(new_claim)
    return new_claim

@router.get("/stats/summary")
def get_stats(tenant_id: UUID, db: Session = Depends(get_db)):
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
def get_claims_with_patients(tenant_id: UUID, db: Session = Depends(get_db)):
    results = (
        db.query(Claim, Patient.full_name)
        .join(Patient, Claim.patient_id == Patient.id)
        .filter(Claim.tenant_id == tenant_id)
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
def get_claims(tenant_id: UUID, db: Session = Depends(get_db)):
    return db.query(Claim).filter(Claim.tenant_id == tenant_id).all()

@router.get("/{claim_id}", response_model=ClaimResponse)
def get_claim(claim_id: UUID, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim