from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional
from uuid import UUID


class ClaimActCreate(BaseModel):
    ngap_code: str
    service_type: str
    quantity: int = 1
    amount: float
    ngap_coding_valid: Optional[bool] = None
    prescription_legible: Optional[bool] = None
    pec_required: Optional[bool] = None
    pec_obtained: Optional[bool] = None


class ClaimActResponse(BaseModel):
    id: UUID
    ngap_code: str
    service_type: str
    quantity: int
    amount: float
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    rejection_cause_predicted: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


class ClaimCreate(BaseModel):
    ne_number: Optional[str] = None          # NE — crée le patient à la volée si absent
    patient_id: Optional[UUID] = None        # compatibilité (ancien flux)
    claim_number: str
    amount: float
    insurance_type: str
    service_type: str
    service_date: datetime
    duree_sejour: Optional[int] = None       # jours — connu à la sortie
    part_organisme: Optional[float] = None   # 0.0 à 1.0
    acts: Optional[list[ClaimActCreate]] = None


class ClaimResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    patient_id: UUID
    claim_number: str
    amount: float
    insurance_type: str
    service_type: str
    service_date: datetime
    duree_sejour: Optional[int] = None
    part_organisme: Optional[float] = None
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

    acts: Optional[list[ClaimActResponse]] = []

    class Config:
        from_attributes = True