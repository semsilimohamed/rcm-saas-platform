"use client";

// Dashboard home (/dashboard): KPI cards (total, pending, approved, rejected, rejection rate,
// outstanding amount), recent claims, per-payer and AI risk overview.
// Note: the claim-entry modal in this file (openModal) is not reachable from the UI (legacy).
// Data: GET /claims/stats/summary, /claims/with-patients, /patients.

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// ── Types ──────────────────────────────────────────────────────────────────
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

interface Stats {
  total_claims: number;
  pending: number;
  approved: number;
  rejected: number;
  total_amount_mad: number;
  rejection_rate: number;
}

// ── Logo ───────────────────────────────────────────────────────────────────
function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="44" height="44" rx="11" fill="#5B4FE8" />
      <circle cx="22" cy="22" r="6" fill="white" />
      <circle cx="22" cy="22" r="2.8" fill="#5B4FE8" />
      <line x1="22" y1="7"    x2="22" y2="14"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" />
      <line x1="22" y1="30"   x2="22" y2="37"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" />
      <line x1="7"  y1="22"   x2="14" y2="22"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" />
      <line x1="30" y1="22"   x2="37" y2="22"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" />
      <line x1="12"   y1="12"   x2="16.5" y2="16.5" stroke="#C7C2F7" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="27.5" y1="27.5" x2="32"   y2="32"   stroke="#C7C2F7" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="32"   y1="12"   x2="27.5" y2="16.5" stroke="#C7C2F7" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="16.5" y1="27.5" x2="12"   y2="32"   stroke="#C7C2F7" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatMAD(amount: number) {
  return amount.toLocaleString("fr-MA") + " MAD";
}

function riskStyle(level: string | null) {
  if (level === "ÉLEVÉ")  return { bg: "#FEE2E2", color: "#991B1B" };
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
  if (payer === "CNOPS") return { bg: "#EEEDFB", color: "#1E40AF" };
  if (payer === "CNSS")  return { bg: "#F0FDF4", color: "#166534" };
  if (payer === "FAR")   return { bg: "#FFF7ED", color: "#9A3412" };
  return { bg: "#F5F3FF", color: "#6D28D9" };
}

function forclusionLabel(deadline: string | null) {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days < 0)  return { label: "Expiré", urgent: true };
  if (days <= 7) return { label: `J-${days}`, urgent: true };
  return { label: `J+${Math.abs(days)}`, urgent: false };
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\r/g, ""));
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim().replace(/\r/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  }).filter(row => Object.values(row).some(v => v !== ""));
}
// ── Main component ─────────────────────────────────────────────────────────
/**
 * Main dashboard overview. Redirects to /auth/login without a token.
 */
