"""ORM model for ``claim_acts``: optional line items (actes NGAP) of a claim. No endpoint writes it yet."""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Float, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
import uuid


class ClaimAct(Base):
    """
    One line item (acte) within a dossier de facturation.
    A Claim (dossier) can have zero or many ClaimActs.
    Kept separate from Claim so existing single-act claims and code
    that reads claim.amount / claim.service_type keep working unchanged.
    """
    __tablename__ = "claim_acts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id"), nullable=False)

    ngap_code = Column(String, nullable=False)
    service_type = Column(String, nullable=False)
    quantity = Column(Integer, default=1)
    amount = Column(Float, nullable=False)

    ngap_coding_valid = Column(Boolean, nullable=True)
    prescription_legible = Column(Boolean, nullable=True)
    pec_required = Column(Boolean, nullable=True)
    pec_obtained = Column(Boolean, nullable=True)

    risk_score = Column(Float, nullable=True)
    risk_level = Column(String, nullable=True)
    rejection_cause_predicted = Column(String, nullable=True)
    ml_top_factors = Column(String, nullable=True)

    status = Column(String, default="pending")
    rejection_reason = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)