# Archive ML — SihaIQ

Fichiers **retirés du code actif** lors de la migration vers SihaIQ v3
(Random Forest, 3 organismes) le 10/08/2026. Rien ici n'est chargé ni importé
par l'application : conservés pour traçabilité (mémoire, reproductibilité,
comparaison de modèles), pas pour être réutilisés en l'état.

Aucun de ces fichiers n'a été supprimé — déplacement uniquement.

## Contenu

| Fichier | Origine | Pourquoi archivé |
|---|---|---|
| `models/sihaiq_xgb_v2.json` | XGBoost v2, 5 organismes, 9 features | Remplacé par `sihaiq_rf_v3.joblib` (3 organismes réels, seuil 0.40) |
| `models/sihaiq_xgboost_model.pkl` | XGBoost v1, 17 features | Chargé uniquement par `predict.py`, lui-même jamais monté |
| `models/sihaiq_kmeans_model.pkl` | K-Means (segmentation) | Jamais référencé dans le code |
| `models/sihaiq_best_k.pkl` | K optimal du K-Means | Jamais référencé dans le code |
| `models/sihaiq_scaler.pkl` | StandardScaler v1 | Jamais référencé dans le code |
| `models/sihaiq_priority_map.pkl` | Mapping de priorité v1 | Jamais référencé dans le code |
| `models/sihaiq_feature_names.pkl` | Noms des 17 features v1 | Jamais référencé dans le code |
| `predict.py` | Router FastAPI `/predict` (17 features) | Jamais inclus dans `app/main.py`, jamais importé. Son `ClaimInput` (ngap_code, inpe_present, pec_obtained…) correspond au modèle v1, incompatible avec `features.py` actuel |

## Attention : les `.pkl` ne sont pas suivis par git

Le `.gitignore` racine contient `*.pkl`. Les six `.pkl` ci-dessus **n'existent que
sur cette machine** — les déplacer ici ne les met pas à l'abri d'une perte disque.
Si leur conservation compte (reproductibilité du mémoire), il faut soit les
sauvegarder hors dépôt, soit ajouter une exception dans `.gitignore` :

```gitignore
!backend/app/ml/_archive/models/*.pkl
```

`sihaiq_xgb_v2.json` et `predict.py`, eux, sont suivis par git : leur historique
est intact, le déplacement a été fait avec `git mv`.

## Modèle actif

`app/ml/models/sihaiq_rf_v3.joblib` + `sihaiq_feature_order_v3.json`,
chargés dans `app/api/claims.py`. scikit-learn 1.6.1.
