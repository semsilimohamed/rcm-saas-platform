"""
app/services/fse_parser.py - Extraction OCR d'un dossier d'hospitalisation.
Aligne sur le modele SihaIQ v2 (5 features reelles).

Principe : l'OCR PROPOSE, l'agent VALIDE.
Les champs non detectes sont renvoyes vides (None) - l'agent les complete
dans l'ecran de verification. On ne predit jamais sur du vide silencieux.

Le document scanne n'est jamais conserve : le fichier temporaire est supprime
par l'appelant (claims.py) immediatement apres lecture. Conforme CNDP / Loi 09-08.
"""
import os
import re
import tempfile
from datetime import datetime
from pathlib import Path

import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
from pdf2image import convert_from_path
from PIL import Image


# -- OCR : lecture du texte brut --------------------------------------------

def _ocr_text(file_path: str) -> str:
    """Extrait le texte brut d'un PDF ou d'une image via Tesseract (francais)."""
    ext = Path(file_path).suffix.lower()
    text_parts = []

    if ext == ".pdf":
        pages = convert_from_path(file_path, dpi=300)
        for page in pages:
            text_parts.append(pytesseract.image_to_string(page, lang="fra"))
    else:
        img = Image.open(file_path)
        text_parts.append(pytesseract.image_to_string(img, lang="fra"))

    return "\n".join(text_parts)


# -- Detection des champs ----------------------------------------------------

_PAYERS = {
    "CNOPS": ["cnops"],
    "CNSS": ["cnss", "amo", "amo tadamon"],
    "FAR": ["far", "forces armees", "forces armees"],
}

_DATE_PATTERNS = [
    r'(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})',
    r'(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})',
]

_PART_KEYWORDS = [
    "part patient", "ticket moderateur", "ticket moderateur",
    "reste a charge", "reste a charge", "part adherent", "part adherent",
    "a la charge",
]

_TOTAL_KEYWORDS = ["total", "montant total", "net a payer", "montant"]


def _detect_organisme(text: str):
    low = text.lower()
    for payer, keys in _PAYERS.items():
        if any(k in low for k in keys):
            return payer
    return None


def _find_dates_in(line: str):
    out = []
    for pat in _DATE_PATTERNS:
        for m in re.finditer(pat, line):
            g = m.groups()
            try:
                if len(g[0]) == 4:
                    out.append(datetime(int(g[0]), int(g[1]), int(g[2])))
                else:
                    out.append(datetime(int(g[2]), int(g[1]), int(g[0])))
            except ValueError:
                continue
    return out


def _extract_sejour(text: str):
    """Retourne (date_entree, date_sortie, duree_sejour) - None si indetectable."""
    d_in = d_out = None
    for line in text.split("\n"):
        low = line.lower()
        dates = _find_dates_in(line)
        if not dates:
            continue
        if any(k in low for k in ["entr", "admission", "adm.", "debut"]):
            d_in = dates[0]
        if any(k in low for k in ["sortie", "sort.", "fin sejour", "fin de sejour"]):
            d_out = dates[0]

    all_dates = sorted({d for line in text.split("\n") for d in _find_dates_in(line)})
    if not d_in and all_dates:
        d_in = all_dates[0]
    if not d_out and all_dates:
        d_out = all_dates[-1]

    duree = None
    if d_in and d_out:
        duree = max((d_out - d_in).days, 1)
    return d_in, d_out, duree


def _parse_number(raw: str):
    raw = raw.replace(" ", "").replace("\u00a0", "")
    if "," in raw and "." in raw:
        raw = raw.replace(".", "").replace(",", ".")
    elif "," in raw:
        raw = raw.replace(",", ".")
    try:
        return float(re.sub(r"[^\d.]", "", raw))
    except ValueError:
        return None


def _extract_montant_total(text: str):
    """Le plus grand montant proche d'un mot-cle 'total', sinon le plus grand montant."""
    candidates = []
    for line in text.split("\n"):
        low = line.lower()
        nums = re.findall(r'\d[\d\s.,]*\d|\d', line)
        parsed = [n for n in (_parse_number(x) for x in nums) if n and n > 0]
        if not parsed:
            continue
        if any(k in low for k in _TOTAL_KEYWORDS):
            candidates.extend(parsed)
    if candidates:
        return max(candidates)
    all_nums = [n for line in text.split("\n")
                for n in (_parse_number(x) for x in re.findall(r'\d[\d\s.,]*\d|\d', line))
                if n and n > 0]
    return max(all_nums) if all_nums else None


def _extract_part_patient(text: str, montant_total):
    if not montant_total:
        return None
    for line in text.split("\n"):
        low = line.lower()
        if any(k in low for k in _PART_KEYWORDS):
            for n in re.findall(r'\d[\d\s.,]*\d|\d', line):
                val = _parse_number(n)
                if val and 0 < val < montant_total:
                    return val
    return None


# -- Entree principale -------------------------------------------------------

def parse_fse(file_path: str) -> dict:
    """
    Lit un dossier d'hospitalisation scanne et extrait les 5 features du modele.
    Retour : dict pret pour l'ecran de verification (l'agent complete les manquants).
    """
    text = _ocr_text(file_path)

    organisme = _detect_organisme(text)
    d_in, d_out, duree = _extract_sejour(text)
    montant = _extract_montant_total(text)
    part_patient = _extract_part_patient(text, montant)

    part_organisme = None
    if part_patient and montant:
        part_organisme = round(min(max(1 - (part_patient / montant), 0.0), 1.0), 2)

    mois = d_out.month if d_out else (d_in.month if d_in else None)

    missing = []
    if not organisme:          missing.append("organisme")
    if duree is None:          missing.append("duree_sejour")
    if part_organisme is None: missing.append("part_organisme")
    if not montant:            missing.append("montant_total")
    if not mois:               missing.append("mois")

    return {
        "extracted": {
            "organisme": organisme,
            "date_entree": d_in.strftime("%Y-%m-%d") if d_in else None,
            "date_sortie": d_out.strftime("%Y-%m-%d") if d_out else None,
            "duree_sejour": duree,
            "montant_total": montant,
            "part_patient": part_patient,
            "part_organisme": part_organisme,
            "mois": mois,
        },
        "missing": missing,
        "needs_review": len(missing) > 0,
        "raw_text_preview": text[:600],
    }