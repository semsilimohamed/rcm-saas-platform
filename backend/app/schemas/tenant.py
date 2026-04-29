from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class TenantCreate(BaseModel):
    name: str
    email: str

class TenantResponse(BaseModel):
    id: UUID
    name: str
    email: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
        