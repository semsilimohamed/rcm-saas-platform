"""Pydantic schemas for tenant creation and listing."""

from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class TenantCreate(BaseModel):
    """Payload of ``POST /tenants/``."""
    name: str
    email: str

class TenantResponse(BaseModel):
    """Minimal tenant representation returned by ``/tenants/``."""
    id: UUID
    name: str
    email: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
        