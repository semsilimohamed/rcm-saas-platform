from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.claim import Claim
from app.models.patient import Patient
from app.schemas.claim import ClaimCreate, ClaimResponse
from datetime import timedelta, date
from typing import List
from uuid import UUID
import uuid

router = APIRouter(
    prefix="/claims",
    tags=["Claims"]
)

@router.post("/", response_model=ClaimResponse)
def create_claim(claim: ClaimCreate, db: Session = Depends(get_db)):
    service_date = claim.service_date if isinstance(claim.service_date, date) else claim.service_date.date()
    
    new_claim = Claim(
        id=uuid.uuid4(),
        tenant_id=claim.tenant_id,
        patient_id=claim.patient_id,
        claim_number=claim.claim_number,
        amount=claim.amount,
        insurance_type=claim.insurance_type,
        service_type=claim.service_type,
        service_date=claim.service_date,
        status="pending",
        forclusion_deadline=service_date + timedelta(days=60),
        days_in_ar=(date.today() - service_date).days
    )
    db.add(new_claim)
    db.commit()
    db.refresh(new_claim)
    return new_claim

@router.get("/stats/summary")
def get_stats(tenant_id: UUID, db: Session = Depends(get_db)):
    total = db.query(func.count(Claim.id)).filter(Claim.tenant_id == tenant_id).scalar()
    pending = db.query(func.count(Claim.id)).filter(Claim.tenant_id == tenant_id, Claim.status == "pending").scalar()
    approved = db.query(func.count(Claim.id)).filter(Claim.tenant_id == tenant_id, Claim.status == "approved").scalar()
    rejected = db.query(func.count(Claim.id)).filter(Claim.tenant_id == tenant_id, Claim.status == "rejected").scalar()
    total_amount = db.query(func.sum(Claim.amount)).filter(Claim.tenant_id == tenant_id).scalar() or 0.0
    rejection_rate = round((rejected / total * 100), 1) if total > 0 else 0.0

    return {
        "total_claims": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "total_amount_mad": total_amount,
        "rejection_rate": rejection_rate
    }

@router.get("/with-patients")
def get_claims_with_patients(tenant_id: UUID, db: Session = Depends(get_db)):
    results = (
        db.query(Claim, Patient.full_name)
        .join(Patient, Claim.patient_id == Patient.id)
        .filter(Claim.tenant_id == tenant_id)
        .all()
    )
    claims_with_names = []
    for claim, full_name in results:
        claims_with_names.append({
            "id": str(claim.id),
            "claim_number": claim.claim_number,
            "patient_name": full_name,
            "amount": claim.amount,
            "insurance_type": claim.insurance_type,
            "service_type": claim.service_type,
            "service_date": claim.service_date.isoformat(),
            "status": claim.status,
            "rejection_reason": claim.rejection_reason,
            "created_at": claim.created_at.isoformat(),
        })
    return claims_with_names

@router.get("/", response_model=List[ClaimResponse])
def get_claims(tenant_id: UUID, db: Session = Depends(get_db)):
    return db.query(Claim).filter(Claim.tenant_id == tenant_id).all()

@router.get("/{claim_id}", response_model=ClaimResponse)
def get_claim(claim_id: UUID, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim