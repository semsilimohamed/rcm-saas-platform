from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.patient import Patient
from app.models.claim import Claim
from app.models.user import User
from app.schemas.patient import PatientCreate, PatientResponse
from app.api.auth import get_current_user
from typing import List
import uuid

router = APIRouter(
    prefix="/patients",
    tags=["Patients"],
    dependencies=[Depends(get_current_user)]
)

@router.post("/", response_model=PatientResponse)
def create_patient(
    patient: PatientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_patient = Patient(
        id=uuid.uuid4(),
        tenant_id=current_user.tenant_id,
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
def get_patients(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Patient).filter(Patient.tenant_id == current_user.tenant_id).all()

@router.delete("/{patient_id}")
def delete_patient(
    patient_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.tenant_id == current_user.tenant_id,
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient introuvable")
    # Delete all claims belonging to this patient first (scoped to tenant)
    db.query(Claim).filter(
        Claim.patient_id == patient_id,
        Claim.tenant_id == current_user.tenant_id,
    ).delete()
    db.delete(patient)
    db.commit()
    return { "message": f"Patient {patient.full_name} et ses dossiers supprimés." }
