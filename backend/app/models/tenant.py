from sqlalchemy import Column, String, Boolean, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
import uuid

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    forclusion_alert_days = Column(Integer, default=7)
    active_payers = Column(String, default="CNOPS,CNSS,AMO,AMO-Tadamon")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)