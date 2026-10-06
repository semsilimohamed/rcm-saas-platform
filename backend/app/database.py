"""SQLAlchemy engine, session factory and declarative base.

The engine is created from ``settings.database_url`` at import time.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(settings.database_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """FastAPI dependency yielding a database session.

    Yields:
        Session: A SQLAlchemy session, closed after the request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()