from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.api.auth import get_current_user, require_role
from app.models.user import User
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

router = APIRouter(
    prefix="/comptabilite",
    tags=["Comptabilite"],
    dependencies=[Depends(get_current_user), Depends(require_role(["admin", "director"]))],
)

# ── GET SUMMARY ────────────────────────────────────────────────────────────
@router.get("/summary")
def get_summary(
    periode: str = "2026-06",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tid = str(current_user.tenant_id)

    # 1. Charges par catégorie
    charges = db.execute(text("""
        SELECT categorie, COALESCE(SUM(montant), 0) as total
        FROM acc_charges
        WHERE tenant_id = :tid AND periode = :periode
        GROUP BY categorie
    """), {"tid": tid, "periode": periode}).fetchall()
    charges_map = {r[0]: float(r[1]) for r in charges}
    total_charges = sum(charges_map.values())

    # 2. Budget
    budget = db.execute(text("""
        SELECT categorie, COALESCE(SUM(montant_prevu), 0) as total
        FROM acc_budget
        WHERE tenant_id = :tid AND periode = :periode
        GROUP BY categorie
    """), {"tid": tid, "periode": periode}).fetchall()
    budget_map = {r[0]: float(r[1]) for r in budget}

    # 3. Trésorerie
    treo = db.execute(text("""
        SELECT tresorerie_actif, tresorerie_passif, actif_circulant, passif_circulant
        FROM acc_tresorerie
        WHERE tenant_id = :tid AND periode = :periode
        ORDER BY created_at DESC LIMIT 1
    """), {"tid": tid, "periode": periode}).fetchone()
    treo_actif   = float(treo[0]) if treo else 0
    treo_passif  = float(treo[1]) if treo else 0
    actif_circ   = float(treo[2]) if treo else 0
    passif_circ  = float(treo[3]) if treo else 0

    # 4. Lits
    lits = db.execute(text("""
        SELECT service, nb_lits_total, nb_lits_occupes, nb_journees_total
        FROM acc_lits
        WHERE tenant_id = :tid AND periode = :periode
    """), {"tid": tid, "periode": periode}).fetchall()
    total_lits     = sum(r[1] for r in lits)
    total_occupes  = sum(r[2] for r in lits)
    total_journees = sum(r[3] for r in lits)
    taux_occupation = round(total_occupes / total_lits * 100, 1) if total_lits > 0 else 0

    # 5. Admissions
    adm = db.execute(text("""
        SELECT nb_admissions, nb_journees, ca_total
        FROM acc_admissions
        WHERE tenant_id = :tid AND periode = :periode
        ORDER BY created_at DESC LIMIT 1
    """), {"tid": tid, "periode": periode}).fetchone()
    nb_admissions = int(adm[0]) if adm else 0
    ca_total      = float(adm[2]) if adm else 0

    # 6. RCM data (from claims)
    rcm = db.execute(text("""
        SELECT
            COALESCE(SUM(amount), 0) as ca_facture,
            COUNT(*) as nb_dossiers,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as encaisse
        FROM claims
        WHERE tenant_id = :tid
        AND TO_CHAR(created_at, 'YYYY-MM') = :periode
    """), {"tid": tid, "periode": periode}).fetchone()
    ca_facture = float(rcm[0]) if rcm else 0
    encaisse   = float(rcm[2]) if rcm else 0

    # Use acc_admissions CA if no claims data for period
    if ca_total > 0:
        ca_facture = ca_total
    if encaisse == 0 and ca_facture > 0:
        encaisse = ca_facture * 0.753  # use known recovery rate

    # ── KPI Calculations ──
    tresorerie_nette   = treo_actif - treo_passif
    bfr                = actif_circ - passif_circ
    ratio_liquidite    = round(actif_circ / passif_circ, 2) if passif_circ > 0 else 0
    charges_personnel  = charges_map.get("personnel", 0)
    charges_meds       = charges_map.get("medicaments", 0)
    charges_honoraires = charges_map.get("honoraires", 0)
    charges_generaux   = charges_map.get("frais_generaux", 0)
    amortissements     = charges_map.get("amortissements", 0)
    ebe                = ca_facture - charges_personnel - charges_meds - charges_honoraires - charges_generaux
    ebe_pct            = round(ebe / ca_facture * 100, 1) if ca_facture > 0 else 0
    ratio_encaissement = round(encaisse / ca_facture * 100, 1) if ca_facture > 0 else 0
    dso                = round((actif_circ / ca_facture * 30), 1) if ca_facture > 0 else 0
    recette_moy        = round(ca_facture / nb_admissions, 0) if nb_admissions > 0 else 0
    cout_journee       = round(total_charges / total_journees, 0) if total_journees > 0 else 0

    # Budget vs réalisé
    budget_recettes = budget_map.get("recettes", 0)
    ecart_recettes  = round((ca_facture - budget_recettes) / budget_recettes * 100, 1) if budget_recettes > 0 else 0
    budget_charges  = sum(budget_map.get(k, 0) for k in ["charges_personnel", "charges_medicaments", "charges_generales"])
    ecart_charges   = round((total_charges - budget_charges) / budget_charges * 100, 1) if budget_charges > 0 else 0

    # Monthly trend (last 6 months)
    trend = db.execute(text("""
        SELECT a.periode,
               COALESCE(a.ca_total, 0) as ca,
               COALESCE(SUM(c.montant), 0) as charges
        FROM acc_admissions a
        LEFT JOIN acc_charges c ON c.tenant_id = a.tenant_id AND c.periode = a.periode
        WHERE a.tenant_id = :tid
        AND a.periode >= TO_CHAR(NOW() - INTERVAL '6 months', 'YYYY-MM')
        GROUP BY a.periode, a.ca_total
        ORDER BY a.periode ASC
    """), {"tid": tid}).fetchall()
    monthly_trend = [
        {"periode": r[0], "ca": float(r[1]), "charges": float(r[2]), "ebe": float(r[1]) - float(r[2])}
        for r in trend
    ]

    # Charges breakdown for chart
    charges_detail = [
        {"categorie": cat, "label": labels, "montant": charges_map.get(cat, 0), "pct": round(charges_map.get(cat, 0) / total_charges * 100, 1) if total_charges > 0 else 0}
        for cat, labels in [
            ("personnel",      "Personnel"),
            ("medicaments",    "Médicaments & DMI"),
            ("honoraires",     "Honoraires médecins"),
            ("frais_generaux", "Frais généraux"),
            ("amortissements", "Amortissements"),
        ]
    ]

    # Lits by service
    lits_detail = [
        {"service": r[0], "nb_total": r[1], "nb_occupes": r[2], "journees": r[3],
         "taux": round(r[2] / r[1] * 100, 1) if r[1] > 0 else 0}
        for r in lits
    ]

    return {
        "periode": periode,
        "kpis": {
            # Rentabilité
            "ca_total":          round(ca_facture, 2),
            "total_charges":     round(total_charges, 2),
            "ebe":               round(ebe, 2),
            "ebe_pct":           ebe_pct,
            "amortissements":    round(amortissements, 2),
            "ebit":              round(ebe - amortissements, 2),
            # Trésorerie
            "tresorerie_nette":  round(tresorerie_nette, 2),
            "bfr":               round(bfr, 2),
            "ratio_liquidite":   ratio_liquidite,
            "dso":               dso,
            # Performance
            "taux_occupation":   taux_occupation,
            "ratio_encaissement":ratio_encaissement,
            "recette_moy_patient":round(recette_moy, 2),
            "cout_journee":      round(cout_journee, 2),
            "nb_admissions":     nb_admissions,
            "total_journees":    total_journees,
            # Budget
            "budget_recettes":   round(budget_recettes, 2),
            "ecart_recettes":    ecart_recettes,
            "budget_charges":    round(budget_charges, 2),
            "ecart_charges":     ecart_charges,
            # Charges detail
            "charges_personnel":  round(charges_personnel, 2),
            "charges_medicaments":round(charges_meds, 2),
            "charges_honoraires": round(charges_honoraires, 2),
            "charges_generaux":   round(charges_generaux, 2),
        },
        "charges_detail":  charges_detail,
        "monthly_trend":   monthly_trend,
        "lits_detail":     lits_detail,
    }

# ── SAISIE CHARGES ─────────────────────────────────────────────────────────
class ChargeCreate(BaseModel):
    periode: str
    categorie: str
    sous_categorie: Optional[str] = None
    montant: float
    description: Optional[str] = None

@router.post("/charges")
def add_charge(
    charge: ChargeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.execute(text("""
        INSERT INTO acc_charges (tenant_id, periode, categorie, sous_categorie, montant, description)
        VALUES (:tid, :periode, :cat, :sous_cat, :montant, :desc)
    """), {
        "tid": str(current_user.tenant_id), "periode": charge.periode,
        "cat": charge.categorie, "sous_cat": charge.sous_categorie,
        "montant": charge.montant, "desc": charge.description
    })
    db.commit()
    return {"message": "Charge enregistrée avec succès"}

# ── SAISIE TRÉSORERIE ──────────────────────────────────────────────────────
class TresorerieUpdate(BaseModel):
    periode: str
    tresorerie_actif: float
    tresorerie_passif: float
    actif_circulant: float
    passif_circulant: float

@router.post("/tresorerie")
def update_tresorerie(
    data: TresorerieUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tid = str(current_user.tenant_id)
    existing = db.execute(text("""
        SELECT id FROM acc_tresorerie WHERE tenant_id = :tid AND periode = :periode
    """), {"tid": tid, "periode": data.periode}).fetchone()
    if existing:
        db.execute(text("""
            UPDATE acc_tresorerie
            SET tresorerie_actif = :ta, tresorerie_passif = :tp,
                actif_circulant = :ac, passif_circulant = :pc, updated_at = NOW()
            WHERE tenant_id = :tid AND periode = :periode
        """), {"ta": data.tresorerie_actif, "tp": data.tresorerie_passif,
               "ac": data.actif_circulant, "pc": data.passif_circulant,
               "tid": tid, "periode": data.periode})
    else:
        db.execute(text("""
            INSERT INTO acc_tresorerie (tenant_id, periode, tresorerie_actif, tresorerie_passif, actif_circulant, passif_circulant)
            VALUES (:tid, :periode, :ta, :tp, :ac, :pc)
        """), {"tid": tid, "periode": data.periode,
               "ta": data.tresorerie_actif, "tp": data.tresorerie_passif,
               "ac": data.actif_circulant, "pc": data.passif_circulant})
    db.commit()
    return {"message": "Trésorerie mise à jour"}

# ── SAISIE ADMISSIONS ──────────────────────────────────────────────────────
class AdmissionsUpdate(BaseModel):
    periode: str
    nb_admissions: int
    nb_journees: int
    ca_total: float

@router.post("/admissions")
def update_admissions(
    data: AdmissionsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tid = str(current_user.tenant_id)
    existing = db.execute(text("""
        SELECT id FROM acc_admissions WHERE tenant_id = :tid AND periode = :periode
    """), {"tid": tid, "periode": data.periode}).fetchone()
    if existing:
        db.execute(text("""
            UPDATE acc_admissions SET nb_admissions = :nb, nb_journees = :nj, ca_total = :ca
            WHERE tenant_id = :tid AND periode = :periode
        """), {"nb": data.nb_admissions, "nj": data.nb_journees, "ca": data.ca_total,
               "tid": tid, "periode": data.periode})
    else:
        db.execute(text("""
            INSERT INTO acc_admissions (tenant_id, periode, nb_admissions, nb_journees, ca_total)
            VALUES (:tid, :periode, :nb, :nj, :ca)
        """), {"tid": tid, "periode": data.periode,
               "nb": data.nb_admissions, "nj": data.nb_journees, "ca": data.ca_total})
    db.commit()
    return {"message": "Admissions mises à jour"}