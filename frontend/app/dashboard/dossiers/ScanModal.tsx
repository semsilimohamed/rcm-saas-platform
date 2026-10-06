"use client";

// Scan modal: uploads a scanned document to POST /claims/scan (OCR), lets the agent review and
// complete the extracted fields, then creates the claim with POST /claims/.

import { useState, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Extracted {
  organisme: string | null;
  date_entree: string | null;
  date_sortie: string | null;
  duree_sejour: number | null;
  montant_total: number | null;
  part_patient: number | null;
  part_organisme: number | null;
  mois: number | null;
}

const SEUIL = 0.40;

/**
 * Modal for OCR-assisted claim entry (the OCR proposes, the agent validates).
 * @param props.onClose - Close without saving.
 * @param props.onConfirm - Called after the reviewed claim was created.
 */
export default function ScanModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [step, setStep] = useState<"upload" | "review" | "result">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    ne_number: "",
    claim_number: "",
    organisme: "",
    service_type: "hospitalisation",
    date_sortie: "",
    montant_total: "",
    duree_sejour: "",
    part_organisme: "",
  });

  const [result, setResult] = useState<{ risk_score: number | null; risk_level: string | null; rejection_cause_predicted: string | null } | null>(null);

  function pick(f: File | null) {
    setError("");
    if (!f) return;
    const ok = /\.(pdf|jpg|jpeg|png|tiff|tif)$/i.test(f.name);
    if (!ok) { setError("Formats acceptés : PDF, JPG, PNG, TIFF."); return; }
    setFile(f);
  }

  async function handleScan() {
    if (!file) { setError("Sélectionnez un document."); return; }
    setScanning(true); setError("");
    try {
      const token = localStorage.getItem("sihaiq_token");
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/claims/scan`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Erreur lors de la lecture du document."); return; }

      const ex: Extracted = data.extracted;
      setForm(f => ({
        ...f,
        organisme: ex.organisme || "",
        date_sortie: ex.date_sortie || "",
        montant_total: ex.montant_total != null ? String(ex.montant_total) : "",
        duree_sejour: ex.duree_sejour != null ? String(ex.duree_sejour) : "",
        part_organisme: ex.part_organisme != null ? String(ex.part_organisme) : "",
      }));

      setStep("review");
    } catch { setError("Impossible de contacter le serveur."); }
    finally { setScanning(false); }
  }

  async function handleCreate() {
    setError("");
    if (!form.ne_number) { setError("Le Numéro d'Entrée (NE) est obligatoire."); return; }
    if (!form.claim_number) { setError("Le numéro de dossier est obligatoire."); return; }
    if (!form.organisme || !form.montant_total || !form.duree_sejour || !form.part_organisme || !form.date_sortie) {
      setError("Complétez tous les champs extraits avant de créer le dossier."); return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("sihaiq_token");
      const res = await fetch(`${API_URL}/claims/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ne_number: form.ne_number,
          claim_number: form.claim_number,
          amount: parseFloat(form.montant_total),
          insurance_type: form.organisme,
          service_type: form.service_type,
          service_date: form.date_sortie + "T00:00:00",
          duree_sejour: parseInt(form.duree_sejour, 10),
          part_organisme: parseFloat(form.part_organisme),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Erreur lors de la création."); return; }
      setResult({ risk_score: data.risk_score, risk_level: data.risk_level, rejection_cause_predicted: data.rejection_cause_predicted });
      setStep("result");
    } catch { setError("Impossible de contacter le serveur."); }
    finally { setSaving(false); }
  }

  const isDanger = result?.risk_score != null && result.risk_score >= SEUIL;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.hdr}>
          <div style={s.title}>Scanner un dossier</div>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>

        <div style={s.steps}>
          <span style={step === "upload" ? s.stepActive : s.step}>1 · Import</span>
          <span style={step === "review" ? s.stepActive : s.step}>2 · Vérification</span>
          <span style={step === "result" ? s.stepActive : s.step}>3 · Résultat</span>
        </div>

        <div style={s.body}>
          {step === "upload" && (
            <>
              <div style={s.privacyNote}>
                Le document est lu puis <strong>immédiatement supprimé</strong>. Aucune donnée
                d&apos;identité n&apos;est extraite ni conservée (CNDP / Loi 09-08).
              </div>
              <div
                style={{ ...s.dropZone, ...(dragging ? s.dropZoneActive : {}) }}
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0] || null); }}
              >
                <div style={s.dropIcon}>⬆</div>
                {file ? <div style={s.fileName}>{file.name}</div> : (
                  <>
                    <div style={s.dropTitle}>Déposez le scan ici</div>
                    <div style={s.dropSub}>PDF, JPG, PNG, TIFF</div>
                  </>
                )}
                <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" style={{ display: "none" }}
                  onChange={e => pick(e.target.files?.[0] || null)} />
              </div>
              {error && <div style={s.errorBox}>{error}</div>}
              <div style={s.footer}>
                <button style={s.cancelBtn} onClick={onClose}>Annuler</button>
                <button style={{ ...s.primaryBtn, opacity: scanning || !file ? 0.6 : 1 }} disabled={scanning || !file} onClick={handleScan}>
                  {scanning ? "Lecture en cours..." : "Lire le document"}
                </button>
              </div>
            </>
          )}

          {step === "review" && (
            <>
              <div style={s.reviewNote}>
                Champs extraits par l&apos;OCR — <strong>vérifiez et corrigez</strong> si nécessaire, puis renseignez le NE.
                Le patient est créé automatiquement s&apos;il n&apos;existe pas.
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
                  <input style={s.input} placeholder="DOSS-001" value={form.claim_number} onChange={e => setForm({ ...form, claim_number: e.target.value })} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Caisse (extrait)</label>
                  <select style={s.input} value={form.organisme} onChange={e => setForm({ ...form, organisme: e.target.value })}>
                    <option value="">—</option>
                    <option value="CNOPS">CNOPS</option>
                    <option value="CNSS">CNSS</option>
                    <option value="FAR">FAR</option>
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Date de sortie (extrait)</label>
                  <input type="date" style={s.input} value={form.date_sortie} onChange={e => setForm({ ...form, date_sortie: e.target.value })} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Montant total (extrait)</label>
                  <input type="number" style={s.input} value={form.montant_total} onChange={e => setForm({ ...form, montant_total: e.target.value })} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Durée de séjour (extrait)</label>
                  <input type="number" style={s.input} value={form.duree_sejour} onChange={e => setForm({ ...form, duree_sejour: e.target.value })} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Part organisme (extrait)</label>
                  <input type="number" step="0.01" style={s.input} value={form.part_organisme} onChange={e => setForm({ ...form, part_organisme: e.target.value })} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Type de soin</label>
                  <select style={s.input} value={form.service_type} onChange={e => setForm({ ...form, service_type: e.target.value })}>
                    <option value="hospitalisation">Hospitalisation</option>
                    <option value="chirurgie">Chirurgie</option>
                    <option value="consultation">Consultation</option>
                    <option value="radiologie">Radiologie</option>
                    <option value="laboratoire">Laboratoire</option>
                  </select>
                </div>
              </div>
              <div style={s.footer}>
                <button style={s.cancelBtn} onClick={() => setStep("upload")}>Retour</button>
                <button style={{ ...s.primaryBtn, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleCreate}>
                  {saving ? "Création..." : "Créer et analyser"}
                </button>
              </div>
            </>
          )}

          {step === "result" && result && (
            <>
              <div style={{ ...s.zoneBox, background: isDanger ? "#FEF2F2" : "#F0FDF4", border: `1px solid ${isDanger ? "#FCA5A5" : "#86EFAC"}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: isDanger ? "#991B1B" : "#166534" }}>
                  {isDanger ? "ZONE DANGER" : "ZONE SÛRE"}
                </div>
                <div style={{ fontSize: 30, fontWeight: 800, color: isDanger ? "#DC2626" : "#16A34A", margin: "8px 0" }}>
                  {result.risk_score != null ? `${Math.round(result.risk_score * 100)}%` : "—"}
                </div>
                <div style={{ fontSize: 12, color: "#5C5852" }}>Risque de rejet · {result.risk_level}</div>
                {isDanger && result.rejection_cause_predicted && <div style={s.causeBox}>{result.rejection_cause_predicted}</div>}
              </div>
              <div style={s.footer}>
                <button style={s.primaryBtn} onClick={onConfirm}>Voir dans la liste des dossiers</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", inset: 0, background: "rgba(26,24,20,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal:   { background: "#fff", borderRadius: 12, width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.18)", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" },
  hdr:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 12px", borderBottom: "0.5px solid #F2F1EE" },
  title:   { fontSize: 14, fontWeight: 600, color: "#1A1814" },
  close:   { background: "none", border: "none", fontSize: 16, color: "#9C9890", cursor: "pointer" },
  steps:   { display: "flex", gap: 8, padding: "10px 20px", borderBottom: "0.5px solid #F2F1EE", fontSize: 11 },
  step:    { color: "#9C9890" },
  stepActive: { color: "#5B4FE8", fontWeight: 600 },
  body:    { padding: "16px 20px" },
  privacyNote: { fontSize: 11, color: "#6D28D9", background: "#F5F3FF", border: "0.5px solid #DDD6FE", borderRadius: 7, padding: "8px 10px", marginBottom: 14, lineHeight: 1.5 },
  reviewNote:  { fontSize: 11, color: "#9A3412", background: "#FFF8F0", border: "0.5px solid #FED7AA", borderRadius: 7, padding: "8px 10px", marginBottom: 14, lineHeight: 1.5 },
  dropZone:   { border: "1.5px dashed #C7C2F7", borderRadius: 10, padding: "32px 16px", textAlign: "center", cursor: "pointer", background: "#FAFAFE", marginBottom: 12 },
  dropZoneActive: { background: "#EEEDFB", borderColor: "#5B4FE8" },
  dropIcon:   { fontSize: 24, color: "#5B4FE8", marginBottom: 8 },
  dropTitle:  { fontSize: 13, fontWeight: 600, color: "#1A1814" },
  dropSub:    { fontSize: 11, color: "#9C9890", marginTop: 4 },
  fileName:   { fontSize: 13, fontWeight: 600, color: "#5B4FE8" },
  grid:    { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 16 },
  field:   { display: "flex", flexDirection: "column", gap: 5 },
  label:   { fontSize: 10, fontWeight: 500, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" },
  input:   { padding: "8px 12px", border: "0.5px solid #D1D5DB", borderRadius: 7, fontSize: 12, color: "#1A1814", outline: "none", fontFamily: "inherit", background: "#FAFAFA" },
  errorBox: { background: "#FEE2E2", border: "0.5px solid #FCA5A5", borderRadius: 7, padding: "8px 12px", fontSize: 12, color: "#991B1B", marginBottom: 10 },
  footer:  { display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "0.5px solid #F2F1EE", paddingTop: 14 },
  cancelBtn: { fontSize: 12, fontWeight: 500, padding: "8px 16px", borderRadius: 7, cursor: "pointer", border: "0.5px solid #E5E3DD", background: "#fff", color: "#5C5852", fontFamily: "inherit" },
  primaryBtn: { fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 7, cursor: "pointer", border: "none", background: "#5B4FE8", color: "#fff", fontFamily: "inherit" },
  zoneBox: { borderRadius: 10, padding: "20px 16px", textAlign: "center", marginBottom: 16 },
  causeBox: { fontSize: 12, color: "#991B1B", background: "#fff", border: "0.5px solid #FCA5A5", borderRadius: 7, padding: "8px 10px", marginTop: 12 },
};