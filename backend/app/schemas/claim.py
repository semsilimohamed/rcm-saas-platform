from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from uuid import UUID

class ClaimCreate(BaseModel):
    patient_id: UUID
    claim_number: str
    amount: float
    insurance_type: str
    service_type: str
    service_date: datetime

class ClaimResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    patient_id: UUID
    claim_number: str
    amount: float
    insurance_type: str
    service_type: str
    service_date: datetime
    status: str
    denial_probability: Optional[float]
    risk_level: Optional[str]
    rejection_reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
        