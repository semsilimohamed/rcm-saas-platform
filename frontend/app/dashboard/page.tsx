"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "b32546f4-bb8d-4ed6-b353-b80fb1d8a80f";

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── Logo mark ─────────────────────────────────────────────────────────────────
function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="44" height="44" rx="11" fill="#0F62FE" />
      <circle cx="22" cy="22" r="6" fill="white" />
      <circle cx="22" cy="22" r="2.8" fill="#0F62FE" />
      <line x1="22" y1="7"    x2="22" y2="14"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" />
      <line x1="22" y1="30"   x2="22" y2="37"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" />
      <line x1="7"  y1="22"   x2="14" y2="22"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" />
      <line x1="30" y1="22"   x2="37" y2="22"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" />
      <line x1="12"   y1="12"   x2="16.5" y2="16.5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="27.5" y1="27.5" x2="32"   y2="32"   stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="32"   y1="12"   x2="27.5" y2="16.5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="16.5" y1="27.5" x2="12"   y2="32"   stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatMAD(amount: number) {
  return amount.toLocaleString("fr-MA") + " MAD";
}


function riskStyle(level: string | null) {
  if (level === "ÉLEVÉ")   return { bg: "#FEE2E2", color: "#991B1B" };
  if (level === "MODÉRÉ")  return { bg: "#FEF9C3", color: "#854D0E" };
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
  if (payer === "CNSS")  return { bg: "#F0FDF4", color: "#166534" };
  if (payer === "AMO")   return { bg: "#FFF7ED", color: "#9A3412" };
  return { bg: "#F5F3FF", color: "#6D28D9" };
}

