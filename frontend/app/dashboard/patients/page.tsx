"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Patient {
  id: string;
  full_name: string;
  cin: string | null;
  phone: string | null;
  insurance_type: string | null;
  insurance_number: string | null;
  is_active: boolean;
  created_at: string;
}

function payerStyle(payer: string | null) {
  if (payer === "CNOPS") return { bg: "#E6F1FB", color: "#1E40AF" };
  if (payer === "CNSS")  return { bg: "#F0FDF4", color: "#166534" };
  if (payer === "AMO")   return { bg: "#FFF7ED", color: "#9A3412" };
  if (payer === "AMO-Tadamon") return { bg: "#F5F3FF", color: "#6D28D9" };
  return { bg: "#F3F4F6", color: "#6B7280" };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<Patient | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    full_name: "", cin: "", phone: "", insurance_type: "CNOPS", insurance_number: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason]       = useState("");
  const [deleting, setDeleting]               = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("sihaiq_token");
    if (!token) { window.location.href = "/auth/login"; return; }
    loadPatients();
  }, []);

  async function loadPatients() {
    const tenantId = localStorage.getItem("sihaiq_tenant_id");
    try {
      const res = await fetch(`${API_URL}/patients/?tenant_id=${tenantId}`);
      if (res.ok) setPatients(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleAddPatient() {
    if (!form.full_name) { setError("Le nom est obligatoire."); return; }
    setSaving(true);
    setError("");
    const tenantId = localStorage.getItem("sihaiq_tenant_id");
    try {
      const res = await fetch(`${API_URL}/patients/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          full_name: form.full_name,
          cin: form.cin || null,
          phone: form.phone || null,
          insurance_type: form.insurance_type || null,
          insurance_number: form.insurance_number || null,
        }),
      });
      if (!res.ok) { setError("Erreur lors de l\u2019ajout du patient."); return; }
      setForm({ full_name: "", cin: "", phone: "", insurance_type: "CNOPS", insurance_number: "" });
      setShowForm(false);
      loadPatients();
    } catch { setError("Impossible de contacter le serveur."); }
    finally { setSaving(false); }
  }
  async function deletePatient(patientId: string) {
    if (!deleteReason) return;
    setDeleting(true);
    try {
      const token     = localStorage.getItem("sihaiq_token");
      const userEmail = JSON.parse(localStorage.getItem("sihaiq_user") || "{}").email || "inconnu";
      const res = await fetch(`${API_URL}/patients/${patientId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: deleteReason, user_email: userEmail }),
      });
      if (!res.ok) throw new Error("Erreur suppression patient");
      setShowDeleteModal(false);
      setSelected(null);
      setDeleteReason("");
      loadPatients();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      alert("❌ " + message);
    } finally { setDeleting(false); }
  }
  const filtered = patients.filter(p =>
    search === "" ||
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.cin || "").toLowerCase().includes(search.toLowerCase())
  );

  const userName = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("sihaiq_user") || "{}").name || "Utilisateur"
    : "Utilisateur";

  return (
    <div style={s.shell}>
      {/* SIDEBAR */}
      <aside style={s.sidebar}>
        <div style={s.sbTop}>
          <div style={s.sbBrand}>
            <div style={s.sbMark}>
              <svg width="14" height="14" viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="6" fill="white"/>
                <circle cx="22" cy="22" r="2.8" fill="#0F62FE"/>
                <line x1="22" y1="7" x2="22" y2="14" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="22" y1="30" x2="22" y2="37" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="7" y1="22" x2="14" y2="22" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="30" y1="22" x2="37" y2="22" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="12" y1="12" x2="16.5" y2="16.5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="27.5" y1="27.5" x2="32" y2="32" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="32" y1="12" x2="27.5" y2="16.5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="16.5" y1="27.5" x2="12" y2="32" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={s.sbName}>Siha<span style={s.sbIQ}>IQ</span></div>
              <div style={s.sbRole}>RCM Platform</div>
            </div>
          </div>
        </div>
        <nav style={s.sbNav}>
          <div style={s.sbSec}>Principal</div>
          <a href="/dashboard" style={s.sbItem}> Tableau de bord</a>
          <a href="/dashboard/dossiers" style={s.sbItem}> Dossiers BAF</a>
          <a href="/dashboard/patients" style={{ ...s.sbItem, ...s.sbItemActive }}> Patients</a>
          <a href="/dashboard/prediction" style={s.sbItem}> Prédiction IA</a>
          <div style={s.sbSec}>Analyse</div>
          <a href="/dashboard/performance" style={s.sbItem}> Performance</a>
          <a href="/dashboard/forclusion" style={s.sbItem}> Forclusion</a>
          <a href="/dashboard/encours" style={s.sbItem}> Encours A/R</a>
          <a href="/dashboard/financier" style={s.sbItem}> Activité financière</a>
          <a href="/dashboard/comptabilite" style={s.sbItem}>📒 Comptabilité DAF</a>
          <div style={s.sbSec}>Système</div>
          <a href="/dashboard/audit" style={s.sbItem}> Journal d&apos;audit</a>
          <a href="/dashboard/settings" style={s.sbItem}> Paramètres</a>
        </nav>
        <div style={s.sbFooter}>
          <button style={s.logoutBtn} onClick={() => {
            localStorage.clear();
            window.location.href = "/auth/login";
          }}>Se déconnecter</button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={s.main}>
        <div style={s.topbar}>
          <div>
            <div style={s.topTitle}>Patients</div>
            <div style={s.topDate}>{filtered.length} patient{filtered.length > 1 ? "s" : ""} · {userName}</div>
          </div>
          <button style={s.topBtnPrimary} onClick={() => setShowForm(!showForm)}>
            {showForm ? "✕ Annuler" : "+ Nouveau patient"}
          </button>
        </div>

        <div style={s.content}>

          {/* ADD PATIENT FORM */}
          {showForm && (
            <div style={s.formCard}>
              <div style={s.formTitle}>Ajouter un patient</div>
              {error && <div style={s.errorBox}>{error}</div>}
              <div style={s.formGrid}>
                <div style={s.field}>
                  <label style={s.label}>Nom complet *</label>
                  <input style={s.input} placeholder="Ahmed Bennani" value={form.full_name}
                    onChange={e => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>CIN</label>
                  <input style={s.input} placeholder="BK123456" value={form.cin}
                    onChange={e => setForm({ ...form, cin: e.target.value })} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Téléphone</label>
                  <input style={s.input} placeholder="0661234567" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Caisse</label>
                  <select style={s.input} value={form.insurance_type}
                    onChange={e => setForm({ ...form, insurance_type: e.target.value })}>
                    <option value="CNOPS">CNOPS</option>
                    <option value="CNSS">CNSS</option>
                    <option value="AMO">AMO</option>
                    <option value="AMO-Tadamon">AMO-Tadamon</option>
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>N° immatriculation</label>
                  <input style={s.input} placeholder="CNP-001234" value={form.insurance_number}
                    onChange={e => setForm({ ...form, insurance_number: e.target.value })} />
                </div>
              </div>
              <button style={saving ? { ...s.saveBtn, opacity: 0.7 } : s.saveBtn}
                onClick={handleAddPatient} disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer le patient"}
              </button>
            </div>
          )}

          <div style={s.tableLayout}>
            {/* TABLE */}
            <div style={selected ? s.tableWrapNarrow : s.tableWrap}>
              <div style={s.filterBar}>
                <input style={s.searchInput} placeholder="Rechercher par nom ou CIN..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div style={s.tableCard}>
                {loading ? (
                  <div style={s.loading}>Chargement des patients...</div>
                ) : filtered.length === 0 ? (
                  <div style={s.loading}>Aucun patient trouvé.</div>
                ) : (
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {["Nom complet", "CIN", "Téléphone", "Caisse", "N° immatriculation", "Statut", "Ajouté le"].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(p => {
                        const ps = payerStyle(p.insurance_type);
                        return (
                          <tr key={p.id}
                            style={selected?.id === p.id ? { ...s.tr, ...s.trSelected } : s.tr}
                            onClick={() => setSelected(selected?.id === p.id ? null : p)}>
                            <td style={s.td}><span style={s.patientName}>{p.full_name}</span></td>
                            <td style={s.td}><span style={s.mono}>{p.cin || "—"}</span></td>
                            <td style={s.td}>{p.phone || "—"}</td>
                            <td style={s.td}>
                              {p.insurance_type
                                ? <span style={{ ...s.badge, background: ps.bg, color: ps.color }}>{p.insurance_type}</span>
                                : <span style={s.dash}>—</span>}
                            </td>
                            <td style={s.td}><span style={s.mono}>{p.insurance_number || "—"}</span></td>
                            <td style={s.td}>
                              <span style={{ ...s.badge, background: p.is_active ? "#DCFCE7" : "#FEE2E2", color: p.is_active ? "#166534" : "#991B1B" }}>
                                {p.is_active ? "Actif" : "Inactif"}
                              </span>
                            </td>
                            <td style={s.td}>{formatDate(p.created_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* DETAIL PANEL */}
            {selected && (
              <div style={s.detailPanel}>
                <div style={s.detailHdr}>
                  <div>
                    <div style={s.detailName}>{selected.full_name}</div>
                    <div style={s.detailSub}>Fiche patient</div>
                  </div>
                  <button style={s.closeBtn} onClick={() => setSelected(null)}>✕</button>
                </div>
                <div style={s.detailSection}>
                  <div style={s.detailSectionTitle}>Informations</div>
                  {[
                    { lbl: "CIN", val: selected.cin || "—" },
                    { lbl: "Téléphone", val: selected.phone || "—" },
                    { lbl: "Caisse", val: selected.insurance_type || "—" },
                    { lbl: "N° immatriculation", val: selected.insurance_number || "—" },
                    { lbl: "Statut", val: selected.is_active ? "Actif" : "Inactif" },
                    { lbl: "Ajouté le", val: formatDate(selected.created_at) },
                  ].map(r => (
                    <div key={r.lbl} style={s.detailRow}>
                      <span style={s.detailLbl}>{r.lbl}</span>
                      <span style={s.detailVal}>{r.val}</span>
                    </div>
                  ))}
                </div>
                <a href="/dashboard/dossiers" style={s.viewClaimsBtn}>
                  Voir les dossiers →
                </a>
                <button
                  style={s.deletePatientBtn}
                  onClick={() => { setDeleteReason(""); setShowDeleteModal(true); }}
                >
                   Supprimer ce patient
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* DELETE PATIENT MODAL */}
      {showDeleteModal && selected && (
        <div style={s.overlay} onClick={() => setShowDeleteModal(false)}>
          <div style={s.deleteModal} onClick={e => e.stopPropagation()}>
            <div style={s.deleteModalHdr}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1D23" }}>Supprimer le patient</div>
              <button style={{ background: "none", border: "none", fontSize: 16, color: "#9EA3AE", cursor: "pointer" }} onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0F62FE", marginBottom: 10 }}>{selected.full_name}</div>
              <div style={{ fontSize: 12, color: "#9A3412", background: "#FFF8F0", border: "0.5px solid #FED7AA", borderRadius: 7, padding: "8px 10px", marginBottom: 14 }}>
                ⚠️ Cette action est irréversible. Tous les dossiers BAF associés seront également supprimés.
              </div>
              <label style={{ fontSize: 10, fontWeight: 600, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                Raison de suppression *
              </label>
              <input
                style={{ width: "100%", padding: "9px 12px", border: "0.5px solid #E2E4E9", borderRadius: 8, fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }}
                placeholder="Ex: doublon, erreur de saisie..."
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderTop: "0.5px solid #EEF2F8", justifyContent: "flex-end" }}>
              <button style={s.cancelBtn} onClick={() => setShowDeleteModal(false)}>Annuler</button>
              <button
                style={{ ...s.confirmDeleteBtn, opacity: !deleteReason || deleting ? 0.5 : 1 }}
                disabled={!deleteReason || deleting}
                onClick={() => deletePatient(selected.id)}
              >
                {deleting ? "Suppression..." : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell:   { display: "flex", height: "100vh", overflow: "hidden", background: "#F0F4FA", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" },
  sidebar: { width: 210, flexShrink: 0, background: "#fff", borderRight: "0.5px solid #E2E4E9", display: "flex", flexDirection: "column" },
  sbTop:   { padding: "16px 14px 12px", borderBottom: "0.5px solid #EEF2F8" },
  sbBrand: { display: "flex", alignItems: "center", gap: 9 },
  sbMark:  { width: 28, height: 28, background: "#0F62FE", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sbName:  { fontSize: 15, fontWeight: 300, color: "#0C1B33", letterSpacing: "-0.02em", lineHeight: 1.1 },
  sbIQ:    { fontWeight: 800, color: "#0F62FE" },
  sbRole:  { fontSize: 9, fontWeight: 600, color: "#9EA3AE", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 },
  sbNav:   { flex: 1, padding: "10px 8px", overflowY: "auto", display: "flex", flexDirection: "column" },
  sbSec:   { fontSize: 9, fontWeight: 600, color: "#B5D4F4", textTransform: "uppercase", letterSpacing: "0.1em", padding: "10px 8px 4px" },
  sbItem:  { display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 7, cursor: "pointer", color: "#6B7280", fontSize: 12, textDecoration: "none", marginBottom: 1 },
  sbItemActive: { background: "#E6F1FB", color: "#0F62FE", fontWeight: 500 },
  sbFooter:{ padding: "10px 8px", borderTop: "0.5px solid #EEF2F8" },
  logoutBtn:{ width: "100%", padding: "8px", borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: "pointer", border: "0.5px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", fontFamily: "inherit" },

  main:    { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topbar:  { background: "#fff", borderBottom: "0.5px solid #E2E4E9", padding: "0 20px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  topTitle:{ fontSize: 14, fontWeight: 600, color: "#1A1D23" },
  topDate: { fontSize: 11, color: "#9EA3AE", marginTop: 2 },
  topBtnPrimary: { fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 7, cursor: "pointer", border: "none", background: "#0F62FE", color: "#fff", fontFamily: "inherit" },

  content: { flex: 1, overflowY: "auto", padding: "16px 20px" },

  formCard:  { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, padding: 16, marginBottom: 14 },
  formTitle: { fontSize: 13, fontWeight: 600, color: "#1A1D23", marginBottom: 12 },
  formGrid:  { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 },
  field:     { display: "flex", flexDirection: "column", gap: 5 },
  label:     { fontSize: 10, fontWeight: 500, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" },
  input:     { padding: "8px 12px", border: "0.5px solid #D1D5DB", borderRadius: 7, fontSize: 12, color: "#1A1D23", outline: "none", fontFamily: "inherit", background: "#FAFAFA" },
  saveBtn:   { padding: "9px 20px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: "#0F62FE", color: "#fff", fontFamily: "inherit" },
  errorBox:  { background: "#FEE2E2", border: "0.5px solid #FCA5A5", borderRadius: 7, padding: "8px 12px", fontSize: 12, color: "#991B1B", marginBottom: 10 },

  filterBar:      { marginBottom: 10 },
  searchInput:    { padding: "8px 14px", border: "0.5px solid #D1D5DB", borderRadius: 8, fontSize: 12, color: "#1A1D23", outline: "none", fontFamily: "inherit", background: "#fff", width: 280 },
  tableLayout:    { display: "flex", gap: 12 },
  tableWrap:      { flex: 1 },
  tableWrapNarrow:{ flex: 1, minWidth: 0 },
  tableCard:      { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, overflow: "auto" },
  loading:        { padding: "24px 16px", fontSize: 13, color: "#9EA3AE" },
  table:          { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th:    { textAlign: "left", padding: "8px 14px", fontSize: 9, fontWeight: 600, color: "#9EA3AE", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "0.5px solid #EEF2F8", background: "#FAFBFF", whiteSpace: "nowrap" },
  tr:    { borderBottom: "0.5px solid #F5F7FA", cursor: "pointer" },
  trSelected: { background: "#EEF4FF" },
  td:    { padding: "10px 14px", verticalAlign: "middle" },
  patientName:{ fontSize: 12, fontWeight: 500, color: "#1A1D23" },
  mono:  { fontFamily: "monospace", fontSize: 11, color: "#4B5060" },
  badge: { display: "inline-flex", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20 },
  dash:  { fontSize: 11, color: "#9EA3AE" },

  detailPanel:  { width: 280, flexShrink: 0, background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, padding: 16, overflowY: "auto" },
  detailHdr:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 12, borderBottom: "0.5px solid #EEF2F8" },
  detailName:   { fontSize: 14, fontWeight: 600, color: "#1A1D23" },
  detailSub:    { fontSize: 11, color: "#9EA3AE", marginTop: 3 },
  closeBtn:     { fontSize: 14, color: "#9EA3AE", cursor: "pointer", border: "none", background: "none", padding: 0 },
  detailSection:{ marginBottom: 16 },
  detailSectionTitle: { fontSize: 10, fontWeight: 600, color: "#9EA3AE", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 },
  detailRow:    { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  detailLbl:    { fontSize: 12, color: "#6B7280" },
  detailVal:    { fontSize: 12, fontWeight: 500, color: "#1A1D23" },
  viewClaimsBtn:{ display: "block", textAlign: "center", padding: "9px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: "#E6F1FB", color: "#0F62FE", textDecoration: "none", marginTop: 8 },
deletePatientBtn: { display: "block", width: "100%", textAlign: "center", padding: "9px", borderRadius: 7, fontSize: 12, fontWeight: 500, background: "#FEF2F2", color: "#DC2626", border: "0.5px solid #FCA5A5", cursor: "pointer", marginTop: 8, fontFamily: "inherit" },
  overlay:      { position: "fixed", inset: 0, background: "rgba(12,27,51,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  deleteModal:  { background: "#fff", borderRadius: 12, width: "100%", maxWidth: 440, boxShadow: "0 20px 50px rgba(0,0,0,0.18)" },
  deleteModalHdr: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 14px", borderBottom: "0.5px solid #EEF2F8" },
  cancelBtn:    { fontSize: 12, fontWeight: 500, padding: "8px 16px", borderRadius: 7, cursor: "pointer", border: "0.5px solid #E2E4E9", background: "#fff", color: "#6B7280", fontFamily: "inherit" },
  confirmDeleteBtn: { fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 7, cursor: "pointer", border: "none", background: "#DC2626", color: "#fff", fontFamily: "inherit" },
};