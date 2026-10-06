"use client";

// Manual claim entry modal: NE number + the 5 model fields, posted to POST /claims/
// (the backend scores the claim). Shows the 0.40 decision threshold.

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface PredictionResult {
  risk_score: number | null;
  risk_level: string | null;
  rejection_cause_predicted: string | null;
  claim_number: string;
}

const SEUIL = 0.40; // recall-first : >= 0.40 => zone danger

/**
 * Modal form to create one claim by hand.
 * @param props.onClose - Close without saving.
 * @param props.onConfirm - Called after a claim was created (parent refreshes its list).
 */
export default function ManualClaimModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [result, setResult] = useState<PredictionResult | null>(null);

  const [form, setForm] = useState({
    ne_number: "",
    claim_number: "",
    insurance_type: "CNOPS",
    service_type: "consultation",
    service_date: new Date().toISOString().slice(0, 10),
    amount: "",
    duree_sejour: "",
    part_organisme: "",
  });

  async function handleSubmit() {
    setError("");
    if (!form.ne_number)      { setError("Le Numéro d'Entrée (NE) est obligatoire."); return; }
    if (!form.claim_number)   { setError("Le numéro de dossier est obligatoire."); return; }
    if (!form.amount)         { setError("Le montant est obligatoire."); return; }
    if (!form.duree_sejour)   { setError("La durée de séjour est obligatoire."); return; }
    if (!form.part_organisme) { setError("La part organisme est obligatoire."); return; }

    setSaving(true);
    const token = localStorage.getItem("sihaiq_token");
    try {
      const res = await fetch(`${API_URL}/claims/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ne_number: form.ne_number,
          claim_number: form.claim_number,
          amount: parseFloat(form.amount),
          insurance_type: form.insurance_type,
          service_type: form.service_type,
          service_date: form.service_date + "T00:00:00",
          duree_sejour: parseInt(form.duree_sejour, 10),
          part_organisme: parseFloat(form.part_organisme),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Erreur lors de la création du dossier.");
        return;
      }
      const data = await res.json();
      setResult({
        risk_score: data.risk_score,
        risk_level: data.risk_level,
        rejection_cause_predicted: data.rejection_cause_predicted,
        claim_number: data.claim_number,
      });
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setSaving(false);
    }
  }

  const isDanger = result?.risk_score != null && result.risk_score >= SEUIL;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.hdr}>
          <div style={s.title}>Nouveau dossier — saisie manuelle</div>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>

        {result ? (
          <div style={s.body}>
            <div style={{
              ...s.zoneBox,
              background: isDanger ? "#FEF2F2" : "#F0FDF4",
              border: `1px solid ${isDanger ? "#FCA5A5" : "#86EFAC"}`,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: isDanger ? "#991B1B" : "#166534" }}>
                {isDanger ? "ZONE DANGER" : "ZONE SÛRE"}
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: isDanger ? "#DC2626" : "#16A34A", margin: "8px 0" }}>
                {result.risk_score != null ? `${Math.round(result.risk_score * 100)}%` : "—"}
              </div>
              <div style={{ fontSize: 12, color: "#5C5852" }}>
                Risque de rejet · {result.risk_level}
              </div>
              {isDanger && result.rejection_cause_predicted && (
                <div style={s.causeBox}>{result.rejection_cause_predicted}</div>
              )}
              <div style={{ fontSize: 11, color: "#9C9890", marginTop: 12, lineHeight: 1.5 }}>
                {isDanger
                  ? "Vérifiez le dossier acte par acte avant envoi à l'organisme."
                  : "Dossier conforme — peut être envoyé à l'organisme."}
              </div>
            </div>
            <div style={s.footer}>
              <button style={s.primaryBtn} onClick={onConfirm}>Voir dans la liste des dossiers</button>
            </div>
          </div>
        ) : (
          <div style={s.body}>
            <div style={s.privacyNote}>
              Le patient est identifié par son Numéro d&apos;Entrée (NE). S&apos;il n&apos;existe pas encore,
              il est créé automatiquement. Aucun nom n&apos;est manipulé ici.
            </div>
            {error && <div style={s.errorBox}>{error}</div>}

            <div style={s.grid}>
              <div style={s.field}>
                <label style={s.label}>Numéro d&apos;Entrée (NE) *</label>
                <input style={s.input} placeholder="Ex: 10042" value={form.ne_number}
                  onChange={e => setForm({ ...form, ne_number: e.target.value })} />
              </div>

              <div style={s.field}>
                <label style={s.label}>N° dossier *</label>
                <input style={s.input} placeholder="DOSS-001" value={form.claim_number}
                  onChange={e => setForm({ ...form, claim_number: e.target.value })} />
              </div>

              <div style={s.field}>
                <label style={s.label}>Caisse *</label>
                <select style={s.input} value={form.insurance_type}
                  onChange={e => setForm({ ...form, insurance_type: e.target.value })}>
                  <option value="CNOPS">CNOPS</option>
                  <option value="CNSS">CNSS</option>
                  <option value="FAR">FAR</option>
                </select>
              </div>

              <div style={s.field}>
                <label style={s.label}>Type de service *</label>
                <select style={s.input} value={form.service_type}
                  onChange={e => setForm({ ...form, service_type: e.target.value })}>
                  <option value="consultation">Consultation</option>
                  <option value="hospitalisation">Hospitalisation</option>
                  <option value="chirurgie">Chirurgie</option>
                  <option value="radiologie">Radiologie</option>
                  <option value="laboratoire">Laboratoire</option>
                  <option value="kinesitherapie">Kinésithérapie</option>
                </select>
              </div>

              <div style={s.field}>
                <label style={s.label}>Date de service *</label>
                <input type="date" style={s.input} value={form.service_date}
                  onChange={e => setForm({ ...form, service_date: e.target.value })} />
              </div>

              <div style={s.field}>
                <label style={s.label}>Montant total (MAD) *</label>
                <input type="number" style={s.input} placeholder="12500" value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>

              <div style={s.field}>
                <label style={s.label}>Durée de séjour (jours) *</label>
                <input type="number" style={s.input} placeholder="7" value={form.duree_sejour}
                  onChange={e => setForm({ ...form, duree_sejour: e.target.value })} />
              </div>

              <div style={s.field}>
                <label style={s.label}>Part organisme (0 à 1) *</label>
                <input type="number" step="0.01" min="0" max="1" style={s.input} placeholder="0.80" value={form.part_organisme}
                  onChange={e => setForm({ ...form, part_organisme: e.target.value })} />
              </div>
            </div>

            <div style={s.footer}>
              <button style={s.cancelBtn} onClick={onClose}>Annuler</button>
              <button style={{ ...s.primaryBtn, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSubmit}>
                {saving ? "Analyse en cours..." : "Créer et analyser"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", inset: 0, background: "rgba(26,24,20,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal:   { background: "#fff", borderRadius: 12, width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.18)", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" },
  hdr:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 14px", borderBottom: "0.5px solid #F2F1EE" },
  title:   { fontSize: 14, fontWeight: 600, color: "#1A1814" },
  close:   { background: "none", border: "none", fontSize: 16, color: "#9C9890", cursor: "pointer" },
  body:    { padding: "16px 20px" },
  privacyNote: { fontSize: 11, color: "#6D28D9", background: "#F5F3FF", border: "0.5px solid #DDD6FE", borderRadius: 7, padding: "8px 10px", marginBottom: 12, lineHeight: 1.5 },
  errorBox: { background: "#FEE2E2", border: "0.5px solid #FCA5A5", borderRadius: 7, padding: "8px 12px", fontSize: 12, color: "#991B1B", marginBottom: 10 },
  grid:    { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 16 },
  field:   { display: "flex", flexDirection: "column", gap: 5 },
  label:   { fontSize: 10, fontWeight: 500, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" },
  input:   { padding: "8px 12px", border: "0.5px solid #D1D5DB", borderRadius: 7, fontSize: 12, color: "#1A1814", outline: "none", fontFamily: "inherit", background: "#FAFAFA" },
  footer:  { display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "0.5px solid #F2F1EE", paddingTop: 14 },
  cancelBtn: { fontSize: 12, fontWeight: 500, padding: "8px 16px", borderRadius: 7, cursor: "pointer", border: "0.5px solid #E5E3DD", background: "#fff", color: "#5C5852", fontFamily: "inherit" },
  primaryBtn: { fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 7, cursor: "pointer", border: "none", background: "#5B4FE8", color: "#fff", fontFamily: "inherit" },
  zoneBox: { borderRadius: 10, padding: "20px 16px", textAlign: "center", marginBottom: 16 },
  causeBox: { fontSize: 12, color: "#991B1B", background: "#fff", border: "0.5px solid #FCA5A5", borderRadius: 7, padding: "8px 10px", marginTop: 12 },
};