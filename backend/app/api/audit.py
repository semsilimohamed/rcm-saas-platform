from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from uuid import UUID

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("/logs")
def get_audit_logs(tenant_id: UUID, db: Session = Depends(get_db)):
    result = db.execute(text("""
        SELECT id, tenant_id, user_email, action, resource_type, resource_id, details, created_at
        FROM audit_logs
        WHERE tenant_id = :tenant_id
        ORDER BY created_at DESC
        LIMIT 200
    """), {"tenant_id": str(tenant_id)})
    rows = result.fetchall()
    return [
        {
            "id": str(r[0]),
            "tenant_id": str(r[1]),
            "user_email": r[2],
            "action": r[3],
            "resource_type": r[4],
            "resource_id": r[5],
            "details": r[6],
            "created_at": r[7].isoformat() if r[7] else None,
        }
        for r in rows
    ]