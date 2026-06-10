import joblib
import shap
import numpy as np
from pathlib import Path
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.ml.features import encode_features, FEATURE_NAMES
from app.api.auth import get_current_user

router = APIRouter(prefix="/predict", tags=["Prediction"], dependencies=[Depends(get_current_user)])

# Load model once at startup — not on every request
MODEL_PATH = Path(__file__).parent / "models" / "sihaiq_xgboost_model.pkl"
model = joblib.load(MODEL_PATH)
explainer = shap.TreeExplainer(
    model,
    feature_perturbation="tree_path_dependent"
)

# French messages for each feature
SHAP_MESSAGES = {
    "ngap_code": "Code NGAP Invalide : Vérifiez le référentiel des actes CNSS/CNOPS avant soumission.",
    "immatriculation_valid": "Erreur d'Immatriculation : Clé de contrôle invalide. Le dossier sera systématiquement rejeté.",
    "forclusion_risk": "Risque de Forclusion : Soumettez ce bordereau en priorité absolue.",
    "inpe_present": "INPE Manquant : L'Identifiant National du Praticien est obligatoire sur le bordereau.",
    "docs_completeness_ratio": "Dossier Incomplet : Des pièces justificatives manquent (ordonnance, note d'honoraires).",
    "droits_active": "Droits AMO Expirés : Vérifiez les droits ouverts du patient avant soumission.",
    "cin_valid": "CIN Invalide : Le numéro de carte d'identité nationale contient une erreur.",
    "prescription_legible": "Prescription Illisible : La prescription doit être numérisée clairement.",
    "pec_obtained": "PEC Manquante : Une prise en charge préalable est requise pour cet acte.",
    "payer": "Caisse non reconnue : Vérifiez le type d'assurance du patient.",
    "ngap_coding_valid": "Codage NGAP Invalide : Le code acte ne correspond pas à la spécialité.",
    "days_since_service": "Délai de soumission trop long : Risque de rejet pour dépassement de délai.",
    "pec_required": "PEC Requise non obtenue : Cet acte nécessite une autorisation préalable.",
}

class ClaimInput(BaseModel):
    payer: str = "CNOPS"
    service_type: str = "consultation"
    ngap_code: str = "C"
    num_acts: int = 1
    patient_age: int = 35
    is_ald: int = 0
    is_ayant_droit: int = 0
    inpe_present: int = 1
    immatriculation_valid: int = 1
    cin_valid: int = 1
    ngap_coding_valid: int = 1
    prescription_legible: int = 1
    droits_active: int = 1
    docs_completeness_ratio: float = 1.0
    days_since_service: int = 0
    pec_required: int = 0
    pec_obtained: int = 0

class PredictionResponse(BaseModel):
    risk_score: float
    risk_label: str
    risk_percentage: str
    top_factors: list
    recommended_actions: list
    model_used: str

@router.post("/", response_model=PredictionResponse)
def predict_claim(claim: ClaimInput):
    # Encode features
    X = encode_features(claim.dict())

    # Get risk score
    risk_score = float(model.predict_proba(X)[0][1])

    # Risk label
    if risk_score >= 0.70:
        risk_label = "ÉLEVÉ"
    elif risk_score >= 0.40:
        risk_label = "MODÉRÉ"
    else:
        risk_label = "FAIBLE"

    # SHAP explanation
    shap_values = explainer.shap_values(X, approximate=True)
    if isinstance(shap_values, list):
        shap_vals = shap_values[1][0]
    else:
        shap_vals = shap_values[0]

    # Get top 3 features driving rejection
    feature_impacts = list(zip(FEATURE_NAMES, shap_vals))
    top_3 = sorted(feature_impacts, key=lambda x: abs(x[1]), reverse=True)[:3]

    top_factors = []
    recommended_actions = []
    for feature, impact in top_3:
        direction = "↑ Augmente le risque" if impact > 0 else "↓ Réduit le risque"
        top_factors.append({
            "feature": feature,
            "impact": round(float(impact), 4),
            "direction": direction
        })
        if impact > 0 and feature in SHAP_MESSAGES:
            recommended_actions.append(SHAP_MESSAGES[feature])

    return PredictionResponse(
        risk_score=round(risk_score, 4),
        risk_label=risk_label,
        risk_percentage=f"{round(risk_score * 100, 1)}%",
        top_factors=top_factors,
        recommended_actions=recommended_actions,
        model_used="sihaiq_xgboost_v1"
    )