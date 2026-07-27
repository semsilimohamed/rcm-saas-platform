"""
app/ml/features.py — encodage des features pour le modèle SihaIQ v2 (5 features réelles).
Aligné sur l'entraînement : get_dummies(organisme) + duree_sejour, part_organisme,
montant_total, mois. Ordre des colonnes FIGÉ (doit matcher feature_order.json).
"""
import pandas as pd

# Ordre EXACT des colonnes attendu par le modèle (identique à l'entraînement Colab).
FEATURE_ORDER = [
    "duree_sejour",
    "part_organisme",
    "montant_total",
    "mois",
    "org_AMO",
    "org_AMO-Tadamon",
    "org_CNOPS",
    "org_CNSS",
    "org_FAR",
]

# Nom lisible de chaque feature (pour l'explication SHAP côté agent).
FEATURE_NAMES = FEATURE_ORDER

# Payeurs reconnus. RAMED est aboli (Loi 54-23) -> mappé vers AMO-Tadamon.
_PAYER_ALIASES = {
    "RAMED": "AMO-Tadamon",
    "AMO-TADAMON": "AMO-Tadamon",
    "AMO TADAMON": "AMO-Tadamon",
    "TADAMON": "AMO-Tadamon",
    "CNOPS": "CNOPS",
    "CNSS": "CNSS",
    "FAR": "FAR",
    "AMO": "AMO",
}
_KNOWN_PAYERS = ["AMO", "AMO-Tadamon", "CNOPS", "CNSS", "FAR"]


def _normalize_payer(value) -> str:
    if value is None:
        return "AMO"
    key = str(value).strip().upper()
    return _PAYER_ALIASES.get(key, "AMO")


def encode_features(claim_data: dict) -> pd.DataFrame:
    """
    Transforme un dossier en une ligne de features prête pour le modèle.

    Attend dans claim_data :
      - organisme      (ou 'payer') : CNOPS / CNSS / FAR / AMO / AMO-Tadamon
      - duree_sejour   : int  (jours) — connu à la sortie
      - part_organisme : float (0.0 à 1.0)
      - montant_total  (ou 'amount') : float (MAD)
      - mois           : int (1 à 12)

    Retourne un DataFrame 1 ligne, colonnes dans FEATURE_ORDER exact.
    """
    organisme = _normalize_payer(claim_data.get("organisme", claim_data.get("payer")))

    row = {
        "duree_sejour":   float(claim_data.get("duree_sejour") or 0),
        "part_organisme": float(claim_data.get("part_organisme") or 0.0),
        "montant_total":  float(claim_data.get("montant_total", claim_data.get("amount")) or 0),
        "mois":           int(claim_data.get("mois") or 1),
    }
    # one-hot des payeurs (toutes à 0 sauf l'organisme du dossier)
    for p in _KNOWN_PAYERS:
        row[f"org_{p}"] = 1 if organisme == p else 0

    df = pd.DataFrame([row])
    # remet dans l'ordre EXACT + comble toute colonne absente par 0
    df = df.reindex(columns=FEATURE_ORDER, fill_value=0)
    return df