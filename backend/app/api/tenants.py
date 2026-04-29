from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.tenant import Tenant
from app.schemas.tenant import TenantCreate, TenantResponse
from typing import List
import uuid

router = APIRouter(
    prefix="/tenants",
    tags=["Tenants"]
)

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