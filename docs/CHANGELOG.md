# Changelog

Reconstructed from the git history. The project has no release tags, so entries are grouped by period. Short commit hashes are given for reference.

## 2026-10 — Documentation pass (`docs/full-update`)
- Rewrote README; added `docs/` (architecture, API, ML, data model, changelog).
- Docstrings and header comments across backend and frontend.
- Repo hygiene: `.env.example` files, complete `.gitignore`, OCR/PDF dependencies added to `requirements.txt`, unused `framer-motion` removed, dead files removed.
- Marketing copy aligned with the actual model.

## 2026-08 — Random Forest v3
- **Model switched from XGBoost v2 to Random Forest v3**: 3 payers (CNOPS, CNSS, FAR), 7 inputs, decision threshold 0.40, display zones 0.40 / 0.70. Old artifacts moved to `ml/_archive/` (`84170f1`).
- Payer lists, threshold and model labels aligned in the UI (`243ed04`).
- Security: server-side role check on `/financier` and `/comptabilite`; reset token no longer logged (`3e29e1a`).

## 2026-07 — Unified claim intake
- Single NE-based claim entry across manual, CSV and scan; FSE parser rewritten around the 5 model fields; dossiers modals split into separate components; fixes to bordereau, forclusion and encours; trained model artifacts added (`eab8539`).
- README rewritten (`a15b79e`).

## 2026-06 — Modules, OCR, privacy
- Patient deletion restricted to admin / director / chef_baf, with audit log and cascade (`cdb778c`).
- OCR FSE pipeline, multi-act schema (`claim_acts`), `training_feedback` versioning (`c4366d9`).
- Onboarding page after registration (`54fa4fe`).
- Security hardening: auth on all routers, tenant isolation, secret rotation, Chart.js moved into `useEffect` (`2861c79`, `bc68816`).
- Landing page v4 with data-viz sections, RCM cycle image and legal pages: CNDP, terms, privacy, accessibility, sitemap (`80d4ec2`, `617754b`, `871eee6`).
- Comptabilité (DAF) module with data-entry modal (`77d87a2`, `001cc5e`); login redirect to the intended page (`0ff4d86`).
- Financial dashboard `/dashboard/financier`, admin/director (`4d8927c`, `9089b87`).
- Bordereau PDF generation (fpdf2) (`1c2c783`).
- Disposition workflow: contested / settled / closed / abandoned (`cd1bac8`).
- Batch CSV prediction tab (`d90a28f`), later replaced by a placeholder pending alignment with the v3 inputs.
- Settings page: hospital profile, agents, forclusion alerts, payers, password (`55f5d38`).

## 2026-05 — Core product
- Real CSV import (`132fcae`); A/R aging page `/dashboard/encours` (`fdb8587`).
- Claim deletion and patient deletion with cascade (`e9d45c7`).
- Status update endpoint + `training_feedback` table + approve/reject UI (`aabc418`).
- Performance, forclusion, prediction and patients pages (`3a0d174`, `7e7419a`, `3e66810`, `d060eed`).
- Forgot / reset password pages (`f301f66`); register, login, auth guard, logout (`fb2e7a7`, `7f5ce39`).
- Dashboard with live data; payer list updated to AMO-Tadamon (Loi 54-23) (`aab792e`).
- Landing page (`f322d0d`).
- Automatic ML scoring on claim creation (`1754402`).
- JWT authentication (`8335003`); Dockerfile (`c167a30`); `.env.example` (`c32d9ca`).
- First model wired to FastAPI with SHAP (`c7a1b24`); ML columns on claims (`05044d2`).
- Hard-coded credentials and API URLs removed; tenant filtering on all endpoints (`2a6b464`, `8cb9ad9`, `a43108f`).
- Renamed Sihaty → SihaIQ (`e72e895`); claim submission form (`7794f56`, `ee4ef83`).

## 2026-04 — Project start
- Project structure, FastAPI server, Supabase connection (`83bc063`, `4a5cc41`, `0e2f432`).
- Tenant, User, Patient and Claim models; core CRUD endpoints (`c1f3489` … `0ea4ded`).
- First RCM dashboard and stats endpoint (`6a15a02`).
