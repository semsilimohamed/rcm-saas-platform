"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Claim {
  id: string;
  claim_number: string;
  patient_name: string;
  amount: number;
  insurance_type: string;
  service_type: string;
  service_date: string;
  status: string;
  rejection_reason: string | null;
  risk_score: number | null;
  risk_level: string | null;
  rejection_cause_predicted: string | null;
  forclusion_deadline: string | null;
  created_at: string;
}

function riskStyle(level: string | null) {
  if (level === "ÉLEVÉ") return { bg: "#FEE2E2", color: "#991B1B" };
  if (level === "MODÉRÉ") return { bg: "#FEF9C3", color: "#854D0E" };
  return { bg: "#DCFCE7", color: "#166534" };
}

function statusStyle(status: string) {
  if (status === "approved") return { bg: "#DCFCE7", color: "#166534" };
  if (status === "rejected") return { bg: "#FEE2E2", color: "#991B1B" };
  return { bg: "#FEF9C3", color: "#854D0E" };
}

function statusLabel(status: string) {
  if (status === "approved") return "Approuvé";
  if (status === "rejected") return "Rejeté";
  return "En attente";
}

function payerStyle(payer: string) {
  if (payer === "CNOPS") return { bg: "#E6F1FB", color: "#1E40AF" };
  if (payer === "CNSS") return { bg: "#F0FDF4", color: "#166534" };
  if (payer === "AMO") return { bg: "#FFF7ED", color: "#9A3412" };
  return { bg: "#F5F3FF", color: "#6D28D9" };
}

