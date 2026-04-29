from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.claim import Claim
from app.schemas.claim import ClaimCreate, ClaimResponse
from typing import List
from uuid import UUID
import uuid

router = APIRouter(
    prefix="/claims",
    tags=["Claims"]
)

@router.post("/", response_model=ClaimResponse)
def create_claim(claim: ClaimCreate, db: Session = Depends(get_db)):
    new_claim = Claim(
        id=uuid.uuid4(),
        tenant_id=uuid.UUID("6cebb8dc-c371-4025-801f-212217b0d9ca"),  # temporary — will come from auth later
        patient_id=claim.patient_id,
        claim_number=claim.claim_number,
        amount=claim.amount,
        insurance_type=claim.insurance_type,
        service_type=claim.service_type,
        service_date=claim.service_date,
        status="pending"
    )
    db.add(new_claim)
    db.commit()
    db.refresh(new_claim)
    return new_claim

@router.get("/", response_model=List[ClaimResponse])
def get_claims(db: Session = Depends(get_db)):
    claims = db.query(Claim).all()
    return claims

@router.get("/{claim_id}", response_model=ClaimResponse)
def get_claim(claim_id: UUID, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim
