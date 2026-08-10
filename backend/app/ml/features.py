"""
app/ml/features.py — encodage des features pour le modèle SihaIQ v3 (Random Forest, 5 features réelles).
Aligné sur l'entraînement : get_dummies(organisme) sur 3 organismes réels
(CNOPS, CNSS, FAR) + duree_sejour, part_organisme, montant_total, mois.

L'ordre des colonnes n'est PAS codé en dur ici : il est lu depuis
models/sihaiq_feature_order_v3.json, qui fait foi. Une colonne manquante ou mal
ordonnée fausserait la prédiction, d'où le chargement depuis la source unique.
"""
import json
from pathlib import Path

import pandas as pd

# Ordre EXACT des colonnes attendu par le modèle, lu depuis le fichier de l'entraînement.
# Volontairement sans try/except : si le fichier manque, on veut un échec bruyant
# au démarrage plutôt que des prédictions silencieusement fausses.
FEATURE_ORDER_PATH = Path(__file__).parent / "models" / "sihaiq_feature_order_v3.json"
FEATURE_ORDER = json.loads(FEATURE_ORDER_PATH.read_text(encoding="utf-8"))

# Nom lisible de chaque feature (pour l'explication SHAP côté agent).
FEATURE_NAMES = FEATURE_ORDER

# Payeurs réellement modélisés (v3). Déduits de FEATURE_ORDER pour rester alignés.
_KNOWN_PAYERS = [c[len("org_"):] for c in FEATURE_ORDER if c.startswith("org_")]

# Payeur par défaut : la CNSS gère l'AMO (et l'AMO-Tadamon depuis l'abolition du
# RAMED, Loi 54-23). Tout organisme non modélisé y est donc rattaché plutôt que
# de faire planter la prédiction.
_DEFAULT_PAYER = "CNSS"

_PAYER_ALIASES = {
    "CNOPS": "CNOPS",
    "CNSS": "CNSS",
    "FAR": "FAR",
    # Rattachés à la CNSS (non modélisés séparément en v3)
    "AMO": "CNSS",
    "AMO-TADAMON": "CNSS",
    "AMO TADAMON": "CNSS",
    "TADAMON": "CNSS",
    "RAMED": "CNSS",
}


def _normalize_payer(value) -> str:
    """Ramène un organisme quelconque à l'un des 3 payeurs modélisés. Jamais d'erreur."""
    if value is None:
        return _DEFAULT_PAYER
    key = str(value).strip().upper()
    return _PAYER_ALIASES.get(key, _DEFAULT_PAYER)


def encode_features(claim_data: dict) -> pd.DataFrame:
    """
    Transforme un dossier en une ligne de features prête pour le modèle.

    Attend dans claim_data :
      - organisme      (ou 'payer') : CNOPS / CNSS / FAR (tout autre valeur -> CNSS)
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