export default function DashboardPage() {
  const [claims, setClaims]       = useState<Claim[]>([]);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("Tous");
  const [showAlert, setShowAlert] = useState(true);

  // Modal state
  const [showModal, setShowModal]   = useState(false);
  const [modalTab, setModalTab]     = useState<"choice" | "manual" | "import">("choice");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg]   = useState("");
  const [importRows, setImportRows]       = useState<Record<string, string>[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal]     = useState(0);
  const [importErrors, setImportErrors]   = useState<string[]>([]);
  const [importDone, setImportDone]       = useState(false);
  const [manualForm, setManualForm] = useState({
    patient_name: "",
    cin: "",
    insurance_type: "CNOPS",
    service_type: "Consultation",
    amount: "",
    service_date: "",
  });

  const loadData = async () => {
    const token    = localStorage.getItem("sihaiq_token");
    const tenantId = localStorage.getItem("sihaiq_tenant_id");
    if (!token || !tenantId) { window.location.href = "/auth/login"; return; }
    try {
      const [cr, sr] = await Promise.all([
        fetch(`${API_URL}/claims/with-patients?tenant_id=${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/claims/stats/summary?tenant_id=${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (cr.ok) setClaims(await cr.json());
      if (sr.ok) setStats(await sr.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const now = Date.now(); // eslint-disable-line react-hooks/purity

  const forclusion = claims.filter(c => {
    if (!c.forclusion_deadline) return false;
    const days = Math.ceil((new Date(c.forclusion_deadline).getTime() - now) / 86400000);
    return days <= 7;
  });

  const filtered = claims.filter(c => {
    if (filter === "En attente")   return c.status === "pending";
    if (filter === "Rejetés")      return c.status === "rejected";
    if (filter === "Risque élevé") return c.risk_level === "ÉLEVÉ";
    return true;
  });

  const scoredClaims = claims.filter(c => c.risk_score !== null && c.risk_score !== undefined);
  const avgRisk = scoredClaims.length
    ? Math.round(scoredClaims.reduce((a, c) => a + (c.risk_score || 0), 0) / scoredClaims.length * 100)
    : 0;

  const userName = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("sihaiq_user") || "{}").name || "Utilisateur"
    : "Utilisateur";

  const userRole = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("sihaiq_user") || "{}").role || "Staff"
    : "Staff";

  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  function openModal() {
    setModalTab("choice");
    setSubmitMsg("");
    setImportFile(null);
    setManualForm({ patient_name: "", cin: "", insurance_type: "CNOPS", service_type: "Consultation", amount: "", service_date: "" });
    setShowModal(true);
  }

  async function handleManualSubmit() {
    if (!manualForm.patient_name || !manualForm.cin || !manualForm.amount || !manualForm.service_date) {
      setSubmitMsg("⚠️ Remplissez tous les champs obligatoires.");
      return;
    }
    setSubmitting(true);
    setSubmitMsg("");
    try {
      const token    = localStorage.getItem("sihaiq_token");
      const tenantId = localStorage.getItem("sihaiq_tenant_id");

      // 1. Create patient
      const pRes = await fetch(`${API_URL}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          full_name:      manualForm.patient_name,
          cin:            manualForm.cin,
          insurance_type: manualForm.insurance_type,
          tenant_id:      tenantId,
        }),
      });
      if (!pRes.ok) {
        const errData = await pRes.json();
        throw new Error(typeof errData.detail.detail === "string" ? errData.detail.detail : JSON.stringify(errData.detail.detail) || "Erreur création patient");
      }
      const patient = await pRes.json();

      // 2. Create claim (SihaIQ score calculated automatically by backend)
      const cRes = await fetch(`${API_URL}/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patient_id:     patient.id,
          tenant_id:      tenantId,
          claim_number:    `CLM-${Date.now()}`,
          insurance_type: manualForm.insurance_type,
          service_type:   manualForm.service_type,
          service_date:   manualForm.service_date,
          amount:         parseFloat(manualForm.amount),
          status:         "pending",
        }),
      });
      if (!cRes.ok) {
        const err = await cRes.json();
        throw new Error(err.detail || "Erreur création dossier");
      }

      setSubmitMsg("✅ Dossier créé — score IA calculé automatiquement.");
      setTimeout(() => {
        setShowModal(false);
        setSubmitMsg("");
        loadData();
      }, 1800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setSubmitMsg("❌ " + message);
    } finally {
      setSubmitting(false);
    }
  }

  

  return (
    <div style={s.shell}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
        .sb-item, .db-chip, .db-btn-ghost, .db-btn-primary, .db-logout, .db-choice, .db-link { transition: all 0.15s ease; }
        .sb-item:hover { background: #F2F1EE !important; color: #1A1814 !important; }
        .db-chip:hover { border-color: #C7C2F7 !important; color: #5B4FE8 !important; }
        .db-btn-ghost:hover { background: #FAFAF7 !important; color: #1A1814 !important; border-color: #D1CEC6 !important; }
        .db-btn-primary:hover:not(:disabled) { background: #4A3FD4 !important; box-shadow: 0 2px 12px rgba(91,79,232,0.35); }
        .db-logout:hover { background: #FEE2E2 !important; }
        .db-choice:hover { border-color: #5B4FE8 !important; transform: translateY(-2px); box-shadow: 0 8px 22px rgba(91,79,232,0.12); }
        .db-link:hover { color: #5B4FE8 !important; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { transition: none !important; animation: none !important; }
          .db-choice:hover { transform: none; }
        }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={s.sidebar}>
        <div style={s.sbTop}>
          <div style={s.sbBrand}>
            <LogoMark size={28} />
            <div>
              <div style={s.sbName}>Siha<span style={s.sbIQ}>IQ</span></div>
              <div style={s.sbRole}>RCM Platform</div>
            </div>
          </div>
        </div>

        <nav style={s.sbNav}>
          <div style={s.sbSec}>Principal</div>
          <a href="/dashboard" style={{ ...s.sbItem, ...s.sbItemActive }}>
            <span style={s.sbItemIcon}></span>
            <span style={s.sbItemLabel}>Tableau de bord</span>
          </a>
          <a href="/dashboard/dossiers" className="sb-item" style={s.sbItem}>
            <span style={s.sbItemIcon}></span>
            <span style={s.sbItemLabel}>Dossiers BAF</span>
            <span style={s.sbBadge}>{stats?.pending ?? 0}</span>
          </a>
          <a href="/dashboard/patients" className="sb-item" style={s.sbItem}>
            <span style={s.sbItemIcon}></span>
            <span style={s.sbItemLabel}>Patients</span>
          </a>
          <a href="/dashboard/prediction" className="sb-item" style={s.sbItem}>
            <span style={s.sbItemIcon}></span>
            <span style={s.sbItemLabel}>Prédiction IA</span>
            <span style={{ ...s.sbBadge, background: "#EEEDFB", color: "#4A3FD4" }}>IA</span>
          </a>
          <div style={s.sbSec}>Analyse</div>
          <a href="/dashboard/performance" className="sb-item" style={s.sbItem}>
            <span style={s.sbItemIcon}></span>
            <span style={s.sbItemLabel}>Performance</span>
          </a>
          <a href="/dashboard/forclusion" className="sb-item" style={s.sbItem}>
            <span style={s.sbItemIcon}></span>
            <span style={s.sbItemLabel}>Forclusion</span>
            <span style={{ ...s.sbBadge, ...s.sbBadgeRed }}>{forclusion.length}</span>
          </a>
          <a href="/dashboard/encours" className="sb-item" style={s.sbItem}>
            <span style={s.sbItemIcon}></span>
            <span style={s.sbItemLabel}>Encours A/R</span>
          </a>
          <a href="/dashboard/financier" className="sb-item" style={s.sbItem}>
            <span style={s.sbItemIcon}></span>
            <span style={s.sbItemLabel}>Activité financière</span>
          </a>
          <a href="/dashboard/comptabilite" className="sb-item" style={s.sbItem}>
          <span style={s.sbItemIcon}></span>
          <span style={s.sbItemLabel}>Comptabilité DAF</span>
          </a>
          <div style={s.sbSec}>Système</div>
          <a href="/dashboard/audit" className="sb-item" style={s.sbItem}>
            <span style={s.sbItemIcon}></span>
            <span style={s.sbItemLabel}>Journal d&apos;audit</span>
          </a>
          <a href="/dashboard/settings" className="sb-item" style={s.sbItem}>
            <span style={s.sbItemIcon}></span>
            <span style={s.sbItemLabel}>Paramètres</span>
          </a>
        </nav>

        <div style={s.sbFooter}>
          <div style={s.sbUser}>
            <div style={s.sbAvatar}>{userInitials}</div>
            <div>
              <div style={s.sbUname}>{userName}</div>
              <div style={s.sbUrole}>{userRole}</div>
            </div>
          </div>
          <button className="db-logout" style={s.logoutBtn} onClick={() => {
            localStorage.removeItem("sihaiq_token");
            localStorage.removeItem("sihaiq_tenant_id");
            localStorage.removeItem("sihaiq_user");
            window.location.href = "/auth/login";
          }}>
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={s.main}>

        {/* TOPBAR */}
        <div style={s.topbar}>
          <div>
            <div style={s.topTitle}>Tableau de bord</div>
            <div style={s.topDate}>
              {userName} · {new Date().toLocaleDateString("fr-MA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div style={s.content}>

          {/* FORCLUSION ALERT */}
          {showAlert && forclusion.length > 0 && (
            <div style={s.alert}>
              <span style={s.alertText}>
                <strong>{forclusion.length} dossier{forclusion.length > 1 ? "s" : ""} à risque de forclusion</strong>
                {" "}— délai légal dans moins de 7 jours. Action immédiate requise.
              </span>
              <a href="/dashboard/forclusion" style={s.alertBtn}>
                Consulter →
              </a>
              <button style={s.alertClose} onClick={() => setShowAlert(false)}>✕</button>
            </div>
          )}

          {/* KPI CARDS */}
          <div style={s.kpiGrid}>
            {[
              { lbl: "Total dossiers", val: loading ? "—" : String(stats?.total_claims ?? 0),          accent: "#5B4FE8", sub: "portefeuille actif" },
              { lbl: "En attente",     val: loading ? "—" : String(stats?.pending ?? 0),               accent: "#F59E0B", sub: `${stats ? Math.round((stats.pending / (stats.total_claims || 1)) * 100) : 0}% du total` },
              { lbl: "Taux de rejet",  val: loading ? "—" : `${stats?.rejection_rate ?? 0}%`,          accent: "#DC2626", sub: "mois en cours" },
              { lbl: "Encours total",  val: loading ? "—" : formatMAD(stats?.total_amount_mad ?? 0),   accent: "#F2711C", sub: "MAD facturés" },
            ].map(k => (
              <div key={k.lbl} style={s.kpi}>
                <div style={{ ...s.kpiAccent, background: k.accent }} />
                <div style={s.kpiLbl}>{k.lbl}</div>
                <div style={{ ...s.kpiVal, color: k.accent }}>{k.val}</div>
                <div style={s.kpiSub}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* MID ROW */}
          <div style={s.midRow}>

            {/* PAYER CHART */}
            <div style={s.card}>
              <div style={s.cardHdr}>
                <span style={s.cardTitle}>Répartition par caisse</span>
                <a href="/dashboard/performance" className="db-link" style={s.cardAction}>Voir détail →</a>
              </div>
              {["CNOPS", "CNSS", "FAR"].map((payer, i) => {
                const count = claims.filter(c => c.insurance_type === payer).length;
                const pct   = claims.length ? Math.round((count / claims.length) * 100) : 0;
                const colors = ["#5B4FE8", "#1D9E75", "#F2711C", "#9CA3AF"];
                return (
                  <div key={payer} style={s.payerRow}>
                    <span style={{ ...s.payerDot, background: colors[i] }} />
                    <span style={s.payerName}>{payer}</span>
                    <div style={s.payerTrack}>
                      <div style={{ ...s.payerFill, width: `${pct}%`, background: colors[i] }} />
                    </div>
                    <span style={s.payerPct}>{pct}%</span>
                  </div>
                );
              })}
              <div style={s.aiCard}>
                <div style={s.aiLbl}>Score de risque IA moyen</div>
                <div style={s.aiVal}>{avgRisk}%</div>
                <div style={s.aiSub}>Moteur SihaIQ · portefeuille actuel</div>
              </div>
            </div>

            {/* STATS BREAKDOWN */}
            <div style={s.card}>
              <div style={s.cardHdr}>
                <span style={s.cardTitle}>Résultats du mois</span>
              </div>
              <div style={s.statBreak}>
                {[
                  { lbl: "Approuvés",  val: stats?.approved ?? 0, color: "#16A34A", bg: "#DCFCE7" },
                  { lbl: "Rejetés",    val: stats?.rejected ?? 0, color: "#DC2626", bg: "#FEE2E2" },
                  { lbl: "En attente", val: stats?.pending  ?? 0, color: "#F59E0B", bg: "#FEF9C3" },
                ].map(b => (
                  <div key={b.lbl} style={{ ...s.statBreakItem, background: b.bg }}>
                    <div style={{ ...s.statBreakVal, color: b.color }}>{loading ? "—" : b.val}</div>
                    <div style={{ ...s.statBreakLbl, color: b.color }}>{b.lbl}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={s.cardTitle}>Dossiers à risque élevé</div>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {claims.filter(c => c.risk_level === "ÉLEVÉ").slice(0, 3).map(c => (
                    <div key={c.id} style={s.riskItem}>
                      <span style={s.riskNum}>{c.claim_number}</span>
                      <span style={s.riskScore}>{c.risk_score ? `${Math.round(c.risk_score * 100)}%` : "—"}</span>
                    </div>
                  ))}
                  {claims.filter(c => c.risk_level === "ÉLEVÉ").length === 0 && (
                    <div style={{ fontSize: 12, color: "#9C9890" }}>Aucun dossier à risque élevé</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CLAIMS TABLE */}
          <div style={s.tableCard}>
            <div style={s.tableHdr}>
              <span style={s.cardTitle}>Dossiers récents</span>
              <div style={s.filters}>
                {["Tous", "En attente", "Rejetés", "Risque élevé"].map(f => (
                  <button
                    key={f}
                    className="db-chip" style={filter === f ? { ...s.chip, ...s.chipActive } : s.chip}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <div style={s.loading}>Chargement des dossiers depuis Supabase...</div>
            ) : filtered.length === 0 ? (
              <div style={s.loading}>Aucun dossier trouvé.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["N° dossier", "Patient", "Caisse", "Montant", "Risque IA", "Statut", "Forclusion"].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(claim => {
                      const forc = forclusionLabel(claim.forclusion_deadline);
                      const rs   = riskStyle(claim.risk_level);
                      const ss   = statusStyle(claim.status);
                      const ps   = payerStyle(claim.insurance_type);
                      return (
                        <tr key={claim.id} style={s.tr}>
                          <td style={s.td}><span style={s.claimNum}>{claim.claim_number}</span></td>
                          <td style={s.td}><span style={s.patientName}>{claim.patient_name}</span></td>
                          <td style={s.td}>
                            <span style={{ ...s.badge, background: ps.bg, color: ps.color }}>
                              {claim.insurance_type}
                            </span>
                          </td>
                          <td style={s.td}>{formatMAD(claim.amount)}</td>
                          <td style={s.td}>
                            {claim.risk_level ? (
                              <div style={s.riskCell}>
                                <span style={{ ...s.riskPill, background: rs.bg, color: rs.color }}>
                                  {claim.risk_level}
                                </span>
                                <div style={s.riskTrack}>
                                  <div style={{ ...s.riskFill, width: `${Math.round((claim.risk_score || 0) * 100)}%`, background: rs.color }} />
                                </div>
                              </div>
                            ) : <span style={{ fontSize: 11, color: "#9C9890" }}>—</span>}
                          </td>
                          <td style={s.td}>
                            <span style={{ ...s.badge, background: ss.bg, color: ss.color }}>
                              {statusLabel(claim.status)}
                            </span>
                          </td>
                          <td style={s.td}>
                            {forc ? (
                              <span style={{ fontSize: 11, fontWeight: 600, color: forc.urgent ? "#DC2626" : "#9C9890" }}>
                                {forc.label}
                              </span>
                            ) : <span style={{ fontSize: 11, color: "#9C9890" }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── NOUVEAU DOSSIER MODAL ── */}
      {showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={s.modalHdr}>
              <div>
                <div style={s.modalTitle}>Nouveau dossier</div>
                <div style={s.modalSub}>Importez un fichier ou créez un dossier manuellement</div>
              </div>
              <button style={s.modalClose} onClick={() => setShowModal(false)}>✕</button>
            </div>

            {/* ── STEP 1: Choose path ── */}
            {modalTab === "choice" && (
              <div style={s.choiceGrid}>
                <button className="db-choice" style={s.choiceCard} onClick={() => { setSubmitMsg(""); setModalTab("import"); }}>
                  <div style={s.choiceIcon}>📂</div>
                  <div style={s.choiceLabel}>Importer un fichier</div>
                  <div style={s.choiceSub}>Excel (.xlsx) ou CSV · plusieurs dossiers en une fois</div>
                </button>
                <button className="db-choice" style={s.choiceCard} onClick={() => { setSubmitMsg(""); setModalTab("manual"); }}>
                  <div style={s.choiceIcon}>✏️</div>
                  <div style={s.choiceLabel}>Saisie manuelle</div>
                  <div style={s.choiceSub}>Un nouveau patient + dossier BAF avec score IA automatique</div>
                </button>
              </div>
            )}

            {/* ── STEP 2A: Import file ── */}
            {modalTab === "import" && (
              <div style={{ padding: "0 0 8px" }}>
                <button style={s.backBtn} onClick={() => setModalTab("choice")}>← Retour</button>

                <div
                  style={s.dropzone}
                  onDragOver={e => e.preventDefault()}
                  onDrop={async e => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (!file) return;
                    setImportFile(file);
                    setImportDone(false);
                    setImportErrors([]);
                    setImportProgress(0);
                    const text = await file.text();
                    const rows = parseCSV(text);
                    setImportRows(rows);
                    setImportTotal(rows.length);
                  }}
                >
                  {importFile ? (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#5B4FE8", marginBottom: 4 }}>
                        📄 {importFile.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#9C9890" }}>
                        {(importFile.size / 1024).toFixed(1)} KB · prêt à importer
                      </div>
                      <button
                        style={{ ...s.fileBtnSmall, marginTop: 10 }}
                        onClick={() => setImportFile(null)}
                      >
                        Changer de fichier
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📥</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#5C5852" }}>
                        Glissez votre fichier ici
                      </div>
                      <div style={{ fontSize: 11, color: "#9C9890", marginTop: 4 }}>
                        Excel (.xlsx) ou CSV acceptés
                      </div>
                      <label className="db-btn-primary" style={s.fileBtn}>
                        Parcourir
                        <input
                          type="file"
                          accept=".csv,.xlsx"
                          style={{ display: "none" }}
                          onChange={async e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setImportFile(file);
                          setImportDone(false);
                          setImportErrors([]);
                          setImportProgress(0);
                          const text = await file.text();
                          const rows = parseCSV(text);
                          setImportRows(rows);
                          setImportTotal(rows.length);
                        }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div style={s.infoBox}>
                  <strong>Format attendu des colonnes :</strong><br />
                  patient_name · cin · insurance_type (CNOPS / CNSS / FAR)<br />
                  service_type · service_date (YYYY-MM-DD) · amount
                </div>

                {importFile && importRows.length > 0 && !importDone && (
                  <div>
                    <div style={{ fontSize: 11, color: "#5C5852", margin: "8px 22px 4px", background: "#F2F1EE", borderRadius: 6, padding: "8px 10px" }}>
                      📊 {importRows.length} dossier{importRows.length > 1 ? "s" : ""} détecté{importRows.length > 1 ? "s" : ""} dans le fichier
                    </div>
                    {importProgress > 0 && (
                      <div style={{ margin: "8px 22px" }}>
                        <div style={{ fontSize: 11, color: "#4A3FD4", marginBottom: 4 }}>
                          Importation en cours... {importProgress}/{importTotal}
                        </div>
                        <div style={{ background: "#EEEDFB", borderRadius: 4, height: 6 }}>
                          <div style={{ background: "#5B4FE8", borderRadius: 4, height: 6, width: `${(importProgress / importTotal) * 100}%`, transition: "width 0.2s" }} />
                        </div>
                      </div>
                    )}
                    <button
                      className="db-btn-primary" style={{ ...s.submitBtn, opacity: submitting ? 0.6 : 1 }}
                      disabled={submitting}
                      onClick={async () => {
                        setSubmitting(true);
                        setImportErrors([]);
                        setImportProgress(0);
                        const token    = localStorage.getItem("sihaiq_token");
                        const tenantId = localStorage.getItem("sihaiq_tenant_id");
                        const errors: string[] = [];
                        let done = 0;
                        for (const row of importRows) {
                          try {
                            // Create patient
                            const pRes = await fetch(`${API_URL}/patients`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                              body: JSON.stringify({
                                full_name:      row["patient_name"] || "Inconnu",
                                cin:            row["cin"] || "000000",
                                insurance_type: row["insurance_type"] || "CNOPS",
                                tenant_id:      tenantId,
                              }),
                            });
                            if (!pRes.ok) throw new Error(`Patient ${row["patient_name"]}: erreur création`);
                            const patient = await pRes.json();
                            // Create claim
                            const cRes = await fetch(`${API_URL}/claims`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                              body: JSON.stringify({
                                patient_id:     patient.id,
                                tenant_id:      tenantId,
                                claim_number:   `CLM-IMP-${Date.now()}-${done}`,
                                insurance_type: row["insurance_type"] || "CNOPS",
                                service_type:   row["service_type"] || "Consultation",
                                service_date:   row["service_date"] || new Date().toISOString().split("T")[0],
                                amount:         parseFloat(row["amount"]) || 0,
                                status:         "pending",
                              }),
                            });
                            if (!cRes.ok) throw new Error(`Dossier ${row["patient_name"]}: erreur création`);
                          } catch (err: unknown) {
                            const msg = err instanceof Error ? err.message : "Erreur inconnue";
                            errors.push(msg);
                          }
                          done++;
                          setImportProgress(done);
                        }
                        setImportErrors(errors);
                        setImportDone(true);
                        setSubmitting(false);
                        if (errors.length === 0) {
                          setTimeout(() => {
                            setShowModal(false);
                            setImportFile(null);
                            setImportRows([]);
                            setImportDone(false);
                            loadData();
                          }, 2000);
                        }
                      }}
                    >
                      {submitting ? `Importation... ${importProgress}/${importTotal}` : `Importer ${importRows.length} dossier${importRows.length > 1 ? "s" : ""}`}
                    </button>
                  </div>
                )}
                {importDone && (
                  <div style={{ margin: "8px 22px 14px" }}>
                    {importErrors.length === 0 ? (
                      <div style={s.successMsg}>
                        ✅ {importTotal} dossier{importTotal > 1 ? "s" : ""} importé{importTotal > 1 ? "s" : ""} avec succès — scores IA calculés automatiquement.
                      </div>
                    ) : (
                      <div>
                        <div style={s.successMsg}>✅ {importTotal - importErrors.length} dossier{importTotal - importErrors.length > 1 ? "s" : ""} importé{importTotal - importErrors.length > 1 ? "s" : ""}</div>
                        <div style={s.errorMsg}>❌ {importErrors.length} erreur{importErrors.length > 1 ? "s" : ""} : {importErrors.join(" | ")}</div>
                      </div>
                    )}
                  </div>
                )}

                {submitMsg && (
                  <div style={submitMsg.startsWith("✅") ? s.successMsg : s.errorMsg}>
                    {submitMsg}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2B: Manual entry ── */}
            {modalTab === "manual" && (
              <div style={{ padding: "0 0 8px" }}>
                <button style={s.backBtn} onClick={() => setModalTab("choice")}>← Retour</button>

                <div style={s.formGrid}>
                  <div style={s.formGroup}>
                    <label style={s.formLabel}>Nom complet patient *</label>
                    <input
                      style={s.formInput}
                      placeholder="Ex : Youssef Benali"
                      value={manualForm.patient_name}
                      onChange={e => setManualForm({ ...manualForm, patient_name: e.target.value })}
                    />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.formLabel}>CIN *</label>
                    <input
                      style={s.formInput}
                      placeholder="Ex : BE123456"
                      value={manualForm.cin}
                      onChange={e => setManualForm({ ...manualForm, cin: e.target.value })}
                    />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.formLabel}>Caisse *</label>
                    <select
                      style={s.formInput}
                      value={manualForm.insurance_type}
                      onChange={e => setManualForm({ ...manualForm, insurance_type: e.target.value })}
                    >
                      {["CNOPS", "CNSS", "FAR"].map(p => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.formLabel}>Type de service *</label>
                    <select
                      style={s.formInput}
                      value={manualForm.service_type}
                      onChange={e => setManualForm({ ...manualForm, service_type: e.target.value })}
                    >
                      {["Consultation", "Hospitalisation", "Chirurgie", "Radiologie", "Biologie", "Urgences", "Kinésithérapie"].map(t => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.formLabel}>Date de service *</label>
                    <input
                      style={s.formInput}
                      type="date"
                      value={manualForm.service_date}
                      onChange={e => setManualForm({ ...manualForm, service_date: e.target.value })}
                    />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.formLabel}>Montant réclamé (MAD) *</label>
                    <input
                      style={s.formInput}
                      type="number"
                      placeholder="Ex : 1500"
                      value={manualForm.amount}
                      onChange={e => setManualForm({ ...manualForm, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div style={s.aiHint}>
                  🧠 Le score de risque IA sera calculé automatiquement par SihaIQ à la création.
                </div>

                <button
                  className="db-btn-primary" style={{ ...s.submitBtn, opacity: submitting ? 0.6 : 1 }}
                  disabled={submitting}
                  onClick={handleManualSubmit}
                >
                  {submitting ? "Création en cours..." : "Créer le dossier"}
                </button>

                {submitMsg && (
                  <div style={submitMsg.startsWith("✅") ? s.successMsg : s.errorMsg}>
                    {submitMsg}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  shell:   { display: "flex", height: "100vh", overflow: "hidden", background: "#F2F1EE", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" },

  // Sidebar
  sidebar:      { width: 210, flexShrink: 0, background: "#fff", borderRight: "0.5px solid #E5E3DD", display: "flex", flexDirection: "column" },
  sbTop:        { padding: "16px 14px 12px", borderBottom: "0.5px solid #F2F1EE" },
  sbBrand:      { display: "flex", alignItems: "center", gap: 9 },
  sbName:       { fontSize: 15, fontWeight: 300, color: "#1A1814", letterSpacing: "-0.02em", lineHeight: 1.1 },
  sbIQ:         { fontWeight: 800, color: "#5B4FE8" },
  sbRole:       { fontSize: 9, fontWeight: 600, color: "#9C9890", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 },
  sbNav:        { flex: 1, padding: "10px 8px", overflowY: "auto" },
  sbSec:        { fontSize: 9, fontWeight: 600, color: "#C7C2F7", textTransform: "uppercase", letterSpacing: "0.1em", padding: "10px 8px 4px" },
  sbItem:       { display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 7, cursor: "pointer", color: "#5C5852", fontSize: 12, border: "none", background: "none", width: "100%", textAlign: "left", marginBottom: 1, textDecoration: "none" },
  sbItemActive: { background: "#EEEDFB", color: "#5B4FE8", fontWeight: 500 },
  sbItemIcon:   { fontSize: 14, flexShrink: 0 },
  sbItemLabel:  { flex: 1 },
  sbBadge:      { fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 10, background: "#EEEDFB", color: "#4A3FD4" },
  sbBadgeRed:   { background: "#FEE2E2", color: "#DC2626" },
  sbFooter:     { padding: "10px 8px", borderTop: "0.5px solid #F2F1EE" },
  sbUser:       { display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 7 },
  sbAvatar:     { width: 26, height: 26, borderRadius: "50%", background: "#EEEDFB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#5B4FE8", flexShrink: 0 },
  sbUname:      { fontSize: 11, fontWeight: 500, color: "#1A1814" },
  sbUrole:      { fontSize: 10, color: "#9C9890" },
  logoutBtn:    { width: "100%", padding: "8px", borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: "pointer", border: "0.5px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", fontFamily: "inherit", marginTop: 8 },

  // Main area
  main:     { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topbar:   { background: "#fff", borderBottom: "0.5px solid #E5E3DD", padding: "0 20px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  topTitle: { fontSize: 14, fontWeight: 600, color: "#1A1814", letterSpacing: "-0.01em" },
  topDate:  { fontSize: 11, color: "#9C9890", marginTop: 2 },
  topBtns:  { display: "flex", gap: 8, alignItems: "center" },
  topBtn:   { fontSize: 11, fontWeight: 500, padding: "6px 14px", borderRadius: 7, cursor: "pointer", border: "0.5px solid #E5E3DD", background: "#fff", color: "#5C5852", fontFamily: "inherit" },
  topBtnPrimary: { fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 7, cursor: "pointer", border: "none", background: "#5B4FE8", color: "#fff", fontFamily: "inherit" },

  content: { flex: 1, overflowY: "auto", padding: "16px 20px" },

  // Alert
  alert:      { background: "#FFF8F0", border: "0.5px solid #FED7AA", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 14 },
  alertIcon:  { fontSize: 14, color: "#EA580C", flexShrink: 0 },
  alertText:  { fontSize: 12, color: "#9A3412", flex: 1 },
  alertClose: { fontSize: 12, color: "#9A3412", cursor: "pointer", border: "none", background: "none", padding: 0 },
  alertBtn: { fontSize: 11, fontWeight: 600, color: "#9A3412", background: "#FED7AA", padding: "4px 10px", borderRadius: 6, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 },

  // KPI
  kpiGrid:  { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 },
  kpi:      { background: "#fff", border: "0.5px solid #E5E3DD", borderRadius: 10, padding: "14px 14px 12px", position: "relative", overflow: "hidden" },
  kpiAccent:{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "10px 10px 0 0" },
  kpiLbl:   { fontSize: 9, fontWeight: 600, color: "#9C9890", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 },
  kpiVal:   { fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 },
  kpiSub:   { fontSize: 10, color: "#9C9890", marginTop: 5 },

  // Mid row
  midRow:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 },
  card:     { background: "#fff", border: "0.5px solid #E5E3DD", borderRadius: 10, padding: 16 },
  cardHdr:  { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cardTitle:{ fontSize: 12, fontWeight: 600, color: "#1A1814" },
  cardAction:{ fontSize: 11, color: "#7B72F0", cursor: "pointer", textDecoration: "none" },

  payerRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  payerDot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },
  payerName:{ fontSize: 11, color: "#5C5852", width: 80, flexShrink: 0 },
  payerTrack:{ flex: 1, height: 4, background: "#F2F1EE", borderRadius: 2, overflow: "hidden" },
  payerFill:{ height: "100%", borderRadius: 2 },
  payerPct: { fontSize: 11, fontWeight: 500, color: "#1A1814", minWidth: 28, textAlign: "right" },

  aiCard:   { background: "#EEEDFB", border: "0.5px solid #C7C2F7", borderRadius: 8, padding: "10px 12px", marginTop: 12 },
  aiLbl:    { fontSize: 9, fontWeight: 600, color: "#4A3FD4", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 },
  aiVal:    { fontSize: 18, fontWeight: 700, color: "#5B4FE8" },
  aiSub:    { fontSize: 9, color: "#7B72F0", marginTop: 2 },

  statBreak:    { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 },
  statBreakItem:{ borderRadius: 8, padding: "10px 8px", textAlign: "center" },
  statBreakVal: { fontSize: 18, fontWeight: 700 },
  statBreakLbl: { fontSize: 10, fontWeight: 500, marginTop: 3 },

  riskItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: "#FFF8F0", borderRadius: 6, border: "0.5px solid #FED7AA" },
  riskNum:  { fontSize: 11, fontFamily: "monospace", color: "#1A1814" },
  riskScore:{ fontSize: 11, fontWeight: 600, color: "#DC2626" },

  // Table
  tableCard:{ background: "#fff", border: "0.5px solid #E5E3DD", borderRadius: 10, overflow: "hidden" },
  tableHdr: { padding: "12px 16px", borderBottom: "0.5px solid #F2F1EE", display: "flex", alignItems: "center", justifyContent: "space-between" },
  filters:  { display: "flex", gap: 5 },
  chip:     { fontSize: 10, fontWeight: 500, padding: "3px 9px", borderRadius: 20, cursor: "pointer", border: "0.5px solid #E5E3DD", background: "#fff", color: "#5C5852", fontFamily: "inherit" },
  chipActive:{ background: "#EEEDFB", color: "#5B4FE8", borderColor: "#C7C2F7" },
  loading:  { padding: "24px 16px", fontSize: 13, color: "#9C9890" },
  table:    { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th:       { textAlign: "left", padding: "8px 14px", fontSize: 9, fontWeight: 600, color: "#9C9890", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "0.5px solid #F2F1EE", background: "#FAFAF7", whiteSpace: "nowrap" },
  tr:       { borderBottom: "0.5px solid #F5F4F1" },
  td:       { padding: "10px 14px", verticalAlign: "middle" },
  claimNum: { fontFamily: "monospace", fontSize: 11, color: "#1A1814", fontWeight: 500 },
  patientName:{ fontSize: 12, fontWeight: 500, color: "#1A1814" },
  badge:    { display: "inline-flex", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20 },
  riskCell: { display: "flex", alignItems: "center", gap: 6 },
  riskPill: { fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 20, whiteSpace: "nowrap" },
  riskTrack:{ width: 36, height: 3, background: "#F2F1EE", borderRadius: 2, overflow: "hidden" },
  riskFill: { height: "100%", borderRadius: 2 },

  // Modal
  overlay:    { position: "fixed", inset: 0, background: "rgba(26,24,20,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal:      { background: "#fff", borderRadius: 14, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" },
  modalHdr:   { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 22px 16px", borderBottom: "0.5px solid #F2F1EE" },
  modalTitle: { fontSize: 15, fontWeight: 600, color: "#1A1814" },
  modalSub:   { fontSize: 11, color: "#9C9890", marginTop: 3 },
  modalClose: { background: "none", border: "none", fontSize: 16, color: "#9C9890", cursor: "pointer", padding: "0 0 0 8px", lineHeight: 1 },
  choiceGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: 20 },
  choiceCard: { background: "#FAFAF7", border: "1.5px solid #E5E3DD", borderRadius: 12, padding: "22px 16px", cursor: "pointer", textAlign: "center", fontFamily: "inherit", transition: "border-color 0.15s" },
  choiceIcon: { fontSize: 30, marginBottom: 10 },
  choiceLabel:{ fontSize: 13, fontWeight: 600, color: "#1A1814", marginBottom: 6 },
  choiceSub:  { fontSize: 11, color: "#9C9890", lineHeight: 1.6 },
  backBtn:    { background: "none", border: "none", fontSize: 12, color: "#7B72F0", cursor: "pointer", padding: "8px 22px 4px", fontFamily: "inherit", display: "block" },
  dropzone:   { margin: "0 22px", border: "2px dashed #C7C2F7", borderRadius: 10, padding: "32px 20px", textAlign: "center", background: "#F8F7FE" },
  fileBtn:    { display: "inline-block", marginTop: 14, padding: "7px 18px", background: "#5B4FE8", color: "#fff", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer" },
  fileBtnSmall:{ display: "inline-block", padding: "5px 12px", background: "#EEEDFB", color: "#4A3FD4", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer", border: "none", fontFamily: "inherit" },
  infoBox:    { margin: "12px 22px 4px", background: "#F2F1EE", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "#5C5852", lineHeight: 1.9 },
  formGrid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "4px 22px 0" },
  formGroup:  { display: "flex", flexDirection: "column", gap: 4 },
  formLabel:  { fontSize: 10, fontWeight: 600, color: "#5C5852", textTransform: "uppercase", letterSpacing: "0.06em" },
  formInput:  { padding: "8px 10px", border: "0.5px solid #E5E3DD", borderRadius: 7, fontSize: 12, color: "#1A1814", background: "#fff", fontFamily: "inherit", outline: "none" },
  aiHint:     { margin: "12px 22px 0", background: "#EEEDFB", borderRadius: 8, padding: "9px 12px", fontSize: 11, color: "#4A3FD4" },
  submitBtn:  { display: "block", width: "calc(100% - 44px)", margin: "14px 22px 4px", padding: "11px", background: "#5B4FE8", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  successMsg: { margin: "4px 22px 14px", padding: "10px 12px", background: "#DCFCE7", border: "0.5px solid #86EFAC", borderRadius: 8, fontSize: 12, color: "#166534" },
  errorMsg:   { margin: "4px 22px 14px", padding: "10px 12px", background: "#FEE2E2", border: "0.5px solid #FCA5A5", borderRadius: 8, fontSize: 12, color: "#991B1B" },
};