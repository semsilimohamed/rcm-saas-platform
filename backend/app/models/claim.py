from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Float, Text, Date, Integer
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
    service_type = Column(String, nullable=False)
    service_date = Column(DateTime, nullable=False)

    # Status tracking
    status = Column(String, default="pending")       # pending, submitted, approved, rejected
    rejection_reason = Column(Text, nullable=True)
    rejection_code = Column(String, nullable=True)

    # AI prediction — existing
    denial_probability = Column(Float, nullable=True)
    risk_level = Column(String, nullable=True)

    # AI prediction — new
    risk_score = Column(Float, nullable=True)                    # 0.0 to 1.0 from /predict
    rejection_cause_predicted = Column(Text, nullable=True)      # top French recommended action
    ml_top_factors = Column(Text, nullable=True)                 # JSON string of top 3 SHAP factors

    # Forclusion tracking — new
    forclusion_deadline = Column(Date, nullable=True)            # service_date + 60 days
    days_in_ar = Column(Integer, nullable=True)                  # days since service_date

    # Timestamps
    submitted_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)