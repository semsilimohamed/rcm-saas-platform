from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from uuid import UUID
import uuid

from app.database import get_db
from app.models.user import User
from app.models.tenant import Tenant
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ---------- Schemas ----------

class RegisterRequest(BaseModel):
    hospital_name: str
    hospital_email: str
    full_name: str
    password: str
    role: str = "admin"

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    tenant_id: str
    full_name: str
    role: str
    created_at: Optional[str] = None

class UserResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool

# ---------- Helpers ----------

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

# ---------- Endpoints ----------

@router.post("/register", response_model=LoginResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    # Check email not already used
    existing = db.query(User).filter(User.email == request.hospital_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    # Create tenant (hospital)
    tenant = Tenant(
        id=uuid.uuid4(),
        name=request.hospital_name,
        email=request.hospital_email
    )
    db.add(tenant)
    db.flush()

    # Create admin user
    user = User(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        email=request.hospital_email,
        hashed_password=hash_password(request.password),
        full_name=request.full_name,
        role=request.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Return token immediately
    token = create_access_token({"sub": str(user.id), "tenant_id": str(tenant.id)})
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user_id=str(user.id),
        tenant_id=str(tenant.id),
        full_name=user.full_name,
        role=user.role,
        created_at=user.created_at.isoformat() if user.created_at else None
    )

@router.post("/login", response_model=LoginResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect"
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Compte désactivé")

    token = create_access_token({"sub": str(user.id), "tenant_id": str(user.tenant_id)})
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        full_name=user.full_name,
        role=user.role,
        created_at=user.created_at.isoformat() if user.created_at else None
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
import secrets
from datetime import datetime, timedelta

# Store reset tokens temporarily (in production use Redis or DB table)
reset_tokens = {}

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Don't reveal if email exists
        return {"message": "Si cet email existe, un lien de réinitialisation a été envoyé."}
    
    token = secrets.token_urlsafe(32)
    reset_tokens[token] = {
        "email": request.email,
        "expires": datetime.utcnow() + timedelta(minutes=30)
    }
    # In production: send email. For now return token directly.
    return {
        "message": "Token de réinitialisation généré.",
        "reset_token": token,
        "reset_url": f"http://localhost:3000/auth/reset-password?token={token}"
    }

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_data = reset_tokens.get(request.token)
    if not token_data:
        raise HTTPException(status_code=400, detail="Token invalide ou expiré")
    if datetime.utcnow() > token_data["expires"]:
        del reset_tokens[request.token]
        raise HTTPException(status_code=400, detail="Token expiré")
    
    user = db.query(User).filter(User.email == token_data["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    
    user.hashed_password = hash_password(request.new_password)
    db.commit()
    del reset_tokens[request.token]
    return {"message": "Mot de passe réinitialisé avec succès"}