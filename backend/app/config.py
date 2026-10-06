"""Application settings read from the environment / ``.env``.

Fails fast at import time when ``SECRET_KEY`` or ``ALLOWED_ORIGINS`` is
missing, so the API never starts with an insecure default.

Exports:
    settings: ``Settings`` instance (database URL, JWT key, algorithm, token lifetime).
    ALLOWED_ORIGINS: list of CORS origins parsed from the comma-separated variable.
"""

import os
from pydantic_settings import BaseSettings

# Fail fast at startup if the JWT secret is not provided via the environment.
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY not set")

# Fail fast if CORS origins are not explicitly configured.
# Never fall back to "*" — that would expose the API to any origin.
_ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS")
if not _ALLOWED_ORIGINS:
    raise RuntimeError("ALLOWED_ORIGINS not set")

# Liste des origines autorisées — variable module, pas un champ Settings
# (pydantic-settings tenterait de parser la valeur du .env comme du JSON).
ALLOWED_ORIGINS = [o.strip() for o in _ALLOWED_ORIGINS.split(",") if o.strip()]


class Settings(BaseSettings):
    """Typed settings loaded by pydantic-settings.

    Attributes:
        database_url: PostgreSQL connection string (``DATABASE_URL``).
        secret_key: JWT signing key (``SECRET_KEY``).
        algorithm: JWT algorithm, ``HS256`` by default.
        access_token_expire_minutes: Token lifetime, 480 by default.
    """
    database_url: str
    secret_key: str = SECRET_KEY
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()