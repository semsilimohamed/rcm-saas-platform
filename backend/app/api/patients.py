from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.models.patient import Patient
from app.models.claim import Claim
from app.models.user import User
from app.schemas.patient import PatientCreate, PatientResponse
from app.api.auth import get_current_user
from typing import List, Optional
import uuid

router = APIRouter(
    prefix="/patients",
    tags=["Patients"],
    dependencies=[Depends(get_current_user)]
)

# Roles allowed to delete patients
ALLOWED_DELETE_ROLES = {"admin", "director", "chef_baf"}

class DeletePatientRequest(BaseModel):
    reason: str
    user_email: Optional[str] = None

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
    request: DeletePatientRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # ── Role guard — only admin, director, chef_baf ──────────────────────
    if current_user.role not in ALLOWED_DELETE_ROLES:
        raise HTTPException(
            status_code=403,
            detail=f"Action non autorisée. Seuls les rôles admin, directeur et chef BAF peuvent supprimer un patient."
        )

    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.tenant_id == current_user.tenant_id,
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient introuvable")

    patient_name = patient.full_name

    # Delete training_feedback rows linked to this patient's claims
    db.execute(text("""
        DELETE FROM training_feedback
        WHERE claim_id IN (
            SELECT id FROM claims
            WHERE patient_id = :pid AND tenant_id = :tid
        )
    """), {"pid": str(patient_id), "tid": str(current_user.tenant_id)})

    # Delete claims
    db.query(Claim).filter(
        Claim.patient_id == patient_id,
        Claim.tenant_id == current_user.tenant_id,
    ).delete()

    # Delete patient
    db.delete(patient)

    # Audit log
    try:
        db.execute(text("""
            INSERT INTO audit_logs (id, tenant_id, user_email, action, resource_type, resource_id, details)
            VALUES (gen_random_uuid(), :tenant_id, :user_email, 'PATIENT_SUPPRIMÉ', 'patient', :patient_name, :details)
        """), {
            "tenant_id": str(current_user.tenant_id),
            "user_email": current_user.email,
            "patient_name": patient_name,
            "details": f"Raison: {request.reason}",
        })
    except Exception as e:
        print(f"Audit log error: {e}")

    db.commit()
    return {"message": f"Patient {patient_name} et ses dossiers supprimés."}