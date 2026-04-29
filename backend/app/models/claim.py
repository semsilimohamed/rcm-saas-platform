from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Float, Text
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
import uuid

class Claim(Base):
    __tablename__ = "claims"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    
    # Claim details
    claim_number = Column(String, unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    insurance_type = Column(String, nullable=False)  # AMO, CNOPS, CNSS, RAMED
    service_type = Column(String, nullable=False)    # consultation, surgery, lab, pharmacy
    service_date = Column(DateTime, nullable=False)
    
    # Status tracking
    status = Column(String, default="pending")       # pending, submitted, approved, rejected
    rejection_reason = Column(Text, nullable=True)   # if rejected, why
    rejection_code = Column(String, nullable=True)   # official rejection code
    
    # AI prediction
    denial_probability = Column(Float, nullable=True) # 0.0 to 1.0 from your ML model
    risk_level = Column(String, nullable=True)        # low, medium, high
    
    # Timestamps
    submitted_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    