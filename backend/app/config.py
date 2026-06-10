import os
from pydantic_settings import BaseSettings

# Fail fast at startup if the JWT secret is not provided via the environment.
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY not set")

class Settings(BaseSettings):
    database_url: str
    secret_key: str = SECRET_KEY
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    class Config:
        env_file = ".env"
        # Allow .env to hold keys that aren't Settings fields (e.g. ALLOWED_ORIGINS,
        # which main.py reads directly from os.environ).
        extra = "ignore"

settings = Settings()