function forclusionLabel(deadline: string | null) {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days < 0)  return { label: "Expiré", urgent: true };
  if (days <= 7) return { label: `J-${days}`, urgent: true };
  return { label: `J+${Math.abs(days)}`, urgent: false };
}

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV = [
  { icon: "📊", label: "Tableau de bord", active: true },
  { icon: "📋", label: "Dossiers BAF",    badge: "5" },
  { icon: "👥", label: "Patients" },
  { icon: "🧠", label: "Prédiction IA",   badge: "IA" },
  { icon: "📈", label: "Performance" },
  { icon: "⚠️", label: "Forclusion",      badge: "3", badgeRed: true },
  { icon: "💰", label: "Encours A/R" },
  { icon: "📜", label: "Journal d'audit" },
  { icon: "⚙️", label: "Paramètres" },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [claims, setClaims]   = useState<Claim[]>([]);
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("Tous");
  const [showAlert, setShowAlert] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [cr, sr] = await Promise.all([
          fetch(`${API_URL}/claims/with-patients?tenant_id=${TENANT_ID}`),
          fetch(`${API_URL}/claims/stats/summary?tenant_id=${TENANT_ID}`),
        ]);
        if (cr.ok) setClaims(await cr.json());
        if (sr.ok) setStats(await sr.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const now = new Date().getTime();
  const forclusion = claims.filter(c => {
  if (!c.forclusion_deadline) return false;
  const days = Math.ceil((new Date(c.forclusion_deadline).getTime() - now) / 86400000);
  return days <= 7;
});

  const filtered = claims.filter(c => {
    if (filter === "En attente") return c.status === "pending";
    if (filter === "Rejetés")    return c.status === "rejected";
    if (filter === "Risque élevé") return c.risk_level === "ÉLEVÉ";
    return true;
  });

  const scoredClaims = claims.filter(c => c.risk_score !== null && c.risk_score !== undefined);
  const avgRisk = scoredClaims.length
    ? Math.round(scoredClaims.reduce((a, c) => a + (c.risk_score || 0), 0) / scoredClaims.length * 100)
    : 0;

  return (
    <div style={s.shell}>

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
          {NAV.slice(0, 4).map(n => (
            <button key={n.label} style={n.active ? { ...s.sbItem, ...s.sbItemActive } : s.sbItem}>
              <span style={s.sbItemIcon}>{n.icon}</span>
              <span style={s.sbItemLabel}>{n.label}</span>
              {n.badge && (
                <span style={n.badgeRed ? { ...s.sbBadge, ...s.sbBadgeRed } : s.sbBadge}>
                  {n.badge}
                </span>
              )}
            </button>
          ))}
          <div style={s.sbSec}>Analyse</div>
          {NAV.slice(4, 7).map(n => (
            <button key={n.label} style={s.sbItem}>
              <span style={s.sbItemIcon}>{n.icon}</span>
              <span style={s.sbItemLabel}>{n.label}</span>
              {n.badge && (
                <span style={n.badgeRed ? { ...s.sbBadge, ...s.sbBadgeRed } : s.sbBadge}>
                  {n.badge}
                </span>
              )}
            </button>
          ))}
          <div style={s.sbSec}>Système</div>
          {NAV.slice(7).map(n => (
            <button key={n.label} style={s.sbItem}>
              <span style={s.sbItemIcon}>{n.icon}</span>
              <span style={s.sbItemLabel}>{n.label}</span>
            </button>
          ))}
        </nav>

        <div style={s.sbFooter}>
          <div style={s.sbUser}>
            <div style={s.sbAvatar}>MS</div>
            <div>
              <div style={s.sbUname}>M. Semsili</div>
              <div style={s.sbUrole}>Administrateur</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={s.main}>

        {/* TOPBAR */}
        <div style={s.topbar}>
          <div>
            <div style={s.topTitle}>Tableau de bord</div>
            <div style={s.topDate}>
              Clinique SEMSILI · {new Date().toLocaleDateString("fr-MA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          <div style={s.topBtns}>
            <button style={s.topBtn}>Exporter</button>
            <button style={s.topBtnPrimary}>+ Nouveau dossier</button>
          </div>
        </div>

        {/* CONTENT */}
        <div style={s.content}>

          {/* FORCLUSION ALERT */}
          {showAlert && forclusion.length > 0 && (
            <div style={s.alert}>
              <span style={s.alertIcon}>⚠</span>
              <span style={s.alertText}>
                <strong>{forclusion.length} dossier{forclusion.length > 1 ? "s" : ""} à risque de forclusion</strong>
                {" "}— délai légal dans moins de 7 jours. Action immédiate requise.
              </span>
              <button style={s.alertClose} onClick={() => setShowAlert(false)}>✕</button>
            </div>
          )}

          {/* KPI CARDS */}
          <div style={s.kpiGrid}>
            {[
              { lbl: "Total dossiers",  val: loading ? "—" : String(stats?.total_claims ?? 0),        accent: "#0F62FE", sub: "portefeuille actif" },
              { lbl: "En attente",      val: loading ? "—" : String(stats?.pending ?? 0),              accent: "#F59E0B", sub: `${stats ? Math.round((stats.pending / stats.total_claims) * 100) : 0}% du total` },
              { lbl: "Taux de rejet",   val: loading ? "—" : `${stats?.rejection_rate ?? 0}%`,         accent: "#DC2626", sub: "mois en cours" },
              { lbl: "Encours total",   val: loading ? "—" : formatMAD(stats?.total_amount_mad ?? 0),  accent: "#8B5CF6", sub: "MAD facturés" },
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
                <span style={s.cardAction}>Voir détail →</span>
              </div>
              {["CNOPS", "CNSS", "AMO", "AMO TADAMON"].map((payer, i) => {
                const count = claims.filter(c => c.insurance_type === payer).length;
                const pct = claims.length ? Math.round((count / claims.length) * 100) : 0;
                const colors = ["#0F62FE", "#16A34A", "#F59E0B", "#8B5CF6"];
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
                <div style={s.aiSub}>Moteur XGBoost · portefeuille actuel</div>
              </div>
            </div>

            {/* STATS BREAKDOWN */}
            <div style={s.card}>
              <div style={s.cardHdr}>
                <span style={s.cardTitle}>Résultats du mois</span>
              </div>
              <div style={s.statBreak}>
                {[
                  { lbl: "Approuvés",  val: stats?.approved ?? 0,  color: "#16A34A", bg: "#DCFCE7" },
                  { lbl: "Rejetés",    val: stats?.rejected ?? 0,  color: "#DC2626", bg: "#FEE2E2" },
                  { lbl: "En attente", val: stats?.pending ?? 0,   color: "#F59E0B", bg: "#FEF9C3" },
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
                    <div style={{ fontSize: 12, color: "#9EA3AE" }}>Aucun dossier à risque élevé</div>
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
                    style={filter === f ? { ...s.chip, ...s.chipActive } : s.chip}
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
                      const rs = riskStyle(claim.risk_level);
                      const ss = statusStyle(claim.status);
                      const ps = payerStyle(claim.insurance_type);
                      return (
                        <tr key={claim.id} style={s.tr}>
                          <td style={s.td}>
                            <span style={s.claimNum}>{claim.claim_number}</span>
                          </td>
                          <td style={s.td}>
                            <span style={s.patientName}>{claim.patient_name}</span>
                          </td>
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
                            ) : <span style={{ fontSize: 11, color: "#9EA3AE" }}>—</span>}
                          </td>
                          <td style={s.td}>
                            <span style={{ ...s.badge, background: ss.bg, color: ss.color }}>
                              {statusLabel(claim.status)}
                            </span>
                          </td>
                          <td style={s.td}>
                            {forc ? (
                              <span style={{ fontSize: 11, fontWeight: 600, color: forc.urgent ? "#DC2626" : "#9EA3AE" }}>
                                {forc.label}
                              </span>
                            ) : <span style={{ fontSize: 11, color: "#9EA3AE" }}>—</span>}
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
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  shell:    { display: "flex", height: "100vh", overflow: "hidden", background: "#F0F4FA", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" },

  // sidebar
  sidebar:      { width: 210, flexShrink: 0, background: "#fff", borderRight: "0.5px solid #E2E4E9", display: "flex", flexDirection: "column" },
  sbTop:        { padding: "16px 14px 12px", borderBottom: "0.5px solid #EEF2F8" },
  sbBrand:      { display: "flex", alignItems: "center", gap: 9 },
  sbName:       { fontSize: 15, fontWeight: 300, color: "#0C1B33", letterSpacing: "-0.02em", lineHeight: 1.1 },
  sbIQ:         { fontWeight: 800, color: "#0F62FE" },
  sbRole:       { fontSize: 9, fontWeight: 600, color: "#9EA3AE", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 },
  sbNav:        { flex: 1, padding: "10px 8px", overflowY: "auto" },
  sbSec:        { fontSize: 9, fontWeight: 600, color: "#B5D4F4", textTransform: "uppercase", letterSpacing: "0.1em", padding: "10px 8px 4px" },
  sbItem:       { display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 7, cursor: "pointer", color: "#6B7280", fontSize: 12, border: "none", background: "none", width: "100%", textAlign: "left", marginBottom: 1 },
  sbItemActive: { background: "#E6F1FB", color: "#0F62FE", fontWeight: 500 },
  sbItemIcon:   { fontSize: 14, flexShrink: 0 },
  sbItemLabel:  { flex: 1 },
  sbBadge:      { fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 10, background: "#E6F1FB", color: "#185FA5" },
  sbBadgeRed:   { background: "#FEE2E2", color: "#DC2626" },
  sbFooter:     { padding: "10px 8px", borderTop: "0.5px solid #EEF2F8" },
  sbUser:       { display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 7 },
  sbAvatar:     { width: 26, height: 26, borderRadius: "50%", background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#0F62FE", flexShrink: 0 },
  sbUname:      { fontSize: 11, fontWeight: 500, color: "#1A1D23" },
  sbUrole:      { fontSize: 10, color: "#9EA3AE" },

  // main
  main:    { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topbar:  { background: "#fff", borderBottom: "0.5px solid #E2E4E9", padding: "0 20px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  topTitle:{ fontSize: 14, fontWeight: 600, color: "#1A1D23", letterSpacing: "-0.01em" },
  topDate: { fontSize: 11, color: "#9EA3AE", marginTop: 2 },
  topBtns: { display: "flex", gap: 8 },
  topBtn:  { fontSize: 11, fontWeight: 500, padding: "6px 14px", borderRadius: 7, cursor: "pointer", border: "0.5px solid #E2E4E9", background: "#fff", color: "#6B7280", fontFamily: "inherit" },
  topBtnPrimary: { fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 7, cursor: "pointer", border: "none", background: "#0F62FE", color: "#fff", fontFamily: "inherit" },

  // content
  content: { flex: 1, overflowY: "auto", padding: "16px 20px" },

  // alert
  alert:     { background: "#FFF8F0", border: "0.5px solid #FED7AA", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 14 },
  alertIcon: { fontSize: 14, color: "#EA580C", flexShrink: 0 },
  alertText: { fontSize: 12, color: "#9A3412", flex: 1 },
  alertClose:{ fontSize: 12, color: "#9A3412", cursor: "pointer", border: "none", background: "none", padding: 0 },

  // kpi
  kpiGrid:  { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 },
  kpi:      { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, padding: "14px 14px 12px", position: "relative", overflow: "hidden" },
  kpiAccent:{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "10px 10px 0 0" },
  kpiLbl:   { fontSize: 9, fontWeight: 600, color: "#9EA3AE", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 },
  kpiVal:   { fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 },
  kpiSub:   { fontSize: 10, color: "#9EA3AE", marginTop: 5 },

  // mid row
  midRow:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 },
  card:     { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, padding: 16 },
  cardHdr:  { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cardTitle:{ fontSize: 12, fontWeight: 600, color: "#1A1D23" },
  cardAction:{ fontSize: 11, color: "#378ADD", cursor: "pointer" },

  // payer
  payerRow:  { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  payerDot:  { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },
  payerName: { fontSize: 11, color: "#6B7280", width: 48, flexShrink: 0 },
  payerTrack:{ flex: 1, height: 4, background: "#EEF2F8", borderRadius: 2, overflow: "hidden" },
  payerFill: { height: "100%", borderRadius: 2 },
  payerPct:  { fontSize: 11, fontWeight: 500, color: "#1A1D23", minWidth: 28, textAlign: "right" },

  // ai card
  aiCard:{ background: "#E6F1FB", border: "0.5px solid #B5D4F4", borderRadius: 8, padding: "10px 12px", marginTop: 12 },
  aiLbl: { fontSize: 9, fontWeight: 600, color: "#185FA5", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 },
  aiVal: { fontSize: 18, fontWeight: 700, color: "#0F62FE" },
  aiSub: { fontSize: 9, color: "#378ADD", marginTop: 2 },

  // stat breakdown
  statBreak:    { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 },
  statBreakItem:{ borderRadius: 8, padding: "10px 8px", textAlign: "center" },
  statBreakVal: { fontSize: 18, fontWeight: 700 },
  statBreakLbl: { fontSize: 10, fontWeight: 500, marginTop: 3 },

  // risk items
  riskItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: "#FFF8F0", borderRadius: 6, border: "0.5px solid #FED7AA" },
  riskNum:  { fontSize: 11, fontFamily: "monospace", color: "#1A1D23" },
  riskScore:{ fontSize: 11, fontWeight: 600, color: "#DC2626" },

  // table
  tableCard: { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, overflow: "hidden" },
  tableHdr:  { padding: "12px 16px", borderBottom: "0.5px solid #EEF2F8", display: "flex", alignItems: "center", justifyContent: "space-between" },
  filters:   { display: "flex", gap: 5 },
  chip:      { fontSize: 10, fontWeight: 500, padding: "3px 9px", borderRadius: 20, cursor: "pointer", border: "0.5px solid #E2E4E9", background: "#fff", color: "#6B7280", fontFamily: "inherit" },
  chipActive:{ background: "#E6F1FB", color: "#0F62FE", borderColor: "#B5D4F4" },
  loading:   { padding: "24px 16px", fontSize: 13, color: "#9EA3AE" },
  table:     { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th:        { textAlign: "left", padding: "8px 14px", fontSize: 9, fontWeight: 600, color: "#9EA3AE", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "0.5px solid #EEF2F8", background: "#FAFBFF", whiteSpace: "nowrap" },
  tr:        { borderBottom: "0.5px solid #F5F7FA" },
  td:        { padding: "10px 14px", verticalAlign: "middle" },
  claimNum:  { fontFamily: "monospace", fontSize: 11, color: "#1A1D23", fontWeight: 500 },
  patientName:{ fontSize: 12, fontWeight: 500, color: "#1A1D23" },
  badge:     { display: "inline-flex", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20 },
  riskCell:  { display: "flex", alignItems: "center", gap: 6 },
  riskPill:  { fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 20, whiteSpace: "nowrap" },
  riskTrack: { width: 36, height: 3, background: "#EEF2F8", borderRadius: 2, overflow: "hidden" },
  riskFill:  { height: "100%", borderRadius: 2 },
};