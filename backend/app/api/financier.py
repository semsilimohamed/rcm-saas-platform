from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.api.auth import get_current_user, require_role
from app.models.user import User
from uuid import UUID
from datetime import datetime, timedelta

router = APIRouter(
    prefix="/financier",
    tags=["Financier"],
    dependencies=[Depends(get_current_user), Depends(require_role(["admin", "director"]))],
)

def get_period_filter(period: str):
    now = datetime.utcnow()
    if period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "quarter":
        quarter_start_month = ((now.month - 1) // 3) * 3 + 1
        start = now.replace(month=quarter_start_month, day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        return ""
    return f"AND c.created_at >= '{start.isoformat()}'"

@router.get("/summary")
def get_financier_summary(
    period: str = "all",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tenant_id = current_user.tenant_id
    period_filter = get_period_filter(period)

    # Main financial summary by status
    result = db.execute(text(f"""
        SELECT
            status,
            COUNT(*) as nb,
            COALESCE(SUM(amount), 0) as total
        FROM claims c
        WHERE c.tenant_id = :tid {period_filter}
        GROUP BY status
    """), {"tid": str(tenant_id)})
    rows = {r[0]: {"nb": r[1], "total": float(r[2])} for r in result.fetchall()}

    # Forclusion — pending claims past deadline
    forclusion_result = db.execute(text(f"""
        SELECT COUNT(*), COALESCE(SUM(amount), 0)
        FROM claims c
        WHERE c.tenant_id = :tid
        AND c.status = 'pending'
        AND c.forclusion_deadline < NOW()
        {period_filter.replace('c.created_at', 'c.created_at')}
    """), {"tid": str(tenant_id)})
    forc = forclusion_result.fetchone()
    forclos_nb    = forc[0] or 0
    forclos_total = float(forc[1] or 0)

    # Payer breakdown
    payer_result = db.execute(text(f"""
        SELECT
            insurance_type,
            COUNT(*) as nb,
            COALESCE(SUM(amount), 0) as total,
            COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
        FROM claims c
        WHERE c.tenant_id = :tid {period_filter}
        GROUP BY insurance_type
        ORDER BY total DESC
    """), {"tid": str(tenant_id)})
    payer_breakdown = [
        {
            "payer":        r[0],
            "nb":           r[1],
            "total":        float(r[2]),
            "rejected":     r[3],
            "approved":     r[4],
            "rejection_rate": round(r[3] / r[1] * 100, 1) if r[1] > 0 else 0
        }
        for r in payer_result.fetchall()
    ]

    # Monthly trend — last 6 months
    trend_result = db.execute(text("""
        SELECT
            TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
            COUNT(*) as nb,
            COALESCE(SUM(amount), 0) as total,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
            COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
        FROM claims
        WHERE tenant_id = :tid
        AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
    """), {"tid": str(tenant_id)})
    monthly_trend = [
        {
            "month":    r[0],
            "nb":       r[1],
            "total":    float(r[2]),
            "approved": r[3],
            "rejected": r[4]
        }
        for r in trend_result.fetchall()
    ]

    # Top rejection causes
    causes_result = db.execute(text(f"""
        SELECT rejection_reason, COUNT(*) as nb, COALESCE(SUM(amount), 0) as total
        FROM claims c
        WHERE c.tenant_id = :tid
        AND status IN ('rejected', 'abandoned')
        AND rejection_reason IS NOT NULL
        {period_filter}
        GROUP BY rejection_reason
        ORDER BY nb DESC
        LIMIT 5
    """), {"tid": str(tenant_id)})
    top_causes = [
        {"reason": r[0], "nb": r[1], "total": float(r[2])}
        for r in causes_result.fetchall()
    ]

    # Compute KPIs
    total_facture  = sum(v["total"] for v in rows.values())
    total_approuve = rows.get("approved", {}).get("total", 0)
    total_rejete   = rows.get("rejected", {}).get("total", 0)
    total_conteste = rows.get("contested", {}).get("total", 0)
    total_regle    = rows.get("settled", {}).get("total", 0)
    total_solde    = rows.get("closed", {}).get("total", 0)
    total_abandonne= rows.get("abandoned", {}).get("total", 0)
    total_pending  = rows.get("pending", {}).get("total", 0)

    nb_total    = sum(v["nb"] for v in rows.values())
    nb_approuve = rows.get("approved", {}).get("nb", 0)
    nb_rejete   = rows.get("rejected", {}).get("nb", 0)
    nb_pending  = rows.get("pending", {}).get("nb", 0)

    taux_recouvrement = round((total_approuve + total_regle + total_solde) / total_facture * 100, 1) if total_facture > 0 else 0
    taux_rejet        = round((nb_rejete + rows.get("abandoned", {}).get("nb", 0)) / nb_total * 100, 1) if nb_total > 0 else 0
    montant_risque    = total_rejete + total_conteste + total_abandonne + forclos_total

    return {
        "period": period,
        "kpis": {
            "total_facture":       round(total_facture, 2),
            "total_approuve":      round(total_approuve, 2),
            "total_rejete":        round(total_rejete, 2),
            "total_conteste":      round(total_conteste, 2),
            "total_regle":         round(total_regle, 2),
            "total_abandonne":     round(total_abandonne, 2),
            "total_pending":       round(total_pending, 2),
            "total_forclos":       round(forclos_total, 2),
            "montant_risque":      round(montant_risque, 2),
            "taux_recouvrement":   taux_recouvrement,
            "taux_rejet":          taux_rejet,
            "nb_total":            nb_total,
            "nb_approuve":         nb_approuve,
            "nb_rejete":           nb_rejete,
            "nb_pending":          nb_pending,
            "nb_forclos":          forclos_nb,
        },
        "payer_breakdown":  payer_breakdown,
        "monthly_trend":    monthly_trend,
        "top_causes":       top_causes,
    }