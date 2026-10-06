"""Authentication router (``/auth``) and shared auth dependencies.

Provides registration (tenant + first user), OAuth2 password login issuing a
JWT (``sub`` = user id, ``tenant_id``), ``/me``, and a password-reset flow that
is still WIP (no email is sent). Also exports ``get_current_user`` and
``require_role``, used by every other router.
"""

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
    """Payload of ``POST /auth/register``."""
    hospital_name: str
    hospital_email: str
    full_name: str
    password: str
    role: str = "admin"

class LoginResponse(BaseModel):
    """Token and user summary returned by register and login."""
    access_token: str
    token_type: str
    user_id: str
    tenant_id: str
    full_name: str
    role: str
    created_at: Optional[str] = None

class UserResponse(BaseModel):
    """Current user as returned by ``GET /auth/me``."""
    id: UUID
    tenant_id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool

# ---------- Helpers ----------

def hash_password(password: str) -> str:
    """Hash a plain password with bcrypt.

    Args:
        password: Plain-text password.

    Returns:
        str: The bcrypt hash.
    """
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    """Check a plain password against a bcrypt hash.

    Args:
        plain: Plain-text password.
        hashed: Stored bcrypt hash.

    Returns:
        bool: True if they match.
    """
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a signed JWT.

    Args:
        data: Claims to encode (``sub`` and ``tenant_id``).
        expires_delta: Optional lifetime; defaults to ``ACCESS_TOKEN_EXPIRE_MINUTES``.

    Returns:
        str: The encoded token.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """FastAPI dependency resolving the authenticated user from the bearer token.

    Args:
        token: Bearer token extracted by ``OAuth2PasswordBearer``.
        db: Database session.

    Returns:
        User: The active user the token belongs to.

    Raises:
        HTTPException: 401 if the token is invalid, expired, or the user is missing or inactive.
    """
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

def require_role(allowed_roles: list[str]):
    """Build a dependency that only lets the given roles through.

    Args:
        allowed_roles: Role names allowed to call the route.

    Returns:
        Callable: A dependency returning the current user, or raising 403.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        """Return the current user if their role is allowed, else raise 403."""
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Accès non autorisé pour ce rôle")
        return current_user
    return role_checker

# ---------- Endpoints ----------

@router.post("/register", response_model=LoginResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Create a tenant and its first user, then return a token.

    Args:
        request: Hospital name/email, user full name, password and role.
        db: Database session.

    Returns:
        LoginResponse: Token and user summary.

    Raises:
        HTTPException: 400 if the email is already used.
    """
    email_norm = request.hospital_email.strip().lower()

    existing = db.query(User).filter(User.email == email_norm).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    tenant = Tenant(
        id=uuid.uuid4(),
        name=request.hospital_name,
        email=email_norm
    )
    db.add(tenant)
    db.flush()

    user = User(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        email=email_norm,
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
    """Authenticate with email + password (OAuth2 password form).

    Args:
        form: ``username`` (email) and ``password``.
        db: Database session.

    Returns:
        LoginResponse: Token and user summary.

    Raises:
        HTTPException: 401 on bad credentials, 400 if the account is inactive.
    """
    user = db.query(User).filter(User.email == form.username.strip().lower()).first()
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
    """Return the authenticated user.

    Args:
        current_user: Injected by ``get_current_user``.

    Returns:
        User: Serialised as ``UserResponse``.
    """
    return current_user
import secrets
from datetime import datetime, timedelta

# Store reset tokens temporarily (in production use Redis or DB table)
reset_tokens = {}

class ForgotPasswordRequest(BaseModel):
    """Payload of ``POST /auth/forgot-password``."""
    email: str

class ResetPasswordRequest(BaseModel):
    """Payload of ``POST /auth/reset-password``."""
    token: str
    new_password: str

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Start a password reset (WIP: no email is sent yet).

    Always returns the same generic message so that account existence is not revealed.

    Args:
        request: The account email.
        db: Database session.

    Returns:
        dict: Generic confirmation message.
    """
    email_norm = request.email.strip().lower()
    user = db.query(User).filter(User.email == email_norm).first()

    generic_response = {
        "message": "Si cet email existe, un lien de réinitialisation a été envoyé."
    }

    if not user:
        return generic_response

    token = secrets.token_urlsafe(32)
    reset_tokens[token] = {
        "email": email_norm,
        "expires": datetime.utcnow() + timedelta(minutes=30),
    }

    print(f"[RESET] token généré pour user_id={user.id}")

    return generic_response

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Set a new password from a reset token (WIP).

    Args:
        request: Reset token and new password.
        db: Database session.

    Returns:
        dict: Confirmation message.

    Raises:
        HTTPException: 400 if the token is invalid or expired, 404 if the user no longer exists.
    """
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