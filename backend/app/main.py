from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine
from dotenv import load_dotenv
import os

from app.models import tenant
from app.database import Base, engine

# Create all tables in Supabase automatically
Base.metadata.create_all(bind=engine)
load_dotenv()

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