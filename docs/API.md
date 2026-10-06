# API reference

Base URL: `http://localhost:8000` in development. FastAPI also serves interactive docs at `/docs` (Swagger) and `/redoc`.

**Auth:** unless marked *public*, every endpoint requires `Authorization: Bearer <access_token>`. The tenant is always taken from the token, never from the request. Error messages are in French. Error responses use FastAPI's standard shape: `{"detail": "..."}`.

Example values below are illustrative and synthetic.

## Contents

- [Health](#health)
- [Auth](#auth--auth)
- [Claims](#claims--claims)
- [Patients](#patients--patients)
- [Tenants & users](#tenants--users--tenants)
- [Bordereau](#bordereau--bordereau)
- [Financier](#financier--financier)
- [Comptabilité](#comptabilité--comptabilite)
- [Audit](#audit--audit)

---

## Health

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | public | Service banner: `{"status": "online", "platform": "RCM SaaS", "version": "1.0.0"}` |
| GET | `/health` | public | Liveness: `{"status": "healthy"}` |

---

## Auth — `/auth`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | Create a hospital (tenant) and its first user; returns a token |
| POST | `/auth/login` | public | Exchange email + password for a JWT |
| GET | `/auth/me` | JWT | Current user |
| POST | `/auth/forgot-password` | public | Start a password reset (**WIP**: no email is sent yet) |
| POST | `/auth/reset-password` | public | Set a new password from a reset token (**WIP**) |

### POST /auth/register

```json
{
  "hospital_name": "Clinique Démo",
  "hospital_email": "admin@clinique-demo.ma",
  "full_name": "Admin Démo",
  "password": "********",
  "role": "admin"
}
```

Response 200 (same shape as login):

```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user_id": "uuid",
  "tenant_id": "uuid",
  "full_name": "Admin Démo",
  "role": "admin",
  "created_at": "2026-06-12T10:00:00"
}
```

400 if the email is already used.

### POST /auth/login

`Content-Type: application/x-www-form-urlencoded` (OAuth2 password form):

```
username=admin@clinique-demo.ma&password=********
```

Returns the same `LoginResponse` as `/auth/register`. 401 on bad credentials, 400 if the account is inactive.

### GET /auth/me

```json
{ "id": "uuid", "tenant_id": "uuid", "email": "admin@clinique-demo.ma",
  "full_name": "Admin Démo", "role": "admin", "is_active": true }
```

### POST /auth/forgot-password

Request `{"email": "..."}`. Always returns `{"message": "Si cet email existe, un lien de réinitialisation a été envoyé."}`.

### POST /auth/reset-password

Request `{"token": "...", "new_password": "..."}`. Response `{"message": "Mot de passe réinitialisé avec succès"}`; 400 if the token is invalid or expired.

---

## Claims — `/claims`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/claims/predict` | JWT | Score a hypothetical claim (nothing saved) |
| POST | `/claims/` | JWT | Create a claim, auto-score it |
| POST | `/claims/import-csv` | JWT | Bulk-create claims from a CSV file |
| POST | `/claims/scan` | JWT | OCR a scanned document and pre-fill the 5 model fields |
| GET | `/claims/` | JWT | List the tenant's claims (full `ClaimResponse`) |
| GET | `/claims/with-patients` | JWT | Flat list of claims with the patient NE (used by most dashboards) |
| GET | `/claims/stats/summary` | JWT | Counts, total amount, rejection rate |
| GET | `/claims/{claim_id}` | JWT | One claim |
| PATCH | `/claims/{claim_id}/status` | JWT | Record the payer outcome; writes `training_feedback` and the audit log |
| DELETE | `/claims/{claim_id}` | JWT | Delete a claim (reason required); writes the audit log |

### POST /claims/predict

```json
{ "organisme": "CNSS", "duree_sejour": 12, "part_organisme": 0.8,
  "montant_total": 12500, "mois": 6 }
```

`organisme` accepts CNOPS, CNSS, FAR; AMO and AMO-Tadamon are mapped to CNSS, and any other value falls back to CNSS.

Response (actual output of the v3 model for this input):

```json
{
  "risk_score": 0.6564,
  "risk_level": "MODÉRÉ",
  "risk_percentage": "66%",
  "zone": "danger",
  "seuil": 0.4,
  "top_factors": [
    { "feature": "duree_sejour", "impact": 0.1524, "direction": "augmente le risque" },
    { "feature": "montant_total", "impact": -0.0197, "direction": "réduit le risque" },
    { "feature": "part_organisme", "impact": 0.0163, "direction": "augmente le risque" }
  ],
  "recommended_action": "Durée de séjour élevée : facteur de risque majeur de rejet.",
  "model_used": "Random Forest v3 (3 organismes réels)"
}
```

`risk_level`: FAIBLE (< 0.40), MODÉRÉ (0.40–0.70), ÉLEVÉ (≥ 0.70). `zone` is `danger` when `risk_score ≥ 0.40` (decision threshold), else `sure`. 422 if prediction fails.

### POST /claims/

```json
{
  "ne_number": "NE-2026-00042",
  "claim_number": "CLM-2026-0042",
  "amount": 12500,
  "insurance_type": "CNSS",
  "service_type": "hospitalisation",
  "service_date": "2026-06-10T00:00:00",
  "duree_sejour": 4,
  "part_organisme": 0.8
}
```

- `ne_number` is resolved within the tenant; the patient is created if missing. `patient_id` is still accepted for backward compatibility. 400 if neither resolves.
- Optional `acts: [{ngap_code, service_type, quantity, amount, ...}]` is accepted by the schema but not persisted by this endpoint.
- The server sets `status = "pending"`, `forclusion_deadline = service_date + 60 days`, `days_in_ar`, and the ML fields.

Response: `ClaimResponse` with `id`, `tenant_id`, `patient_id`, the input fields, `status`, `risk_score`, `risk_level`, `rejection_cause_predicted`, `ml_top_factors` (JSON string), `forclusion_deadline`, `days_in_ar`, timestamps and `acts`.

### POST /claims/import-csv

`multipart/form-data` with field `file` (UTF-8 CSV).

| Column | Required | Notes |
|---|---|---|
| `ne_number` | yes | Patient created if unknown |
| `organisme` | yes | CNOPS, CNSS, FAR, AMO, AMO-TADAMON |
| `date_entree`, `date_sortie` | yes | `YYYY-MM-DD`; stay length = difference, at least 1 day |
| `montant_total` | yes | > 0 |
| `part_patient` | no | Used to derive `part_organisme`; otherwise a per-payer default rate is used and counted as estimated |
| `claim_number`, `service_type` | no | Generated / default `hospitalisation` |

Files with identity columns (`nom`, `prenom`, `full_name`, `name`, `cin`, `patient_name`, `nom_patient`) are refused with 400.

Response:

```json
{ "created": 48, "errors": ["Ligne 7: montant invalide"], "estimated_count": 12,
  "message": "48 dossier(s) créé(s), 1 erreur(s), 12 part(s) organisme estimée(s)." }
```

### POST /claims/scan

`multipart/form-data` with field `file` (`.pdf`, `.jpg`, `.jpeg`, `.png`, `.tiff`, `.tif`). The file is deleted right after OCR. The claim is **not** created: the agent reviews the fields and then calls `POST /claims/`.

```json
{
  "extracted": {
    "organisme": "CNOPS", "date_entree": "2026-06-01", "date_sortie": "2026-06-05",
    "duree_sejour": 4, "montant_total": 9800.0, "part_patient": 1960.0,
    "part_organisme": 0.8, "mois": 6
  },
  "prediction": { "risk_score": 0.31, "risk_level": "FAIBLE", "rejection_cause_predicted": null },
  "missing": [],
  "needs_review": false,
  "message": "Document lu — vérifiez les champs avant confirmation."
}
```

When fields are missing, `prediction` is `null`, `needs_review` is `true` and `missing` lists them. 400 for an unsupported format, 422 if the document can't be read.

### GET /claims/with-patients

```json
[{
  "id": "uuid", "claim_number": "CLM-2026-0042", "patient_ne": "NE-2026-00042",
  "amount": 12500, "insurance_type": "CNSS", "service_type": "hospitalisation",
  "service_date": "2026-06-10T00:00:00", "status": "pending", "rejection_reason": null,
  "risk_score": 0.6564, "risk_level": "MODÉRÉ",
  "rejection_cause_predicted": "Durée de séjour élevée : ...",
  "forclusion_deadline": "2026-08-09", "created_at": "2026-06-10T09:12:00"
}]
```

### GET /claims/stats/summary

```json
{ "total_claims": 120, "pending": 40, "approved": 60, "rejected": 20,
  "total_amount_mad": 845000.0, "rejection_rate": 16.7 }
```

### PATCH /claims/{claim_id}/status

```json
{ "status": "rejected", "rejection_reason": "Document manquant", "contestation_reason": null }
```

`status` ∈ `approved, rejected, contested, settled, closed, abandoned`; other values return 400.

```json
{ "message": "Dossier CLM-2026-0042 mis à jour — rejected", "claim_id": "uuid",
  "status": "rejected", "resolved_at": "2026-07-01T10:00:00", "training_feedback_saved": true }
```

### DELETE /claims/{claim_id}

Body `{"reason": "Doublon"}`. Deletes the claim's `training_feedback` rows, then the claim; logs `DOSSIER_SUPPRIMÉ`. Response `{"message": "Dossier CLM-… supprimé."}`; 404 if the claim isn't in the tenant.

---

## Patients — `/patients`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/patients/` | JWT | Create a pseudonymous patient |
| GET | `/patients/` | JWT | List the tenant's patients |
| DELETE | `/patients/{patient_id}` | JWT, role admin / director / chef_baf | Delete a patient and their claims (reason required) |

### POST /patients/

```json
{ "ne_number": "NE-2026-00042", "cin": "optional, hashed then discarded",
  "immatriculation": "optional, hashed then discarded", "age_bucket": "41-60",
  "payer_type": "CNSS", "is_ald": false, "is_ayant_droit": false }
```

Response: `id, tenant_id, ne_number, cin_hash, immat_hash, age_bucket, payer_type, is_ald, is_ayant_droit, is_active, created_at`.

### DELETE /patients/{patient_id}

Body `{"reason": "..."}`. 403 for other roles. Removes the patient's `training_feedback` rows and claims, then the patient, and logs `PATIENT_SUPPRIMÉ` with the NE number.

---

## Tenants & users — `/tenants`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/tenants/` | JWT, admin / director | Create a tenant record |
| GET | `/tenants/` | JWT | Returns only the caller's tenant |
| GET | `/tenants/{tenant_id}` | JWT, same tenant | Hospital profile and settings |
| PATCH | `/tenants/{tenant_id}` | JWT, same tenant | Update the profile (`name, email, phone, address, city, forclusion_alert_days, active_payers`) |
| GET | `/tenants/{tenant_id}/users` | JWT, same tenant | List users |
| POST | `/tenants/{tenant_id}/users` | JWT, same tenant, admin / director | Create an agent `{full_name, email, password, role}` |
| PATCH | `/tenants/{tenant_id}/users/{user_id}` | JWT, same tenant, admin / director | Change `role` (admin, director, chef_baf, biller, agent) or `is_active`; you can't modify yourself |
| DELETE | `/tenants/{tenant_id}/users/{user_id}` | JWT, same tenant, admin / director | Delete a user; you can't delete yourself |
| POST | `/tenants/change-password` | JWT | `{user_id, current_password, new_password}`; own account only |

`GET /tenants/{tenant_id}` response:

```json
{ "id": "uuid", "name": "Clinique Démo", "email": "admin@clinique-demo.ma",
  "phone": null, "address": null, "city": "Rabat", "forclusion_alert_days": 7,
  "active_payers": "CNOPS,CNSS,AMO,AMO-Tadamon", "is_active": true,
  "created_at": "2026-06-12T10:00:00" }
```

---

## Bordereau — `/bordereau`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/bordereau/generate` | JWT | PDF transmission slip for selected claims |

```json
{ "claim_ids": ["uuid", "uuid"], "payer": "CNOPS",
  "hospital_name": "Clinique Démo", "hospital_address": "", "hospital_city": "Rabat",
  "hospital_phone": "" }
```

Returns `application/pdf` as an attachment `BRD-YYYYMMDD-HHMMSS.pdf`. Only claims in the caller's tenant are included; 404 if none match.

---

## Financier — `/financier`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/financier/summary?period=all\|month\|quarter\|year` | JWT, admin / director | Revenue-cycle KPIs |

Response keys:
- `kpis`: `total_facture`, `total_approuve`, `total_rejete`, `total_conteste`, `total_regle`, `total_abandonne`, `total_pending`, `total_forclos`, `montant_risque`, `taux_recouvrement`, `taux_rejet`, `nb_*` counters.
- `payer_breakdown[]`: `payer, nb, total, rejected, approved, rejection_rate`.
- `monthly_trend[]`: last 6 months.
- `top_causes[]`: top 5 rejection reasons.

---

## Comptabilité — `/comptabilite`

All routes require JWT with role admin or director. `periode` is `YYYY-MM`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/comptabilite/summary?periode=YYYY-MM` | Hospital-accounting KPIs for a month |
| POST | `/comptabilite/charges` | Add an expense `{periode, categorie, sous_categorie?, montant, description?}` |
| POST | `/comptabilite/tresorerie` | Upsert cash position `{periode, tresorerie_actif, tresorerie_passif, actif_circulant, passif_circulant}` |
| POST | `/comptabilite/admissions` | Upsert activity `{periode, nb_admissions, nb_journees, ca_total}` |

`categorie` values used by the UI: `personnel`, `medicaments`, `honoraires`, `frais_generaux`, `amortissements`.

`summary` returns:
- `kpis`: revenue, charges, EBE / EBIT, net cash, BFR, liquidity ratio, DSO, bed occupancy, collection ratio, cost per day, budget variance.
- `charges_detail[]`, `monthly_trend[]` and `lits_detail[]`.

---

## Audit — `/audit`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/audit/logs` | JWT | Latest 200 audit events for the tenant |

```json
[{ "id": "uuid", "tenant_id": "uuid", "user_email": "agent@clinique-demo.ma",
   "action": "DOSSIER_REJETÉ", "resource_type": "claim", "resource_id": "CLM-2026-0042",
   "details": "Statut mis à jour → rejected | Motif rejet: Document manquant",
   "created_at": "2026-07-01T10:00:00" }]
```

Actions written by the backend: `DOSSIER_APPROUVÉ`, `DOSSIER_REJETÉ`, `DOSSIER_CONTESTÉ`, `DOSSIER_RÉGLÉ`, `DOSSIER_SOLDÉ`, `DOSSIER_ABANDONNÉ`, `DOSSIER_SUPPRIMÉ`, `PATIENT_SUPPRIMÉ`.
