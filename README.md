# SihaIQ RCM Platform

AI-powered Revenue Cycle Management for Moroccan private hospitals.
Predicts CNOPS/CNSS/AMO claim rejections before submission using XGBoost + SHAP.

## Stack

- **Backend:** Python 3.11 + FastAPI + SQLAlchemy + Supabase (PostgreSQL)
- **Frontend:** Next.js 16 + TypeScript + Tailwind CSS
- **ML:** XGBoost + SHAP explainability
- **Auth:** JWT + bcrypt

## Quick Start

### Backend
```bash
cd backend
conda activate rcm-saas
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your values.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Create hospital account |
| POST | /auth/login | Login + get JWT token |
| GET | /auth/me | Current user info |
| POST | /predict/ | XGBoost rejection prediction + SHAP |
| GET | /claims/ | List claims by tenant |
| POST | /claims/ | Submit new claim |
| GET | /claims/stats/summary | KPI dashboard stats |
| GET | /claims/with-patients | Claims enriched with patient names |

## ML Engine

- Model: XGBoost binary classifier (AUC ≥ 0.87)
- Features: 17 claim features (payer, ngap_code, docs_completeness_ratio, etc.)
- Explainability: SHAP TreeExplainer with French actionable recommendations
- CNDP compliant: trained on synthetic data only

## Rejection Causes (Pareto)

| Cause | Frequency |
|-------|-----------|
| Identitovigilance errors | 35% |
| NGAP coding errors | 25% |
| Missing documents | 15% |
| Illegible prescriptions | 10% |
| Unverified AMO rights | 8% |

## License

Private — SihaIQ © 2026