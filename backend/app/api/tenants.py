from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tenant import TenantCreate, TenantResponse
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
import uuid
import bcrypt

router = APIRouter(prefix="/tenants", tags=["Tenants"])


# ── Schemas ────────────────────────────────────────────────────────────────

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    forclusion_alert_days: Optional[int] = None
    active_payers: Optional[str] = None

class PasswordChange(BaseModel):
    user_id: str
    current_password: str
    new_password: str

class NewAgent(BaseModel):
    tenant_id: str
    full_name: str
    email: str
    password: str
    role: str = "biller"

class UpdateAgent(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


# ── Tenant routes ──────────────────────────────────────────────────────────

@router.post("/", response_model=TenantResponse)
def create_tenant(tenant: TenantCreate, db: Session = Depends(get_db)):
    new_tenant = Tenant(
        id=uuid.uuid4(),
        name=tenant.name,
        email=tenant.email
    )
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    return new_tenant


@router.get("/", response_model=List[TenantResponse])
def get_tenants(db: Session = Depends(get_db)):
    return db.query(Tenant).all()


@router.get("/{tenant_id}")
def get_tenant(tenant_id: UUID, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Établissement introuvable")
    return {
        "id":                   str(tenant.id),
        "name":                 tenant.name,
        "email":                tenant.email,
        "phone":                getattr(tenant, "phone", None),
        "address":              getattr(tenant, "address", None),
        "city":                 getattr(tenant, "city", None),
        "forclusion_alert_days":getattr(tenant, "forclusion_alert_days", 7),
        "active_payers":        getattr(tenant, "active_payers", "CNOPS,CNSS,AMO,AMO-Tadamon"),
        "is_active":            tenant.is_active,
        "created_at":           tenant.created_at.isoformat() if tenant.created_at else None,
    }


@router.patch("/{tenant_id}")
def update_tenant(tenant_id: UUID, update: TenantUpdate, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Établissement introuvable")

    # Build one single SQL UPDATE with all changed fields
    fields = {}
    if update.name is not None:                  fields["name"] = update.name
    if update.email is not None:                 fields["email"] = update.email
    if update.phone is not None:                 fields["phone"] = update.phone
    if update.address is not None:               fields["address"] = update.address
    if update.city is not None:                  fields["city"] = update.city
    if update.forclusion_alert_days is not None: fields["forclusion_alert_days"] = update.forclusion_alert_days
    if update.active_payers is not None:         fields["active_payers"] = update.active_payers

    if fields:
        set_clause = ", ".join([f"{k} = :{k}" for k in fields])
        fields["tenant_id"] = str(tenant_id)
        db.execute(text(f"UPDATE tenants SET {set_clause} WHERE id = :tenant_id"), fields)
        db.commit()

    return {"message": "Paramètres mis à jour avec succès."}


# ── User / Agent routes ────────────────────────────────────────────────────

@router.get("/{tenant_id}/users")
def get_users(tenant_id: UUID, db: Session = Depends(get_db)):
    users = db.query(User).filter(User.tenant_id == tenant_id).all()
    return [
        {
            "id":         str(u.id),
            "full_name":  u.full_name,
            "email":      u.email,
            "role":       u.role,
            "is_active":  u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.post("/{tenant_id}/users")
def create_agent(tenant_id: UUID, agent: NewAgent, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == agent.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Un compte avec cet email existe déjà.")
    hashed = bcrypt.hashpw(agent.password.encode(), bcrypt.gensalt()).decode()
    new_user = User(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        email=agent.email,
        full_name=agent.full_name,
        hashed_password=hashed,
        role=agent.role,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    return {"message": f"Compte créé pour {agent.full_name}.", "user_id": str(new_user.id)}


@router.patch("/{tenant_id}/users/{user_id}")
def update_agent(tenant_id: UUID, user_id: UUID, update: UpdateAgent, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.tenant_id == tenant_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if update.role is not None:      user.role = update.role
    if update.is_active is not None: user.is_active = update.is_active
    db.commit()
    return {"message": "Compte mis à jour."}


@router.delete("/{tenant_id}/users/{user_id}")
def delete_agent(tenant_id: UUID, user_id: UUID, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.tenant_id == tenant_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    db.delete(user)
    db.commit()
    return {"message": f"Compte de {user.full_name} supprimé."}


# ── Password change ────────────────────────────────────────────────────────

@router.post("/change-password")
def change_password(req: PasswordChange, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if not bcrypt.checkpw(req.current_password.encode(), user.hashed_password.encode()):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect.")
    user.hashed_password = bcrypt.hashpw(req.new_password.encode(), bcrypt.gensalt()).decode()
    db.commit()
    return {"message": "Mot de passe modifié avec succès."}