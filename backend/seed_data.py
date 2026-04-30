import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models import tenant, user, patient, claim
from app.database import SessionLocal
from app.models.patient import Patient
from app.models.claim import Claim
import uuid
from datetime import datetime

db = SessionLocal()

TENANT_ID = uuid.UUID("6cebb8dc-c371-4025-801f-212217b0d9ca")
PATIENT_YOUSSEF = uuid.UUID("ccfb9762-c7aa-4ca1-8039-3bb3ab09a08e")

# ── STEP 1: Insert patients first and commit immediately ─────
print("Inserting patients...")

p1 = Patient(id=uuid.uuid4(), tenant_id=TENANT_ID,
             full_name="Fatima Zahra Idrissi", cin="CD789012",
             phone="0662345678", insurance_type="CNOPS",
             insurance_number="CNOPS-2026-002", is_active=True)

p2 = Patient(id=uuid.uuid4(), tenant_id=TENANT_ID,
             full_name="Khalid Moussaoui", cin="EE345678",
             phone="0663456789", insurance_type="CNSS",
             insurance_number="CNSS-2026-003", is_active=True)

p3 = Patient(id=uuid.uuid4(), tenant_id=TENANT_ID,
             full_name="Amina Tazi", cin="FF901234",
             phone="0664567890", insurance_type="AMO",
             insurance_number="AMO-2026-004", is_active=True)

p4 = Patient(id=uuid.uuid4(), tenant_id=TENANT_ID,
             full_name="Omar Benkirane", cin="GG567890",
             phone="0665678901", insurance_type="RAMED",
             insurance_number="RAMED-2026-005", is_active=True)

db.add_all([p1, p2, p3, p4])
db.commit()  # Save patients to Supabase FIRST

# Refresh to confirm IDs are saved
db.refresh(p1)
db.refresh(p2)
db.refresh(p3)
db.refresh(p4)

print(f"  + {p1.full_name} — {p1.id}")
print(f"  + {p2.full_name} — {p2.id}")
print(f"  + {p3.full_name} — {p3.id}")
print(f"  + {p4.full_name} — {p4.id}")
print("Patients saved.\n")

# ── STEP 2: Now insert claims ────────────────────────────────
print("Inserting claims...")

new_claims = [
    # Youssef — AMO
    Claim(id=uuid.uuid4(), tenant_id=TENANT_ID, patient_id=PATIENT_YOUSSEF,
          claim_number="CLM-2026-002", amount=3200.0, insurance_type="AMO",
          service_type="radiologie", service_date=datetime(2026, 4, 28),
          status="approved"),
    Claim(id=uuid.uuid4(), tenant_id=TENANT_ID, patient_id=PATIENT_YOUSSEF,
          claim_number="CLM-2026-003", amount=850.0, insurance_type="AMO",
          service_type="laboratoire", service_date=datetime(2026, 4, 27),
          status="rejected", rejection_reason="Document manquant"),

    # Fatima — CNOPS
    Claim(id=uuid.uuid4(), tenant_id=TENANT_ID, patient_id=p1.id,
          claim_number="CLM-2026-004", amount=5500.0, insurance_type="CNOPS",
          service_type="chirurgie", service_date=datetime(2026, 4, 25),
          status="approved"),
    Claim(id=uuid.uuid4(), tenant_id=TENANT_ID, patient_id=p1.id,
          claim_number="CLM-2026-005", amount=1200.0, insurance_type="CNOPS",
          service_type="consultation", service_date=datetime(2026, 4, 24),
          status="rejected", rejection_reason="Code acte incorrect"),
    Claim(id=uuid.uuid4(), tenant_id=TENANT_ID, patient_id=p1.id,
          claim_number="CLM-2026-006", amount=2100.0, insurance_type="CNOPS",
          service_type="kinesitherapie", service_date=datetime(2026, 4, 23),
          status="pending"),

    # Khalid — CNSS
    Claim(id=uuid.uuid4(), tenant_id=TENANT_ID, patient_id=p2.id,
          claim_number="CLM-2026-007", amount=4800.0, insurance_type="CNSS",
          service_type="hospitalisation", service_date=datetime(2026, 4, 22),
          status="approved"),
    Claim(id=uuid.uuid4(), tenant_id=TENANT_ID, patient_id=p2.id,
          claim_number="CLM-2026-008", amount=950.0, insurance_type="CNSS",
          service_type="consultation", service_date=datetime(2026, 4, 21),
          status="rejected", rejection_reason="Délai de soumission dépassé"),
    Claim(id=uuid.uuid4(), tenant_id=TENANT_ID, patient_id=p2.id,
          claim_number="CLM-2026-009", amount=1750.0, insurance_type="CNSS",
          service_type="radiologie", service_date=datetime(2026, 4, 20),
          status="pending"),

    # Amina — AMO
    Claim(id=uuid.uuid4(), tenant_id=TENANT_ID, patient_id=p3.id,
          claim_number="CLM-2026-010", amount=6200.0, insurance_type="AMO",
          service_type="chirurgie", service_date=datetime(2026, 4, 18),
          status="approved"),
    Claim(id=uuid.uuid4(), tenant_id=TENANT_ID, patient_id=p3.id,
          claim_number="CLM-2026-011", amount=430.0, insurance_type="AMO",
          service_type="laboratoire", service_date=datetime(2026, 4, 17),
          status="approved"),
    Claim(id=uuid.uuid4(), tenant_id=TENANT_ID, patient_id=p3.id,
          claim_number="CLM-2026-012", amount=1100.0, insurance_type="AMO",
          service_type="consultation", service_date=datetime(2026, 4, 16),
          status="rejected", rejection_reason="Assuré non éligible"),

    # Omar — RAMED
    Claim(id=uuid.uuid4(), tenant_id=TENANT_ID, patient_id=p4.id,
          claim_number="CLM-2026-013", amount=2900.0, insurance_type="RAMED",
          service_type="hospitalisation", service_date=datetime(2026, 4, 15),
          status="approved"),
    Claim(id=uuid.uuid4(), tenant_id=TENANT_ID, patient_id=p4.id,
          claim_number="CLM-2026-014", amount=780.0, insurance_type="RAMED",
          service_type="consultation", service_date=datetime(2026, 4, 14),
          status="rejected", rejection_reason="Document manquant"),
    Claim(id=uuid.uuid4(), tenant_id=TENANT_ID, patient_id=p4.id,
          claim_number="CLM-2026-015", amount=1650.0, insurance_type="RAMED",
          service_type="radiologie", service_date=datetime(2026, 4, 13),
          status="pending"),
]

db.add_all(new_claims)
db.commit()

for c in new_claims:
    print(f"  + {c.claim_number} | {c.insurance_type} | {c.amount} MAD | {c.status}")

print(f"\nDone. {len(new_claims)} claims inserted.")
print("Database now contains 5 patients and 15 claims total.")
db.close()