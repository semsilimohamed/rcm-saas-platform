"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function seedDemoData() {
    setLoading(true);
    setError("");
    try {
      const token    = localStorage.getItem("sihaiq_token");
      const tenantId = localStorage.getItem("sihaiq_tenant_id");

      // Seed demo patients
      const patients = [
        { full_name: "Youssef Benali",    cin: "BE123456", insurance_type: "CNOPS" },
        { full_name: "Fatima Zahra Idrissi", cin: "BK234567", insurance_type: "CNSS" },
        { full_name: "Ahmed Khalil",      cin: "BH345678", insurance_type: "AMO" },
        { full_name: "Khadija Alaoui",    cin: "BJ456789", insurance_type: "CNSS" },
        { full_name: "Omar Bennani",      cin: "BL567890", insurance_type: "CNOPS" },
        { full_name: "Nadia Tazi",        cin: "BM678901", insurance_type: "AMO-Tadamon" },
      ];

      const patientIds: string[] = [];
      for (const p of patients) {
        const res = await fetch(`${API_URL}/patients/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          patientIds.push(data.id);
        }
      }

      // Seed demo claims
      const services = ["Consultation", "Hospitalisation", "Chirurgie", "Radiologie", "Biologie"];
      const amounts  = [1500, 4200, 8500, 2100, 950, 3300, 6700, 1200, 5400, 2800];
      for (let i = 0; i < Math.min(patientIds.length, 10); i++) {
        const pid = patientIds[i % patientIds.length];
        const serviceDate = new Date();
        serviceDate.setDate(serviceDate.getDate() - Math.floor(Math.random() * 45));
        await fetch(`${API_URL}/claims`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            patient_id:     pid,
            claim_number:   `CLM-DEMO-${String(i + 1).padStart(3, "0")}`,
            insurance_type: patients[i % patients.length].insurance_type,
            service_type:   services[i % services.length],
            service_date:   serviceDate.toISOString().split("T")[0],
            amount:         amounts[i],
            status:         ["pending", "approved", "rejected"][i % 3],
          }),
        });
      }

      // Seed comptabilité data
      const periods = ["2026-06", "2026-05", "2026-04"];
      for (const periode of periods) {
        await fetch(`${API_URL}/comptabilite/charges`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ periode, categorie: "personnel", montant: 145000, sous_categorie: "Masse salariale" }),
        });
        await fetch(`${API_URL}/comptabilite/charges`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ periode, categorie: "medicaments", montant: 68000, sous_categorie: "Pharmacie" }),
        });
        await fetch(`${API_URL}/comptabilite/charges`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ periode, categorie: "honoraires", montant: 87000, sous_categorie: "Médecins" }),
        });
        await fetch(`${API_URL}/comptabilite/tresorerie`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ periode, tresorerie_actif: 187000, tresorerie_passif: 45000, actif_circulant: 312000, passif_circulant: 198000 }),
        });
        await fetch(`${API_URL}/comptabilite/admissions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({periode, nb_admissions: 187, nb_journees: 1410, ca_total: 487000 }),
        });
      }

      router.push("/onboarding");
    } catch {
      setError("Erreur lors de la création des données de démonstration. Réessayez.");
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Logo */}
        <div style={s.logo}>
          <div style={s.logoMark}>
            <svg width="18" height="18" viewBox="0 0 44 44" fill="none">
              <circle cx="22" cy="22" r="6" fill="white"/>
              <circle cx="22" cy="22" r="2.8" fill="#5B4FE8"/>
              <line x1="22" y1="7" x2="22" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="22" y1="30" x2="22" y2="37" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="7" y1="22" x2="14" y2="22" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="30" y1="22" x2="37" y2="22" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={s.logoText}>Siha<span style={{ color: "#5B4FE8" }}>IQ</span></span>
        </div>

        {/* Header */}
        <div style={s.header}>
          <div style={s.emoji}>🎉</div>
          <h1 style={s.title}>Bienvenue sur SihaIQ</h1>
          <p style={s.sub}>
            Votre compte est créé. Comment souhaitez-vous commencer ?
          </p>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        {/* Two options */}
        <div style={s.options}>

          {/* Option A: Demo data */}
          <div style={s.optionCard}>
            <div style={s.optionTitle}>Explorer avec des données de démonstration</div>
            <div style={s.optionDesc}>
              SihaIQ peuple votre compte avec des dossiers BAF, des patients et des données
              comptables réalistes. Explorez toutes les fonctionnalités immédiatement.
            </div>
            <div style={s.optionBadge}>Recommandé · 30 secondes</div>
            <button
              style={{ ...s.btnPrimary, opacity: loading ? 0.7 : 1 }}
              onClick={seedDemoData}
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  <span style={s.spinner}/>
                  Création des données...
                </span>
              ) : "Démarrer avec la démo →"}
            </button>
          </div>

          {/* Divider */}
          <div style={s.divider}>
            <div style={s.dividerLine}/>
            <span style={s.dividerText}>ou</span>
            <div style={s.dividerLine}/>
          </div>

          {/* Option B: Start fresh */}
          <div style={s.optionCardSecondary}>
            <div style={s.optionTitle}>Commencer avec mes propres données</div>
            <div style={s.optionDesc}>
              Accédez directement au tableau de bord et importez vos dossiers BAF
              via CSV ou saisie manuelle.
            </div>
            <button
              style={s.btnSecondary}
              onClick={() => router.push("/dashboard")}
              disabled={loading}
            >
              Aller au tableau de bord →
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p style={s.note}>
          Les données de démonstration peuvent être supprimées à tout moment depuis les Paramètres.
        </p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:  { minHeight: "100vh", background: "#F2F1EE", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" },
  card:  { background: "#fff", borderRadius: 20, padding: "40px 36px", maxWidth: 520, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.08)", border: "1px solid #E5E3DD" },

  logo:     { display: "flex", alignItems: "center", gap: 10, marginBottom: 32 },
  logoMark: { width: 32, height: 32, background: "#5B4FE8", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 18, fontWeight: 700, color: "#1A1814", letterSpacing: "-0.02em" },

  header:  { textAlign: "center", marginBottom: 32 },
  emoji:   { fontSize: 40, marginBottom: 12 },
  title:   { fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 28, fontWeight: 400, color: "#1A1814", marginBottom: 8 },
  sub:     { fontSize: 15, color: "#5C5852", lineHeight: 1.6, fontWeight: 300 },

  errorBox: { background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#991B1B", marginBottom: 16 },

  options: { display: "flex", flexDirection: "column", gap: 0 },

  optionCard: { background: "#EEEDFB", border: "1.5px solid #5B4FE8", borderRadius: 14, padding: "24px 22px", marginBottom: 0 },
  optionCardSecondary: { background: "#FAFAF7", border: "1px solid #E5E3DD", borderRadius: 14, padding: "24px 22px" },
  optionIcon:  { fontSize: 28, marginBottom: 10 },
  optionTitle: { fontSize: 15, fontWeight: 600, color: "#1A1814", marginBottom: 8 },
  optionDesc:  { fontSize: 13, color: "#5C5852", lineHeight: 1.65, marginBottom: 14, fontWeight: 300 },
  optionBadge: { display: "inline-block", fontSize: 10, fontWeight: 700, color: "#5B4FE8", background: "white", padding: "3px 10px", borderRadius: 20, marginBottom: 14, letterSpacing: "0.06em", textTransform: "uppercase" as const },

  btnPrimary:   { width: "100%", padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none", background: "#5B4FE8", color: "#fff", fontFamily: "inherit", boxShadow: "0 2px 12px rgba(91,79,232,0.3)" },
  btnSecondary: { width: "100%", padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", border: "1.5px solid #E5E3DD", background: "#fff", color: "#1A1814", fontFamily: "inherit" },

  divider:     { display: "flex", alignItems: "center", gap: 12, margin: "16px 0" },
  dividerLine: { flex: 1, height: 1, background: "#E5E3DD" },
  dividerText: { fontSize: 12, color: "#9C9890", fontWeight: 500 },

  spinner: { width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid white", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" },

  note: { fontSize: 11, color: "#9C9890", textAlign: "center", marginTop: 20, lineHeight: 1.5 },
};