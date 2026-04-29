from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientResponse
from typing import List
import uuid

router = APIRouter(
    prefix="/patients",
    tags=["Patients"]
)

@router.post("/", response_model=PatientResponse)
def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    new_patient = Patient(
        id=uuid.uuid4(),
        tenant_id=uuid.UUID("6cebb8dc-c371-4025-801f-212217b0d9ca"),
        full_name=patient.full_name,
        cin=patient.cin,
        phone=patient.phone,
        insurance_type=patient.insurance_type,
        insurance_number=patient.insurance_number
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    return new_patient

@router.get("/", response_model=List[PatientResponse])
def get_patients(db: Session = Depends(get_db)):
    return db.query(Patient).all()
