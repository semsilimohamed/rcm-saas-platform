from dotenv import load_dotenv

# Load environment variables before importing anything that reads them
# (app.config / app.database require SECRET_KEY and DATABASE_URL at import time).
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models import tenant, user, patient, claim, claim_act
from app.api import auth
from app.config import settings, ALLOWED_ORIGINS

# Create all tables in Supabase automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RCM SaaS Platform",
    description="Revenue Cycle Management API for Moroccan Healthcare",
    version="1.0.0"
)

# CORS — origines validées au démarrage par config.py (aucun fallback).
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from app.api import claims, tenants, patients, audit, bordereau, financier, comptabilite
app.include_router(claims.router)
app.include_router(tenants.router)
app.include_router(patients.router)
app.include_router(auth.router)
app.include_router(audit.router)
app.include_router(bordereau.router)
app.include_router(financier.router)
app.include_router(comptabilite.router)


@app.get("/")
def root():
    return {
        "status": "online",
        "platform": "RCM SaaS",
        "version": "1.0.0"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}