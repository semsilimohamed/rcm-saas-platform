from dotenv import load_dotenv

# Load environment variables before importing anything that reads them
# (app.config / app.database require SECRET_KEY and DATABASE_URL at import time).
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import Base, engine
from app.models import tenant, user, patient, claim
from app.api import auth
from app.ml import predict

# Create all tables in Supabase automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RCM SaaS Platform",
    description="Revenue Cycle Management API for Moroccan Healthcare",
    version="1.0.0"
)

# CORS — allowed origins are env-driven (comma-separated), defaulting to local dev.
origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from app.api import claims, tenants, patients, audit, bordereau, financier, comptabilite
app.include_router(claims.router)
app.include_router(tenants.router)
app.include_router(patients.router)
app.include_router(predict.router)
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

@app.get("/db-test")
def db_test():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"database": "connected"}
    except Exception as e:
        return {"database": "error", "detail": str(e)}
