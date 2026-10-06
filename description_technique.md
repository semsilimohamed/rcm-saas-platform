# Description Technique — SihaIQ (vue code)

Basé uniquement sur lecture du code, pas de la documentation.

## Architecture réelle

**Backend** : FastAPI (0.136.1) + SQLAlchemy 2.0 (ORM + `text()` pour requêtes brutes paramétrées) sur Postgres (Supabase, via `psycopg2-binary`). Auth JWT (HS256) avec `python-jose`, hashing de mots de passe via `passlib`/`bcrypt`. Modèle ML : RandomForest scikit-learn, chargé via `joblib` depuis un artefact versionné (`sihaiq_rf_v3.joblib`).

**Frontend** : Next.js 16.2.4 (App Router), React 19.2.4, TypeScript. Appels API via `fetch()` natif (pas d'axios), token bearer stocké en `localStorage`. Styling Tailwind CSS 4 + inline styles + framer-motion/gsap pour animations. Pas de state manager global visible (Redux/Zustand) — état local par composant (`useState` + `localStorage`).

**Structure backend** (`backend/app/`) :
- `api/` — routes : `auth`, `billing`, `bordereau`, `claims`, `comptabilite`, `financier`, `patients`, `tenants`, `audit`
- `ml/` — `features.py`, `train.py`, `models/sihaiq_rf_v3.joblib`, `_archive/` (anciens modèles)
- `models/` — SQLAlchemy : `claim.py`, `claim_act.py`, `patient.py`, `tenant.py`, `user.py`
- `schemas/` — Pydantic : `claim.py`, `patient.py`, `tenant.py`
- `services/` — `billing_service.py`, `claim_processor.py`, `denial_engine.py`, `fse_parser.py`, `ocr_parser.py`
- `tasks/` — `batch_predict.py`, `generate_reports.py`, `send_notifications.py`
- racine : `config.py`, `database.py`, `main.py`, `seed_data.py`, `debug_ocr.py`, `debug_page.py`

**Structure frontend** (`frontend/app/`) :
- `auth/` — login, register, forgot-password, reset-password
- `dashboard/` — audit, comptabilite, dossiers (ImportCsvModal, ManualClaimModal, ScanModal), encours, financier, forclusion, patients, performance, prediction, settings
- `legal/` — accessibilite, cndp, conditions, confidentialite, sitemap
- `onboarding/`

**Communication** : le frontend appelle directement les routes REST FastAPI via `fetch`, avec le JWT en header `Authorization: Bearer`. Pas de couche GraphQL/BFF intermédiaire visible.

## Endpoints réellement implémentés (34 routes trouvées)

- `auth.py` : POST /register, /login, GET /me, POST /forgot-password, /reset-password
- `claims.py` : POST /predict, /import-csv, /, GET /stats/summary, /with-patients, /, /{claim_id}, PATCH /{claim_id}/status, POST /scan, DELETE /{claim_id}
- `patients.py` : POST /, GET /, DELETE /{patient_id}
- `tenants.py` : POST /, GET /, GET /{tenant_id}, PATCH /{tenant_id}, GET/POST /{tenant_id}/users, PATCH/DELETE /{tenant_id}/users/{user_id}, POST /change-password
- `financier.py` : GET /summary
- `comptabilite.py` : GET /summary, POST /charges, /tresorerie, /admissions
- `audit.py` : GET /logs
- `bordereau.py` : POST /generate

À vérifier : aucun test automatisé trouvé (`test_*.py`), donc "fonctionnel" ici signifie "code présent et cohérent", pas "validé par tests".

## Ce qui est mort ou inachevé

- **Code inatteignable** : `backend/app/api/auth.py:194-207` — bloc dupliqué de génération de token de reset situé après un `return`, ne s'exécute jamais. Reste probable d'un refactor incomplet.
- **Module archivé non utilisé** : `backend/app/ml/_archive/` — ancien pipeline (XGBoost, KMeans, scaler, etc. en `.pkl`) conservé dans le repo mais non importé par le code actif. `requirements.txt:9` confirme explicitement que xgboost n'est "plus utilisé par le code actif depuis SihaIQ v3".
- **Scripts de debug à la racine** : `backend/debug_ocr.py`, `backend/debug_page.py` — outils de développement, hors du package `app/`, pas de garantie qu'ils soient maintenus.
- **Pas de framework de migration** : aucun dossier Alembic trouvé ; seul un script `backend/app/ml/calibration_percentiles.sql` existe en dehors de tout outillage de migration — évolutions de schéma probablement manuelles.

## Limites techniques actuelles

- **Pas de tests automatisés** détectés côté backend (`test_*.py` / `*_test.py` absents) — aucune garantie de non-régression via CI.
- **Pas de migrations de schéma gérées** (pas d'Alembic) — changements de schéma DB non versionnés/rejouables.
- **Autorisation financière appliquée uniquement côté client** (voir audit sécurité, finding Haute #1) — dette d'architecture, pas seulement un bug ponctuel : le pattern "checkbox de rôle en frontend, rien côté serveur" devra être généralisé/corrigé pour toute nouvelle route sensible.
- **Validation d'upload basée sur l'extension** plutôt que le contenu réel du fichier (finding Moyenne #3).
- **Pas de limite de taille explicite sur les uploads** (finding Moyenne #4).
- Aucun chemin Windows hardcodé trouvé dans le code applicatif (`C:\...`) — un seul faux positif détecté (placeholder de téléphone `+212 5XX XXX XXX` dans `settings/page.tsx:323`), donc pas de dette de portabilité de ce type identifiée.
- Dépendance à un artefact modèle ML unique et figé (`sihaiq_rf_v3.joblib`), avec avertissement explicite dans `requirements.txt` sur la nécessité de garder les versions de `scikit-learn`/`joblib` alignées — fragilité si les versions divergent lors d'une mise à jour de dépendances.

## Avantages techniques réels

- **Isolation multi-tenant cohérente** : `tenant_id` dérivé du JWT partout, jamais du body/query client, avec garde explicite (`ensure_same_tenant`) sur le seul endroit où il apparaît en paramètre d'URL (`tenants.py`).
- **Anonymisation des identifiants patients** : CIN/immatriculation stockés en hash salé (tenant_id + salt + valeur normalisée), pas en clair — choix cohérent avec un contexte CNDP/Loi 09-08 explicitement référencé côté frontend.
- **Gestion propre des fichiers temporaires OCR** : `tempfile.NamedTemporaryFile` (nom généré par la stdlib) + suppression garantie en bloc `finally`, éliminant le risque de traversée de chemin et les fuites de fichiers résiduels.
- **Validation de config au démarrage** (`config.py`) : `SECRET_KEY`/`ALLOWED_ORIGINS` manquants font échouer le démarrage plutôt que de retomber sur une valeur par défaut non sécurisée.
- **Traçabilité** : concept d'audit log en première classe (route `audit.py` dédiée + écritures dans `claims.py`/`patients.py` sur les actions de mutation).
- **Versionnement explicite des artefacts ML** : commentaires dans `requirements.txt` documentant quelle version de bibliothèque correspond à quel modèle, et conservation des générations précédentes dans `_archive/` plutôt que suppression pure.
