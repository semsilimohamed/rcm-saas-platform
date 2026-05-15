import pandas as pd
from typing import Dict, Any

FEATURE_NAMES = [
    'payer', 'service_type', 'ngap_code', 'num_acts', 'patient_age',
    'is_ald', 'is_ayant_droit', 'inpe_present', 'immatriculation_valid',
    'cin_valid', 'ngap_coding_valid', 'prescription_legible', 'droits_active',
    'docs_completeness_ratio', 'days_since_service', 'pec_required', 'pec_obtained'
]

PAYER_MAP = {"CNOPS": 0, "CNSS": 1, "AMO": 2, "RAMED": 3}
SERVICE_MAP = {
    "consultation": 0, "hospitalisation": 1, "chirurgie": 2,
    "radiologie": 3, "laboratoire": 4, "kinesitherapie": 5
}
NGAP_MAP = {
    "C": 0, "K": 1, "Z": 2, "B": 3, "AMI": 4,
    "AIS": 5, "SPE": 6, "OTHER": 7
}

def encode_features(data: Dict[str, Any]) -> pd.DataFrame:
    row = {
        "payer": PAYER_MAP.get(str(data.get("payer", "CNOPS")).upper(), 0),
        "service_type": SERVICE_MAP.get(str(data.get("service_type", "consultation")).lower(), 0),
        "ngap_code": NGAP_MAP.get(str(data.get("ngap_code", "C")).upper(), 7),
        "num_acts": int(data.get("num_acts", 1)),
        "patient_age": int(data.get("patient_age", 35)),
        "is_ald": int(data.get("is_ald", 0)),
        "is_ayant_droit": int(data.get("is_ayant_droit", 0)),
        "inpe_present": int(data.get("inpe_present", 1)),
        "immatriculation_valid": int(data.get("immatriculation_valid", 1)),
        "cin_valid": int(data.get("cin_valid", 1)),
        "ngap_coding_valid": int(data.get("ngap_coding_valid", 1)),
        "prescription_legible": int(data.get("prescription_legible", 1)),
        "droits_active": int(data.get("droits_active", 1)),
        "docs_completeness_ratio": float(data.get("docs_completeness_ratio", 1.0)),
        "days_since_service": int(data.get("days_since_service", 0)),
        "pec_required": int(data.get("pec_required", 0)),
        "pec_obtained": int(data.get("pec_obtained", 0)),
    }
    return pd.DataFrame([row], columns=FEATURE_NAMES)