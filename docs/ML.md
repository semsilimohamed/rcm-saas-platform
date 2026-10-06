# Machine learning

SihaIQ estimates, for each claim, the probability that the payer will reject it. It explains the estimate with SHAP so a billing agent can act before submission.

Everything on this page is taken from the code and the model artifact. Numbers not found there are marked `TODO: verify`.

## 1. Dataset

| Item | Status |
|---|---|
| Source | Synthetic dataset of Moroccan hospitalisation claims (no real patient data) |
| Generation script / notebook | `TODO: verify`: the Colab notebook will be added to `notebooks/` |
| Size, rejection rate, label definition | `TODO: verify` |
| Train / test split | `TODO: verify` |

Training happened outside this repository (Google Colab). Only the exported artifact is committed.

## 2. Features

The model consumes **7 columns built from 5 claim fields**. The exact column order is stored in [`backend/app/ml/models/sihaiq_feature_order_v3.json`](../backend/app/ml/models/sihaiq_feature_order_v3.json) and read at startup by [`features.py`](../backend/app/ml/features.py):

| Column | Source field | Type | Meaning |
|---|---|---|---|
| `duree_sejour` | length of stay | int (days) | Known at discharge. From CSV/OCR: `date_sortie − date_entree`, at least 1 |
| `part_organisme` | payer share | float 0–1 | Share of the bill paid by the payer. From CSV/OCR: `1 − part_patient / montant_total` |
| `montant_total` | claim amount | float (MAD) | Total billed |
| `mois` | service / discharge month | int 1–12 | Captures seasonality |
| `org_CNOPS` | payer | 0/1 | One-hot |
| `org_CNSS` | payer | 0/1 | One-hot |
| `org_FAR` | payer | 0/1 | One-hot |

Payer normalisation (`_normalize_payer`): CNOPS, CNSS and FAR map to themselves. AMO and AMO-Tadamon map to CNSS (CNSS manages them). Any unknown or missing value also maps to CNSS. Missing numeric fields are encoded as 0 (`mois` as 1).

## 3. Model

Read from `sihaiq_rf_v3.joblib`:

| Parameter | Value |
|---|---|
| Estimator | `sklearn.ensemble.RandomForestClassifier` |
| `n_estimators` | 200 |
| `max_depth` | 6 |
| `min_samples_leaf` | 1 |
| `class_weight` | `"balanced"` |
| Inputs | 7 (see above) |
| Library | scikit-learn **1.6.1**. Keep this version pinned: the pickle depends on it |

The model and the SHAP explainer are loaded once when `app/api/claims.py` is imported.

### Thresholds

Two independent sets of thresholds (`claims.py`):

| Purpose | Constant | Value | Effect |
|---|---|---|---|
| Decision / alert | `SEUIL_DECISION` | **0.40** | `zone = "danger"` if score ≥ 0.40, else `"sure"`. Chosen for recall: a false alert is cheaper than a missed rejection. |
| Display zones | `ZONE_MODERE`, `ZONE_ELEVE` | 0.40 / 0.70 | FAIBLE < 0.40 ≤ MODÉRÉ < 0.70 ≤ ÉLEVÉ |

According to the code comments, the display zones come from the p40 / p75 quantiles of RF v3 scores over a grid of realistic inputs (stay 0–14 days, amount 300–40,000 MAD, payer share 0.60–1.00), giving roughly 23% ÉLEVÉ, 35% MODÉRÉ and 42% FAIBLE. The script that produced this grid isn't in the repository (`TODO: verify`). [`calibration_percentiles.sql`](../backend/app/ml/calibration_percentiles.sql) holds the queries to recalibrate the zones on real scores once about 500 claims have been scored.

## 4. Evaluation

| Metric | Value |
|---|---|
| ROC-AUC | `TODO: verify` |
| PR-AUC | `TODO: verify` |
| Precision / recall at 0.40 | `TODO: verify` |
| Calibration | `TODO: verify` |

### Known limitation

From the code: the score isn't monotonic in `duree_sejour` beyond about 30 days (30 days → 0.76, 60 days → 0.73). The training data has too few long stays. This is accepted because real stays over 30 days are rare.

## 5. Explainability (SHAP)

- `shap.TreeExplainer(model)` computes per-feature contributions for the rejection class. `_shap_row_classe_1` handles the different output shapes returned by shap versions.
- The 3 features with the largest absolute contribution are returned as `top_factors` (`feature`, `impact`, and in `/claims/predict` a `direction`). They are stored on the claim as JSON in `ml_top_factors`.
- The first top-3 feature that *increases* risk is mapped to a French message (`SHAP_MESSAGES`), stored as `rejection_cause_predicted` and shown as the recommended action. For example, `duree_sejour` maps to "Durée de séjour élevée : facteur de risque majeur de rejet."

## 6. Where predictions are made

| Entry point | Behaviour |
|---|---|
| `POST /claims/predict` | Simulation only, nothing saved |
| `POST /claims/` | Scores and stores the result on the claim |
| `POST /claims/import-csv` | Scores each row |
| `POST /claims/scan` | Scores only if OCR found all 5 fields |

If prediction fails, `run_prediction` logs the exception and returns an empty result. The claim is still created, without a score.

## 7. Feedback loop

Each status update (`PATCH /claims/{id}/status`) inserts one row into `training_feedback`:

- **Model inputs at resolution time:** `payer`, `duree_sejour`, `part_organisme`, `montant_total`, `mois`, plus `service_type` and `days_since_service`.
- **`risk_score_predicted`:** the score the model gave.
- **`actual_outcome`:** `1` if the status is `rejected`, else `0`.
- **`rejection_reason`** and **`days_to_resolution`**.
- **Provenance:** `label_source = "BAF_INTERNAL"`, `rule_version = "2026-01"`.

This builds a labelled, versioned dataset of real outcomes per tenant. **The retraining pipeline that consumes it isn't implemented yet** (roadmap). Note that `contested` currently produces `actual_outcome = 0`, so contested claims will need re-labelling before training.

## 8. Model history

| Version | Model | Inputs | Status |
|---|---|---|---|
| v1 | XGBoost | 17 claim-quality features | Archived; never served |
| v2 | XGBoost | 9 features, 5 payers | Archived in [`backend/app/ml/_archive/`](../backend/app/ml/_archive/) |
| **v3** | **Random Forest** | **7 features, 3 payers** | **Active since 2026-08-10** |

See [`_archive/README.md`](../backend/app/ml/_archive/README.md) for details. A research note on per-tenant AutoML (not implemented) is in [research/automl-vision.md](research/automl-vision.md).
