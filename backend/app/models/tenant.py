from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
import uuid

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)          # Hospital name
    email = Column(String, unique=True, nullable=False)  # Contact email
    is_active = Column(Boolean, default=True)      # Is subscription active
    created_at = Column(DateTime, default=datetime.utcnow)