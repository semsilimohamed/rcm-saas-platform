from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional
from uuid import UUID

class PatientCreate(BaseModel):
    full_name: str
    cin: Optional[str] = None
    date_of_birth: Optional[date] = None
    phone: Optional[str] = None
    insurance_type: Optional[str] = None
    insurance_number: Optional[str] = None

class PatientResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    full_name: str
    cin: Optional[str] = None
    phone: Optional[str] = None
    insurance_type: Optional[str] = None
    insurance_number: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True