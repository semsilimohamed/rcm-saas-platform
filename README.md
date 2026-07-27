# SihaIQ — Sovereign AI Revenue Cycle Management for Moroccan Hospitals

**SihaIQ predicts insurance claim rejection risk — by CNOPS, CNSS, AMO, FAR, and AMO-Tadamon — before submission**, using an XGBoost classifier trained on a proprietary, continuously growing dataset of Moroccan-specific rejection patterns, with SHAP explainability delivered in French to billing agents (agents BAF) at the point of data entry.

Built for Moroccan private clinics and hospital groups (~400 target facilities, cabinet médical → CHU), SihaIQ sits as an integration layer on top of existing hospital SIH systems. It never stores patient identity — only a hospital-issued **Numéro d'Entrée (NE)** — making it CNDP / Loi 09-08 compliant by design.

---

## Why this exists

Moroccan private hospitals lose significant recoverable revenue every year to preventable claim rejections — bad NGAP coding, expired AMO rights, missing documents, forclusion (60-day deadline misses). Most of this is caught only after rejection, when it's too late to fix. SihaIQ catches it before submission.

## The moat: data, not algorithm

XGBoost is a commodity. What isn't is the **`training_feedback` dataset** — a continuously growing, labeled record of real Moroccan CNOPS/CNSS/AMO rejection outcomes, fed back into the model every time a BAF agent confirms a claim as approved or rejected (`PATCH /claims/{id}/status`). Every tenant using SihaIQ deepens this dataset. A competitor can copy the code in a weekend; they cannot copy 18–24 months of accumulated, tenant-validated Moroccan rejection patterns. This data network effect is the platform's actual defensibility.

---

## Architecture

Two modules, one platform:

| Module | Color | Function |
|---|---|---|
| **BAF & RCM** | `#5B4FE8` | Claim intake (manual / CSV / OCR scan), rejection prediction, training feedback loop |
| **Comptabilité hospitalière** | `#F2711C` | DAF-level financial dashboards, revenue aging, encours A/R |

SihaIQ is a hybrid architecture by design: on-premise inference at each hospital, with an anonymized central `training_feedback` store — data sovereignty and shared learning at the same time.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.11) |
| Frontend | Next.js 14 + TypeScript |
| Database | Supabase (PostgreSQL, EU West / Ireland) |
| ML | XGBoost + SHAP (TreeExplainer) + K-Means |
| OCR | Tesseract (French language pack) |
| Auth | JWT + bcrypt, router-level enforcement, tenant_id from JWT only |

---

## Claim intake — three unified paths

All three entry modes resolve to the same schema, keyed on `ne_number`, auto-creating a patient record if one doesn't exist yet:

- **Manual entry** — BAF agent form
- **CSV batch upload** — bulk claim import
- **OCR scan** — Tesseract extracts structured data from scanned FSE / bordereau documents (large PDFs are converted to JPG first; poppler dependency otherwise)

## ML engine

- **Model:** XGBoost binary classifier, SHAP TreeExplainer for feature attribution
- **FSE feature set:** `organisme`, `duree_sejour`, `part_organisme`, `montant_total`, `mois`
- **Training data:** synthetic + real bordereau-derived outcomes via the `training_feedback` loop — CNDP compliant, no real patient identity ever stored
- **Explainability:** SHAP output translated into actionable French recommendations for BAF agents, ranked by the platform's rejection-cause Pareto:

| Rejection cause | Share |
|---|---|
| Identitovigilance errors | 35% |
| NGAP coding errors | 25% |
| Missing documents | 15% |

## Data protection by design

- No patient name or CIN ever stored — patients are identified solely by **Numéro d'Entrée (NE)**, unique per tenant (`UNIQUE(tenant_id, ne_number)`)
- CIN / immatriculation, where captured upstream, are hashed with per-tenant salts (pgcrypto)
- `patient_age` stored as bucketed categorical range, never raw date of birth
- Compliant with **Loi 09-08** (CNDP) and consistent with **Loi 54-23** (AMO-Tadamon) and **Loi 65-00** (insurance framework)

---

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create hospital tenant account |
| `POST` | `/auth/login` | Authenticate, issue JWT |
| `GET` | `/auth/me` | Current user info |
| `POST` | `/predict/` | XGBoost rejection prediction + SHAP explanation |
| `GET` | `/claims/` | List claims for tenant |
| `POST` | `/claims/` | Submit new claim (manual / CSV / scan) |
| `PATCH` | `/claims/{id}/status` | Confirm outcome → writes to `training_feedback` |
| `GET` | `/claims/stats/summary` | KPI dashboard summary |
| `GET` | `/claims/with-patients` | Claims enriched with patient NE |

---

## Quick start

**Backend**
```bash
cd backend
conda activate rcm-saas
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

**Environment variables** — copy `backend/.env.example` to `backend/.env` and fill in your Supabase credentials. Never commit `.env`.

---

## Status

Feature-complete MVP: unified claim intake, end-to-end OCR pipeline, complete training feedback loop, full dashboard suite (dossiers, forclusion, encours A/R, financier, comptabilité, prediction), security-hardened (router-level auth, tenant-scoped JWT, no plaintext credentials, CORS locked down).

**In progress:** production deployment (backend → Render, frontend → Vercel), pilot hospital onboarding, formal advisor recruitment.

---

## License

Private — SihaIQ © 2026. All rights reserved.