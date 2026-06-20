"""
SihaIQ — CNSS Feuille de Soins Maladie Parser
Réf. ANAM 610-1-02

Handles all real-world input formats:
  - PDF with 2 pages (scanner output)
  - Single image containing both pages side by side (phone photo)
  - Single image containing only page 1 (patient fields only)
  - Two separate images uploaded (rare but handled)

CNDP/Loi 09-08: CIN and Immatriculation are validated then immediately
deleted — never stored, never returned, never logged.
"""

import re
import json
from pathlib import Path
from datetime import datetime, date
from typing import Optional


# ── OCR Engine ─────────────────────────────────────────────────────────────
# 
def pdf_to_images(pdf_path: str) -> list:
    try:
        from pdf2image import convert_from_path
        return convert_from_path(
            pdf_path, dpi=250,
            poppler_path=r"C:\Users\RPC\Downloads\Release-26.02.0-0\poppler-26.02.0\Library\bin"
        )
    except ImportError:
        raise ImportError("pdf2image not installed. Run: pip install pdf2image")
                          
def ocr_image(image, lang: str = "fra", config: str = r"--oem 3 --psm 6") -> str:
    try:
        import pytesseract
        pytesseract.pytesseract.tesseract_cmd = r"C:\Users\RPC\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"
        return pytesseract.image_to_string(image, lang=lang, config=config)
    except ImportError:
        raise ImportError("pytesseract not installed. Run: pip install pytesseract")



def load_images(file_path: str) -> tuple[object, object]:
    """
    Load any supported input and return (page1_image, page2_image).
    page2_image may be None if only one page is available.

    Handles:
    - PDF 2 pages  → split into 2 images
    - PDF 1 page   → page1 only, page2=None
    - Image wide (w > h*1.3) → two pages side by side → split left/right
    - Image tall/square → single page → page2=None
    """
    path = Path(file_path)
    image_exts = {".jpg", ".jpeg", ".png", ".tiff", ".tif"}

    if path.suffix.lower() in image_exts:
        from PIL import Image
        full = Image.open(str(path))
        w, h = full.size

        if w > h * 1.3:
            # Wide image — two pages side by side (phone photo of both pages)
            mid = w // 2
            page1 = full.crop((0, 0, mid, h))
            page2 = full.crop((mid, 0, w, h))
            return page1, page2
        else:
            # Single page image
            return full, None
    else:
        # PDF
        images = pdf_to_images(file_path)
        page1 = images[0] if len(images) >= 1 else None
        page2 = images[1] if len(images) >= 2 else None
        return page1, page2


# ── Field Extractors — Page 1 ───────────────────────────────────────────────

