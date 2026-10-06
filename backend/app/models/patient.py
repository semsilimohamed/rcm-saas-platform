"""ORM model for ``patients``: pseudonymous patients (Loi 09-08).

No name is stored. A patient is identified only by the hospital's
Numéro d'Entrée (NE), unique per tenant; CIN and insurance numbers are
kept only as salted hashes.
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
import uuid

class Patient(Base):
    """A pseudonymous patient of a tenant, keyed on ``(tenant_id, ne_number)``."""
    __tablename__ = 'patients'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # patient_uid
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)

    ne_number = Column(String, nullable=False)     # Numéro d'Entrée — remplace full_name
    cin_hash = Column(String, nullable=True)        # SHA-256(cin + tenant_salt)
    immat_hash = Column(String, nullable=True)      # SHA-256(insurance_number + tenant_salt)
    age_bucket = Column(String, nullable=True)      # '0-17','18-40','41-60','60+'
    payer_type = Column(String, nullable=True)      # CNOPS, CNSS, FAR, AMO, AMO-Tadamon

    is_ald = Column(Boolean, default=False)         # affection longue durée
    is_ayant_droit = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('tenant_id', 'ne_number', name='uq_tenant_ne'),
    )