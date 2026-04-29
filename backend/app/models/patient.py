from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Date
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
import uuid

class Patient(Base):
    __tablename__ = 'patients'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    full_name = Column(String, nullable=False)
    cin = Column(String, nullable=True)            # Carte d'identité nationale
    date_of_birth = Column(Date, nullable=True)
    phone = Column(String, nullable=True)
    insurance_type = Column(String, nullable=True) # AMO, CNOPS, CNSS, RAMED
    insurance_number = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)