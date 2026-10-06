"""Pydantic request/response schemas for pseudonymous patients."""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from uuid import UUID


class PatientCreate(BaseModel):
    """Payload of ``POST /patients/``.

    ``cin`` and ``immatriculation`` are optional, hashed server-side and never stored in clear.
    """
    ne_number: str                          # Numéro d'Entrée — remplace le nom
    cin: Optional[str] = None               # entré en clair, haché puis jeté (jamais stocké)
    immatriculation: Optional[str] = None   # idem — haché en immat_hash
    age_bucket: Optional[str] = None        # '0-17','18-40','41-60','60+'
    payer_type: Optional[str] = None        # CNOPS, CNSS, FAR, AMO, AMO-Tadamon
    is_ald: Optional[bool] = False
    is_ayant_droit: Optional[bool] = False


class PatientResponse(BaseModel):
    """A patient as returned by the API (hashes only, no identity data)."""
    id: UUID
    tenant_id: UUID
    ne_number: str
    cin_hash: Optional[str] = None
    immat_hash: Optional[str] = None
    age_bucket: Optional[str] = None
    payer_type: Optional[str] = None
    is_ald: bool
    is_ayant_droit: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True