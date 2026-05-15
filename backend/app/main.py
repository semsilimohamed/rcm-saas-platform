from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from dotenv import load_dotenv
from app.ml import predict
import os

load_dotenv()

from app.database import Base, engine
from app.models import tenant, user, patient, claim

# Create all tables in Supabase automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RCM SaaS Platform",
    description="Revenue Cycle Management API for Moroccan Healthcare",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from app.api import claims, tenants, patients
app.include_router(claims.router)
app.include_router(tenants.router) 
app.include_router(patients.router)
app.include_router(predict.router)
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
    