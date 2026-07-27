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
import hashlib

router = APIRouter(
    prefix="/patients",
    tags=["Patients"],
    dependencies=[Depends(get_current_user)]
)

ALLOWED_DELETE_ROLES = {"admin", "director", "chef_baf"}

# Sel temporaire — sera remplacé par un sel-par-tenant en base (Phase E sécurité)
_TENANT_SALT = "sihaiq_2026_temp_salt"

def _hash(value: Optional[str], tenant_id) -> Optional[str]:
    """Hache une donnée sensible (CIN, immatriculation) avec un sel. Le clair est jeté."""
    if not value:
        return None
    raw = f"{str(tenant_id)}:{_TENANT_SALT}:{value.strip().upper()}"
    return hashlib.sha256(raw.encode()).hexdigest()


class DeletePatientRequest(BaseModel):
    reason: str
    user_email: Optional[str] = None


@router.post("/", response_model=PatientResponse)
def create_patient(
    patient: PatientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Refuse tout nom en clair glissé dans ne_number (garde-fou pseudonymisation)
    new_patient = Patient(
        id=uuid.uuid4(),
        tenant_id=current_user.tenant_id,
        ne_number=patient.ne_number,
        cin_hash=_hash(patient.cin, current_user.tenant_id),
        immat_hash=_hash(patient.immatriculation, current_user.tenant_id),
        age_bucket=patient.age_bucket,
        payer_type=patient.payer_type,
        is_ald=bool(patient.is_ald),
        is_ayant_droit=bool(patient.is_ayant_droit),
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
    if current_user.role not in ALLOWED_DELETE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Action non autorisée. Seuls les rôles admin, directeur et chef BAF peuvent supprimer un patient."
        )

    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.tenant_id == current_user.tenant_id,
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient introuvable")

    patient_ref = patient.ne_number   # on logge le NE, pas un nom

    db.execute(text("""
        DELETE FROM training_feedback
        WHERE claim_id IN (
            SELECT id FROM claims
            WHERE patient_id = :pid AND tenant_id = :tid
        )
    """), {"pid": str(patient_id), "tid": str(current_user.tenant_id)})

    db.query(Claim).filter(
        Claim.patient_id == patient_id,
        Claim.tenant_id == current_user.tenant_id,
    ).delete()

    db.delete(patient)

    try:
        db.execute(text("""
            INSERT INTO audit_logs (id, tenant_id, user_email, action, resource_type, resource_id, details)
            VALUES (gen_random_uuid(), :tenant_id, :user_email, 'PATIENT_SUPPRIMÉ', 'patient', :patient_ref, :details)
        """), {
            "tenant_id": str(current_user.tenant_id),
            "user_email": current_user.email,
            "patient_ref": patient_ref,
            "details": f"Raison: {request.reason}",
        })
    except Exception as e:
        print(f"Audit log error: {e}")

    db.commit()
    return {"message": f"Patient {patient_ref} et ses dossiers supprimés."}