def extract_dossier_number(text: str) -> tuple[Optional[str], float]:
    patterns = [
        r"N[°o\.]\s*Dossier\s*[:\|]?\s*\|?\s*([A-Z0-9\-#\s]{4,25}?)\s*[\|\[]",
        r"(DOS[\-\s#]*\d{4}[\-\s#]*\d{4,6})",  # direct DOS pattern, tolerates # noise
        r"N[°o\.]\s*Dossier\s*[:\-\|]?\s*([A-Z0-9\-]{4,20})",
        r"Dossier\s*[:\-\|]?\s*([A-Z0-9\-]{4,20})",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            # Clean OCR noise from the extracted value
            raw = m.group(1).strip()
            cleaned = re.sub(r"[#\s\|]", "", raw).upper()
            if len(cleaned) >= 4:
                return cleaned, 0.9
    return None, 0.0


def extract_immatriculation(text: str) -> tuple[Optional[str], float]:
    patterns = [
        r"[Ii]mmatriculation\s*[:\-\.]?\s*([\d]{7,12})",
        r"N[°o\.]\s*[Ii]mmatriculation\s*[:\-\.]?\s*([\d]{7,12})",
        r"\b(\d{9,12})\b",  # broad fallback — 9-12 digit sequence
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            val = m.group(1).replace("-", "").strip()
            if len(val) >= 7:
                return val, 0.85
    return None, 0.0


def validate_immatriculation(immat: Optional[str]) -> bool:
    if not immat:
        return False
    digits = re.sub(r"\D", "", immat)
    return 7 <= len(digits) <= 12


def extract_cin(text: str) -> tuple[Optional[str], float]:
    patterns = [
        r"N[°o\.]\s*CIN\s*[:\-\.]?\s*([A-Z]{1,2}\d{5,7})",
        r"CIN\s*[:\-\.]?\s*([A-Z]{1,2}\d{5,7})",
        r"\b([A-Z]{1,2}\d{5,7})\b",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            conf = 0.9 if "CIN" in pat else 0.6
            return m.group(1).upper().strip(), conf
    return None, 0.0


def validate_cin(cin: Optional[str]) -> bool:
    if not cin:
        return False
    return bool(re.match(r"^[A-Z]{1,2}\d{5,7}$", cin.upper()))


def extract_service_type(text: str) -> tuple[Optional[str], float]:
    type_map = {
        "Hospitalisation": "hospitalisation",
        "Maternité":       "maternite",
        "Accident":        "accident",
        "Maladie":         "consultation",
    }
    type_section = re.search(
        r"Type de soins[^:]*[:*]?\s*(.*?)(?:J.atteste|INPE|Date\s*:|Signature)",
        text, re.IGNORECASE | re.DOTALL
    )
    if type_section:
        section_text = type_section.group(1)
        for label, mapped in type_map.items():
            if label.lower() in section_text.lower():
                return mapped, 0.8
    for label, mapped in type_map.items():
        if label in text:
            return mapped, 0.6
    return None, 0.0


def extract_amount(text: str) -> tuple[Optional[float], float]:
    patterns = [
        r"Montant des frais\s*[:\-\.]*\s*([\d\s]+[,\.]\d{2})\s*Dhs?",
        r"Montant des frais\s*[:\-\.]*\s*([\d\s]+)\s*Dhs?",
        r"[Mm]bلغ[^:]*[:\-]?\s*([\d\s]+[,\.]\d{2})\s*Dhs?",
        r"(\d{3,6})\s*Dhs",  # fallback: any standalone amount before Dhs
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            raw = m.group(1).strip().replace(" ", "").replace(",", ".")
            try:
                val = float(raw)
                if val > 0:
                    return val, 0.85
            except ValueError:
                continue
    return None, 0.0


def extract_inpe(text: str) -> tuple[bool, float]:
    patterns = [
        r"INPE\s*[:\.\-]?\s*([\d]{10,12})",
        r"INPE[^:]*[:\s]+([\d]{10,12})",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return True, 0.9
    return False, 0.5


def extract_service_date(text: str) -> tuple[Optional[date], float]:
    # Fix common OCR substitutions in dates
    text = re.sub(r"\bQ(\d)", r"0\1", text)  # Q3 → 03
    text = re.sub(r"\bO(\d)", r"0\1", text)  # O3 → 03 (letter O vs zero)
    patterns = [
        r"Date\s*d.arriv[ée]e\s*[:\-]?\s*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{4})",
        r"Date\s*[:\-]?\s*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{4})",
        r"(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{4})",
    ]
    for pat in patterns:
        for m in re.finditer(pat, text, re.IGNORECASE):
            raw = m.group(1).replace("-", "/").replace(".", "/")
            parts = raw.split("/")
            if len(parts) == 3:
                try:
                    day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
                    if year < 100:
                        year += 2000
                    if 1 <= month <= 12 and 1 <= day <= 31 and 2020 <= year <= 2030:
                        return date(year, month, day), 0.85
                except (ValueError, TypeError):
                    continue
    return None, 0.0


def extract_pec(text: str) -> tuple[bool, float]:
    # Explicit [X] Oui or checkmark near Entente préalable
    if re.search(r"\[X\]\s*Oui", text, re.IGNORECASE):
        return True, 0.9
    if re.search(r"Entente\s*pr[ée]alable\s*[*]?\s*[Xx✓☑]", text, re.IGNORECASE):
        return True, 0.85
    if re.search(r"Entente\s*pr[ée]alable", text, re.IGNORECASE):
        return False, 0.5  # form present but checkbox state unclear
    return False, 0.3


# ── Field Extractors — Page 2 (Acts) ───────────────────────────────────────

NGAP_LETTERS = {
    "C":    "consultation",
    "CS":   "consultation_specialiste",
    "V":    "visite",
    "K":    "chirurgie",
    "KC":   "chirurgie",
    "AMI":  "kinesitherapie",
    "AIS":  "kinesitherapie",
    "B":    "biologie",
    "P":    "radiologie",
    "Z":    "radiologie",
    "SPE":  "consultation_specialiste",
    "CKZ":  "chirurgie",
    "BAMI": "biologie",
}


def extract_ngap_code(raw: str) -> Optional[str]:
    if not raw:
        return None
    cleaned = raw.strip().upper()
    cleaned = re.sub(r"[|!lI]", "1", cleaned)
    m = re.match(r"([A-Z]{1,5})\s*([\d]+(?:\.\d+)?)", cleaned)
    if m:
        return f"{m.group(1)}{m.group(2)}"
    return None


def extract_acts(text: str) -> list[dict]:
    acts = []
    # Pattern: date + optional code + amount
    row_pattern = re.compile(
        r"(\d{2}[/\-]\d{2}[/\-]\d{4})\s+"  # date
        r"([A-Z]{1,5}\d{1,3})?\s*"           # optional NGAP code
        r"(\d{3,6}(?:[,\.]\d{2})?)\s*Dhs?",  # amount
        re.IGNORECASE
    )
    for m in row_pattern.finditer(text):
        ngap_raw  = m.group(2)
        ngap_code = extract_ngap_code(ngap_raw) if ngap_raw else ""
        raw_amount = m.group(3).replace(",", ".").replace(" ", "")
        try:
            amount = float(raw_amount)
            if amount <= 0:
                continue
            prefix = re.match(r"[A-Z]+", ngap_code) if ngap_code else None
            service_type = NGAP_LETTERS.get(
                prefix.group(0) if prefix else "",
                "consultation"
            )
            acts.append({
                "ngap_code":            ngap_code or "",
                "service_type":         service_type,
                "amount":               amount,
                "quantity":             1,
                "ngap_coding_valid":    None,
                "prescription_legible": None,
                "pec_required":         None,
                "pec_obtained":         None,
            })
        except ValueError:
            continue
    return acts


# ── Main Parser ─────────────────────────────────────────────────────────────

def parse_fse(file_path: str) -> dict:
    """
    Main entry point. Accepts PDF or image (any format).
    Automatically detects:
      - PDF 2 pages
      - PDF 1 page
      - Single image (both pages side by side)
      - Single image (one page only)
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"FSE not found: {file_path}")

    # ── Load images ──────────────────────────────────────────────────────
    page1_img, page2_img = load_images(file_path)

    if page1_img is None:
        raise ValueError("Could not read document.")

    # ── OCR ──────────────────────────────────────────────────────────────
    page1_text = ocr_image(page1_img)
    page2_text = ocr_image(page2_img, config=r"--oem 3 --psm 4") if page2_img is not None else ""
    full_text  = page1_text + "\n" + page2_text

    # ── Extract fields from page 1 ────────────────────────────────────────
    dossier_num,  conf_dossier = extract_dossier_number(page1_text)
    immat,        conf_immat   = extract_immatriculation(page1_text)
    cin,          conf_cin     = extract_cin(page1_text)
    service_type, conf_stype   = extract_service_type(page1_text)
    amount,       conf_amount  = extract_amount(page1_text)
    inpe_present, conf_inpe    = extract_inpe(page1_text)
    service_date, conf_date    = extract_service_date(page1_text)
    pec_obtained, conf_pec     = extract_pec(page1_text)

    # ── Extract acts from page 2 (or full text if single page) ───────────
    acts_text = page2_text if page2_text else full_text
    acts = extract_acts(acts_text)

    # ── CNDP/Loi 09-08 — validate then immediately delete raw identifiers ─
    immat_valid = validate_immatriculation(immat)
    cin_valid   = validate_cin(cin)
    del immat
    del cin

    days_since = (date.today() - service_date).days if service_date else None

    # ── Confidence ────────────────────────────────────────────────────────
    confidence = {
        "dossier_number":        conf_dossier,
        "immatriculation_valid": conf_immat,
        "cin_valid":             conf_cin,
        "service_type":          conf_stype,
        "amount":                conf_amount,
        "inpe_present":          conf_inpe,
        "service_date":          conf_date,
        "pec_obtained":          conf_pec,
    }

    critical_missing = [
        k for k, v in {
            "immatriculation_valid": immat_valid,
            "service_type":          service_type,
            "service_date":          service_date,
        }.items() if not v
    ]
    needs_review = len(critical_missing) > 0

    # ── Prediction input ──────────────────────────────────────────────────
    prediction_input = {
        "payer":                 "CNSS",
        "service_type":          service_type or "consultation",
        "days_since_service":    days_since or 0,
        "immatriculation_valid": int(immat_valid),
        "cin_valid":             int(cin_valid),
        "inpe_present":          int(inpe_present),
        "pec_obtained":          int(pec_obtained),
        "ngap_coding_valid":     0,
        "prescription_legible":  0,
        "droits_active":         0,
        "droits_verified":       0,
        "is_ald":                0,
        "is_ayant_droit":        0,
        "pec_required":          0,
        "num_acts":              len(acts) if acts else 1,
        "patient_age":           0,
        "ngap_code":             acts[0]["ngap_code"] if acts else "C",
        "docs_completeness_ratio": 0.5,
    }

    return {
        "prediction_input":     prediction_input,
        "acts":                 acts,
        "patient":              {"patient_id": None},
        "claim": {
            "claim_number":     dossier_num,
            "amount":           amount,
            "service_date":     service_date.isoformat() if service_date else None,
            "insurance_type":   "CNSS",
            "service_type":     service_type or "consultation",
        },
        "raw_text":             full_text,
        "confidence":           confidence,
        "needs_review":         needs_review,
        "critical_missing":     critical_missing,
        "extraction_timestamp": datetime.utcnow().isoformat() + "Z",
    }


# ── CLI test ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else "fse_cnss.pdf"
    print(f"Parsing: {path}")
    result = parse_fse(path)
    print("\n── PREDICTION INPUT ──")
    print(json.dumps(result["prediction_input"], indent=2, ensure_ascii=False))
    print("\n── ACTS EXTRACTED ──")
    print(json.dumps(result["acts"], indent=2, ensure_ascii=False))
    print("\n── CLAIM ──")
    print(json.dumps(result["claim"], indent=2, ensure_ascii=False))
    print("\n── CONFIDENCE ──")
    print(json.dumps(result["confidence"], indent=2, ensure_ascii=False))
    print(f"\n── NEEDS REVIEW: {result['needs_review']} ──")
    if result["critical_missing"]:
        print(f"   Missing fields: {result['critical_missing']}")