"use client";

import { useState, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface ImportResult {
  created: number;
  errors: string[];
  estimated_count: number;
  message: string;
}

export default function ImportCsvModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [file, setFile]       = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState("");
  const [result, setResult]   = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(f: File | null) {
    setError("");
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setError("Seuls les fichiers .csv sont acceptés.");
      return;
    }
    setFile(f);
  }

  async function handleUpload() {
    if (!file) { setError("Sélectionnez un fichier CSV."); return; }
    setUploading(true); setError("");
    try {
      const token = localStorage.getItem("sihaiq_token");
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/claims/import-csv`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Erreur lors de l'import.");
        return;
      }
      setResult(data);
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.hdr}>
          <div style={s.title}>Importer des dossiers (CSV)</div>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>

        {result ? (
          <div style={s.body}>
            <div style={s.reportCard}>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#16A34A" }}>{result.created}</div>
              <div style={{ fontSize: 12, color: "#5C5852" }}>dossier(s) créé(s) et analysé(s)</div>
            </div>

            {result.estimated_count > 0 && (
              <div style={s.warnBox}>
                {result.estimated_count} dossier(s) avec part organisme <strong>estimée</strong>
                {" "}(taux théorique) — fiabilité réduite. Fournissez la colonne
                {" "}<code>part_patient</code> pour un calcul réel.
              </div>
            )}

            {result.errors.length > 0 && (
              <div style={s.errListBox}>
                <div style={s.errListTitle}>{result.errors.length} ligne(s) ignorée(s)</div>
                <ul style={s.errList}>
                  {result.errors.slice(0, 10).map((e, i) => <li key={i} style={s.errItem}>{e}</li>)}
                  {result.errors.length > 10 && <li style={s.errItem}>… et {result.errors.length - 10} autre(s)</li>}
                </ul>
              </div>
            )}

            <div style={s.footer}>
              <button style={s.primaryBtn} onClick={onConfirm}>Voir les dossiers importés</button>
            </div>
          </div>
        ) : (
          <div style={s.body}>
            <div style={s.formatNote}>
              <div style={s.formatTitle}>Colonnes attendues</div>
              <code style={s.formatCode}>ne_number, organisme, date_entree, date_sortie, montant_total</code>
              <div style={s.formatOptional}>
                Optionnel : <code>part_patient</code> (calcul réel de la part organisme),
                {" "}<code>service_type</code>, <code>claim_number</code>
              </div>
              <div style={s.formatDates}>Dates au format AAAA-MM-JJ · durée de séjour calculée automatiquement</div>
            </div>

            <div style={s.privacyNote}>
              🔒 Aucune colonne nom/CIN acceptée. Les patients sont identifiés par leur Numéro d&apos;Entrée (NE),
              qui doit déjà exister dans la plateforme.
            </div>

            <div
              style={{ ...s.dropZone, ...(dragging ? s.dropZoneActive : {}) }}
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0] || null); }}
            >
              <div style={s.dropIcon}>⬆</div>
              {file ? (
                <div style={s.fileName}>{file.name}</div>
              ) : (
                <>
                  <div style={s.dropTitle}>Glissez votre fichier CSV ici</div>
                  <div style={s.dropSub}>ou cliquez pour sélectionner</div>
                </>
              )}
              <input ref={inputRef} type="file" accept=".csv" style={{ display: "none" }}
                onChange={e => pick(e.target.files?.[0] || null)} />
            </div>

            {error && <div style={s.errorBox}>{error}</div>}

            <div style={s.footer}>
              <button style={s.cancelBtn} onClick={onClose}>Annuler</button>
              <button style={{ ...s.primaryBtn, opacity: uploading || !file ? 0.6 : 1 }}
                disabled={uploading || !file} onClick={handleUpload}>
                {uploading ? "Import en cours..." : "Importer et analyser"}
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
  modal:   { background: "#fff", borderRadius: 12, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.18)", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" },
  hdr:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 14px", borderBottom: "0.5px solid #F2F1EE" },
  title:   { fontSize: 14, fontWeight: 600, color: "#1A1814" },
  close:   { background: "none", border: "none", fontSize: 16, color: "#9C9890", cursor: "pointer" },
  body:    { padding: "16px 20px" },

  formatNote:  { background: "#F8F7FE", border: "0.5px solid #EEEDFB", borderRadius: 8, padding: 12, marginBottom: 12 },
  formatTitle: { fontSize: 10, fontWeight: 600, color: "#5B4FE8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 },
  formatCode:  { display: "block", fontSize: 11, color: "#1A1814", fontFamily: "monospace", background: "#fff", padding: "6px 8px", borderRadius: 6, border: "0.5px solid #E5E3DD" },
  formatOptional: { fontSize: 11, color: "#5C5852", marginTop: 8, lineHeight: 1.5 },
  formatDates: { fontSize: 10, color: "#9C9890", marginTop: 6 },

  privacyNote: { fontSize: 11, color: "#6D28D9", background: "#F5F3FF", border: "0.5px solid #DDD6FE", borderRadius: 7, padding: "8px 10px", marginBottom: 14, lineHeight: 1.5 },

  dropZone:   { border: "1.5px dashed #C7C2F7", borderRadius: 10, padding: "28px 16px", textAlign: "center", cursor: "pointer", background: "#FAFAFE", marginBottom: 12 },
  dropZoneActive: { background: "#EEEDFB", borderColor: "#5B4FE8" },
  dropIcon:   { fontSize: 24, color: "#5B4FE8", marginBottom: 8 },
  dropTitle:  { fontSize: 13, fontWeight: 600, color: "#1A1814" },
  dropSub:    { fontSize: 11, color: "#9C9890", marginTop: 4 },
  fileName:   { fontSize: 13, fontWeight: 600, color: "#5B4FE8" },

  errorBox:   { background: "#FEE2E2", border: "0.5px solid #FCA5A5", borderRadius: 7, padding: "8px 12px", fontSize: 12, color: "#991B1B", marginBottom: 10 },
  footer:     { display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "0.5px solid #F2F1EE", paddingTop: 14 },
  cancelBtn:  { fontSize: 12, fontWeight: 500, padding: "8px 16px", borderRadius: 7, cursor: "pointer", border: "0.5px solid #E5E3DD", background: "#fff", color: "#5C5852", fontFamily: "inherit" },
  primaryBtn: { fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 7, cursor: "pointer", border: "none", background: "#5B4FE8", color: "#fff", fontFamily: "inherit" },

  reportCard: { background: "#F0FDF4", border: "0.5px solid #86EFAC", borderRadius: 10, padding: "18px 16px", textAlign: "center", marginBottom: 12 },
  warnBox:    { fontSize: 11, color: "#9A3412", background: "#FFF8F0", border: "0.5px solid #FED7AA", borderRadius: 7, padding: "8px 10px", marginBottom: 12, lineHeight: 1.5 },
  errListBox: { background: "#FEF2F2", border: "0.5px solid #FCA5A5", borderRadius: 8, padding: 12, marginBottom: 12 },
  errListTitle: { fontSize: 11, fontWeight: 600, color: "#991B1B", marginBottom: 6 },
  errList:    { margin: 0, paddingLeft: 16 },
  errItem:    { fontSize: 11, color: "#991B1B", lineHeight: 1.6 },
};