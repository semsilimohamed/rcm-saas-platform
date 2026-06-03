from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import io

router = APIRouter(prefix="/bordereau", tags=["Bordereau"])

class BordereauRequest(BaseModel):
    tenant_id: str
    claim_ids: List[str]
    payer: str
    hospital_name: Optional[str] = "Etablissement de sante"
    hospital_address: Optional[str] = ""
    hospital_city: Optional[str] = ""
    hospital_phone: Optional[str] = ""

@router.post("/generate")
def generate_bordereau(req: BordereauRequest, db: Session = Depends(get_db)):
    if not req.claim_ids:
        raise HTTPException(status_code=400, detail="Aucun dossier selectionne.")
    placeholders = ",".join([f"'{cid}'" for cid in req.claim_ids])
    result = db.execute(text(f"""
        SELECT c.claim_number, p.full_name, c.insurance_type,
               c.service_type, c.service_date, c.amount,
               c.status, c.forclusion_deadline
        FROM claims c
        JOIN patients p ON c.patient_id = p.id
        WHERE c.id IN ({placeholders})
        AND c.tenant_id = :tenant_id
        ORDER BY c.service_date ASC
    """), {"tenant_id": req.tenant_id})
    rows = result.fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="Aucun dossier trouve.")
    from fpdf import FPDF
    bordereau_num = "BRD-" + datetime.now().strftime("%Y%m%d-%H%M%S")
    total_amount = sum(row[5] for row in rows)
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M")
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_fill_color(15, 98, 254)
    pdf.rect(0, 0, 210, 28, "F")
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(255, 255, 255)
    pdf.set_xy(10, 8)
    pdf.cell(0, 10, "SihaIQ RCM", ln=False)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_xy(10, 18)
    pdf.cell(0, 6, "Bordereau de transmission des dossiers de remboursement")
    pdf.set_text_color(30, 30, 30)
    pdf.set_xy(10, 34)
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "BORDEREAU N " + bordereau_num, ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_x(10)
    pdf.cell(0, 6, "Date emission : " + now_str, ln=True)
    pdf.set_x(10)
    pdf.cell(0, 6, "Caisse : " + req.payer, ln=True)
    pdf.set_x(10)
    pdf.cell(0, 6, "Dossiers : " + str(len(rows)), ln=True)
    pdf.set_x(10)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "Total : " + f"{total_amount:,.2f}" + " MAD", ln=True)
    pdf.set_xy(120, 34)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, req.hospital_name, ln=True)
    if req.hospital_city:
        pdf.set_x(120)
        pdf.cell(0, 5, req.hospital_city, ln=True)
    if req.hospital_phone:
        pdf.set_x(120)
        pdf.cell(0, 5, "Tel : " + req.hospital_phone, ln=True)
    pdf.set_fill_color(240, 244, 250)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(80, 80, 80)
    pdf.set_xy(10, 82)
    col_widths = [8, 32, 44, 22, 27, 28, 27]
    headers = ["N", "N Dossier", "Patient", "Caisse", "Type", "Montant", "Echeance"]
    for w, h in zip(col_widths, headers):
        pdf.cell(w, 7, h, border=1, fill=True, align="C")
    pdf.ln()
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(30, 30, 30)
    for idx, row in enumerate(rows):
        claim_num, patient, payer_val, service_type, service_date, amount, status, forclusion = row
        fill = idx % 2 == 0
        if fill:
            pdf.set_fill_color(248, 251, 255)
        else:
            pdf.set_fill_color(255, 255, 255)
        fd = forclusion.strftime("%d/%m/%Y") if forclusion else "-"
        pt = patient[:20] if len(patient) > 20 else patient
        row_data = [str(idx+1), claim_num[:16], pt, payer_val, service_type[:15], f"{amount:,.0f}", fd]
        aligns = ["C","L","L","C","C","R","C"]
        for w, cell, align in zip(col_widths, row_data, aligns):
            pdf.cell(w, 6, cell, border=1, fill=fill, align=align)
        pdf.ln()
    pdf.set_fill_color(15, 98, 254)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 9)
    tw = sum(col_widths[:5])
    pdf.cell(tw, 7, "TOTAL " + str(len(rows)) + " dossiers", border=1, fill=True, align="R")
    pdf.cell(col_widths[5], 7, f"{total_amount:,.0f}", border=1, fill=True, align="R")
    pdf.cell(col_widths[6], 7, "", border=1, fill=True)
    pdf.ln(12)
    pdf.set_text_color(30, 30, 30)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_x(10)
    pdf.cell(85, 6, "Cachet etablissement", border=0)
    pdf.set_x(115)
    pdf.cell(85, 6, "Cachet " + req.payer, border=0, ln=True)
    pdf.rect(10, pdf.get_y()+2, 85, 28)
    pdf.rect(115, pdf.get_y()+2, 85, 28)
    pdf.ln(35)
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(150, 150, 150)
    pdf.set_x(10)
    pdf.cell(0, 5, "SihaIQ RCM " + bordereau_num + " " + now_str, align="C")
    pdf_bytes = pdf.output()
    return StreamingResponse(
        io.BytesIO(bytes(pdf_bytes)),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=" + bordereau_num + ".pdf"}
    )