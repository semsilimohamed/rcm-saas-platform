"""ORM model for ``users``: accounts that belong to a tenant."""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
import uuid

class User(Base):
    """A user account of a tenant.

    ``role`` is one of ``admin``, ``director``, ``chef_baf``, ``biller`` (default)
    or ``agent``. ``email`` is unique across the platform; passwords are bcrypt hashes.
    """
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="biller")  # admin, biller, auditor, director
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)