function formatMAD(amount: number) {
  return amount.toLocaleString("fr-MA") + " MAD";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DossiersPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous");
  const [selected, setSelected] = useState<Claim | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false)

  async function updateStatus(claimId: string, status: "approved" | "rejected") {
  if (status === "rejected" && !rejectReason) {
    setShowRejectInput(true);
    return;
  }
  setUpdating(true);
  setUpdateMsg("");
  try {
    const token = localStorage.getItem("sihaiq_token");
    const res = await fetch(`${API_URL}/claims/${claimId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, rejection_reason: rejectReason || null }),
    });
    if (!res.ok) throw new Error("Erreur mise à jour");
    const data = await res.json();
    setUpdateMsg("✅ " + data.message);
    setShowRejectInput(false);
    setRejectReason("");
    // Refresh claims list
    const tenantId = localStorage.getItem("sihaiq_tenant_id");
    const cr = await fetch(`${API_URL}/claims/with-patients?tenant_id=${tenantId}`);
    if (cr.ok) {
      const updated = await cr.json();
      setClaims(updated);
      const updatedClaim = updated.find((c: Claim) => c.id === claimId);
      if (updatedClaim) setSelected(updatedClaim);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    setUpdateMsg("❌ " + message);
  } finally {
    setUpdating(false);
  }
}
  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("sihaiq_token");
      if (!token) { window.location.href = "/auth/login"; return; }
      const tenantId = localStorage.getItem("sihaiq_tenant_id");
      try {
        const res = await fetch(`${API_URL}/claims/with-patients?tenant_id=${tenantId}`);
        if (res.ok) setClaims(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = claims.filter(c => {
    const matchSearch = search === "" ||
      c.claim_number.toLowerCase().includes(search.toLowerCase()) ||
      c.patient_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "Tous" ? true :
      statusFilter === "En attente" ? c.status === "pending" :
      statusFilter === "Approuvés" ? c.status === "approved" :
      statusFilter === "Rejetés" ? c.status === "rejected" :
      statusFilter === "Risque élevé" ? c.risk_level === "ÉLEVÉ" : true;
    return matchSearch && matchStatus;
  });

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
          <Link href="/dashboard" style={s.sbItem}>📊 Tableau de bord</Link>
          <div style={{ ...s.sbItem, ...s.sbItemActive }}>📋 Dossiers BAF</div>
          <Link href="/dashboard/patients" style={s.sbItem}>👥 Patients</Link>
          <Link href="/dashboard/prediction" style={s.sbItem}>🧠 Prédiction IA</Link>
          <div style={s.sbSec}>Analyse</div>
          <Link href="/dashboard/performance" style={s.sbItem}>📈 Performance</Link>
          <Link href="/dashboard/forclusion" style={s.sbItem}>⚠️ Forclusion</Link>
          <Link href="/dashboard/encours" style={s.sbItem}>💰 Encours A/R</Link>
          <div style={s.sbSec}>Système</div>
          <Link href="/dashboard/audit" style={s.sbItem}>📜 Journal d&apos;audit</Link>
          <Link href="/dashboard/settings" style={s.sbItem}>⚙️ Paramètres</Link>
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
            <div style={s.topTitle}>Dossiers BAF</div>
            <div style={s.topDate}>{filtered.length} dossier{filtered.length > 1 ? "s" : ""} trouvé{filtered.length > 1 ? "s" : ""}</div>
          </div>
          <button style={s.topBtnPrimary}>+ Nouveau dossier</button>
        </div>

        <div style={s.content}>
          {/* FILTERS */}
          <div style={s.filterBar}>
            <input
              style={s.searchInput}
              placeholder="Rechercher par N° ou patient..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div style={s.chips}>
              {["Tous", "En attente", "Approuvés", "Rejetés", "Risque élevé"].map(f => (
                <button
                  key={f}
                  style={statusFilter === f ? { ...s.chip, ...s.chipActive } : s.chip}
                  onClick={() => setStatusFilter(f)}
                >{f}</button>
              ))}
            </div>
          </div>

          <div style={s.tableLayout}>
            {/* TABLE */}
            <div style={selected ? s.tableWrapNarrow : s.tableWrap}>
              <div style={s.tableCard}>
                {loading ? (
                  <div style={s.loading}>Chargement des dossiers...</div>
                ) : filtered.length === 0 ? (
                  <div style={s.loading}>Aucun dossier trouvé.</div>
                ) : (
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {["N\u00b0 dossier", "Patient", "Caisse", "Montant", "Risque IA", "Statut", "Date service"].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(claim => {
                        const rs = riskStyle(claim.risk_level);
                        const ss = statusStyle(claim.status);
                        const ps = payerStyle(claim.insurance_type);
                        return (
                          <tr
                            key={claim.id}
                            style={selected?.id === claim.id ? { ...s.tr, ...s.trSelected } : s.tr}
                            onClick={() => setSelected(selected?.id === claim.id ? null : claim)}
                          >
                            <td style={s.td}><span style={s.claimNum}>{claim.claim_number}</span></td>
                            <td style={s.td}><span style={s.patientName}>{claim.patient_name}</span></td>
                            <td style={s.td}><span style={{ ...s.badge, background: ps.bg, color: ps.color }}>{claim.insurance_type}</span></td>
                            <td style={s.td}>{formatMAD(claim.amount)}</td>
                            <td style={s.td}>
                              {claim.risk_level
                                ? <span style={{ ...s.badge, background: rs.bg, color: rs.color }}>{claim.risk_level} {claim.risk_score ? `${Math.round(claim.risk_score * 100)}%` : ""}</span>
                                : <span style={s.dash}>—</span>}
                            </td>
                            <td style={s.td}><span style={{ ...s.badge, background: ss.bg, color: ss.color }}>{statusLabel(claim.status)}</span></td>
                            <td style={s.td}>{formatDate(claim.service_date)}</td>
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
                    <div style={s.detailNum}>{selected.claim_number}</div>
                    <div style={s.detailPatient}>{selected.patient_name}</div>
                  </div>
                  <button style={s.closeBtn} onClick={() => setSelected(null)}>✕</button>
                </div>

                <div style={s.detailSection}>
                  <div style={s.detailSectionTitle}>Informations du dossier</div>
                  {[
                    { lbl: "Caisse", val: selected.insurance_type },
                    { lbl: "Type de soin", val: selected.service_type },
                    { lbl: "Montant", val: formatMAD(selected.amount) },
                    { lbl: "Date de soin", val: formatDate(selected.service_date) },
                    { lbl: "Soumis le", val: formatDate(selected.created_at) },
                  ].map(r => (
                    <div key={r.lbl} style={s.detailRow}>
                      <span style={s.detailLbl}>{r.lbl}</span>
                      <span style={s.detailVal}>{r.val}</span>
                    </div>
                  ))}
                </div>

                <div style={s.detailSection}>
                  <div style={s.detailSectionTitle}>Statut</div>
                  <span style={{ ...s.badge, ...statusStyle(selected.status) }}>
                    {statusLabel(selected.status)}
                  </span>
                  {selected.rejection_reason && (
                    <div style={s.rejectionReason}>
                      Motif : {selected.rejection_reason}
                    </div>
                  )}
                </div>

                {selected.risk_level && (
                  <div style={s.detailSection}>
                    <div style={s.detailSectionTitle}>Analyse IA</div>
                    <div style={{ ...s.riskBox, background: riskStyle(selected.risk_level).bg }}>
                      <div style={{ color: riskStyle(selected.risk_level).color, fontWeight: 700, fontSize: 16 }}>
                        {selected.risk_level} — {selected.risk_score ? `${Math.round(selected.risk_score * 100)}%` : ""}
                      </div>
                      {selected.rejection_cause_predicted && (
                        <div style={s.riskCause}>{selected.rejection_cause_predicted}</div>
                      )}
                    </div>
                  </div>
                )}

                {selected.forclusion_deadline && (
                  <div style={s.detailSection}>
                    <div style={s.detailSectionTitle}>Forclusion</div>
                    <div style={s.forclusionBox}>
                      Échéance : <strong>{formatDate(selected.forclusion_deadline)}</strong>
                    </div>
                  </div>
                )}

                 {/* STATUS UPDATE */}
                {selected.status === "pending" && (
                  <div style={s.detailSection}>
                    <div style={s.detailSectionTitle}>Mettre à jour le statut</div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <button
                        style={{ ...s.actionBtn, background: "#DCFCE7", color: "#166534", border: "0.5px solid #86EFAC" }}
                        disabled={updating}
                        onClick={() => { setShowRejectInput(false); setRejectReason(""); updateStatus(selected.id, "approved"); }}
                      >
                        ✓ Approuvé
                      </button>
                      <button
                        style={{ ...s.actionBtn, background: "#FEE2E2", color: "#991B1B", border: "0.5px solid #FCA5A5" }}
                        disabled={updating}
                        onClick={() => setShowRejectInput(true)}
                      >
                        ✗ Rejeté
                      </button>
                    </div>
                    {showRejectInput && (
                      <div>
                        <input
                          style={{ ...s.rejectInput }}
                          placeholder="Motif de rejet (ex: immatriculation invalide)"
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                        />
                        <button
                          style={{ ...s.actionBtn, background: "#FEE2E2", color: "#991B1B", border: "0.5px solid #FCA5A5", marginTop: 6, width: "100%" }}
                          disabled={updating || !rejectReason}
                          onClick={() => updateStatus(selected.id, "rejected")}
                        >
                          {updating ? "Enregistrement..." : "Confirmer le rejet"}
                        </button>
                      </div>
                    )}
                    {updateMsg && (
                      <div style={{ fontSize: 11, marginTop: 8, color: updateMsg.startsWith("✅") ? "#166534" : "#991B1B" }}>
                        {updateMsg}
                      </div>
                    )}
                  </div>
                )}
                {selected.status !== "pending" && (
                  <div style={{ ...s.detailSection, borderBottom: "none" }}>
                    <div style={s.detailSectionTitle}>Feedback IA</div>
                    <div style={{ fontSize: 11, color: "#6B7280", background: "#F0F4FA", borderRadius: 6, padding: "8px 10px" }}>
                      ✅ Résultat enregistré — le modèle XGBoost apprendra de ce dossier lors du prochain cycle d&apos;entraînement.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
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
  filterBar: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" },
  searchInput: { padding: "8px 14px", border: "0.5px solid #D1D5DB", borderRadius: 8, fontSize: 12, color: "#1A1D23", outline: "none", fontFamily: "inherit", background: "#fff", width: 240 },
  chips:   { display: "flex", gap: 5, flexWrap: "wrap" },
  chip:    { fontSize: 10, fontWeight: 500, padding: "4px 10px", borderRadius: 20, cursor: "pointer", border: "0.5px solid #E2E4E9", background: "#fff", color: "#6B7280", fontFamily: "inherit" },
  chipActive: { background: "#E6F1FB", color: "#0F62FE", borderColor: "#B5D4F4" },

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
  claimNum:   { fontFamily: "monospace", fontSize: 11, color: "#1A1D23", fontWeight: 500 },
  patientName:{ fontSize: 12, fontWeight: 500, color: "#1A1D23" },
  badge: { display: "inline-flex", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20 },
  dash:  { fontSize: 11, color: "#9EA3AE" },

  detailPanel:  { width: 300, flexShrink: 0, background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, padding: 16, overflowY: "auto" },
  detailHdr:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 12, borderBottom: "0.5px solid #EEF2F8" },
  detailNum:    { fontSize: 13, fontWeight: 600, color: "#1A1D23", fontFamily: "monospace" },
  detailPatient:{ fontSize: 12, color: "#6B7280", marginTop: 3 },
  closeBtn:     { fontSize: 14, color: "#9EA3AE", cursor: "pointer", border: "none", background: "none", padding: 0 },
  detailSection:{ marginBottom: 16, paddingBottom: 16, borderBottom: "0.5px solid #EEF2F8" },
  detailSectionTitle: { fontSize: 10, fontWeight: 600, color: "#9EA3AE", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 },
  detailRow:    { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 },
  detailLbl:    { fontSize: 12, color: "#6B7280" },
  detailVal:    { fontSize: 12, fontWeight: 500, color: "#1A1D23" },
  rejectionReason: { fontSize: 11, color: "#991B1B", marginTop: 8, background: "#FEE2E2", padding: "6px 10px", borderRadius: 6 },
  riskBox:      { borderRadius: 8, padding: "10px 12px", marginTop: 4 },
  riskCause:    { fontSize: 11, marginTop: 6, lineHeight: 1.5 },
  forclusionBox:{ fontSize: 12, color: "#9A3412", background: "#FFF8F0", border: "0.5px solid #FED7AA", borderRadius: 6, padding: "8px 10px", marginTop: 4 },
  actionBtn:  { fontSize: 11, fontWeight: 600, padding: "7px 14px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", flex: 1 },
  rejectInput:{ width: "100%", padding: "7px 10px", border: "0.5px solid #E2E4E9", borderRadius: 7, fontSize: 11, fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
};