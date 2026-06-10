from pydantic import BaseModel
from datetime import datetime, date
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

    # AI prediction
    denial_probability: Optional[float] = None
    risk_level: Optional[str] = None
    risk_score: Optional[float] = None
    rejection_cause_predicted: Optional[str] = None
    ml_top_factors: Optional[str] = None

    # Forclusion
    forclusion_deadline: Optional[date] = None
    days_in_ar: Optional[int] = None

    # Status
    rejection_reason: Optional[str] = None
    rejection_code: Optional[str] = None
    submitted_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True