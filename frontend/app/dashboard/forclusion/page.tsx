"use client";

import { useEffect, useState } from "react";

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
  risk_score: number | null;
  risk_level: string | null;
  forclusion_deadline: string | null;
  created_at: string;
}

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
}

function urgencyStyle(days: number | null) {
  if (days === null) return { bg: "#F3F4F6", color: "#5C5852", label: "—" };
  if (days < 0)   return { bg: "#FEE2E2", color: "#991B1B", label: "Expiré" };
  if (days <= 3)  return { bg: "#FEE2E2", color: "#991B1B", label: `J-${days}` };
  if (days <= 7)  return { bg: "#FEF3C7", color: "#92400E", label: `J-${days}` };
  if (days <= 15) return { bg: "#FEF9C3", color: "#854D0E", label: `J-${days}` };
  return { bg: "#DCFCE7", color: "#166534", label: `J-${days}` };
}

function formatMAD(amount: number) {
  return amount.toLocaleString("fr-MA") + " MAD";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });
}

function payerStyle(payer: string) {
  if (payer === "CNOPS") return { bg: "#EEEDFB", color: "#1E40AF" };
  if (payer === "CNSS")  return { bg: "#F0FDF4", color: "#166534" };
  if (payer === "AMO")   return { bg: "#FFF7ED", color: "#9A3412" };
  return { bg: "#F5F3FF", color: "#6D28D9" };
}

export default function ForclusionPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Tous");
  const [userName, setUserName] = useState("Utilisateur");

  useEffect(() => {
    const token = localStorage.getItem("sihaiq_token");
    if (!token) { window.location.href = "/auth/login"; return; }
    const tenantId = localStorage.getItem("sihaiq_tenant_id");

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/claims/with-patients?tenant_id=${tenantId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const all: Claim[] = await res.json();
          // Only show pending claims with forclusion deadline
          const pending = all.filter(c =>
            c.forclusion_deadline !== null
          );
          // Sort by most urgent first
          pending.sort((a, b) => {
            const da = daysUntil(a.forclusion_deadline) ?? 999;
            const db = daysUntil(b.forclusion_deadline) ?? 999;
            return da - db;
          });
          setClaims(pending);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);
  
  useEffect(() => { 
    const loadUser =() => {
      const user = JSON.parse(localStorage.getItem("sihaiq_user") || "{}");
       setUserName(user.name || "Utilisateur");
    };
    loadUser();
  }, []);

  const filtered = claims.filter(c => {
    const days = daysUntil(c.forclusion_deadline);
    if (filter === "Critique") return days !== null && days <= 3;
    if (filter === "Urgent")   return days !== null && days > 3 && days <= 7;
    if (filter === "Attention")return days !== null && days > 7 && days <= 15;
    if (filter === "Expiré")   return days !== null && days < 0;
    return true;
  });

  const critique  = claims.filter(c => { const d = daysUntil(c.forclusion_deadline); return d !== null && d >= 0 && d <= 3; });
  const urgent    = claims.filter(c => { const d = daysUntil(c.forclusion_deadline); return d !== null && d > 3 && d <= 7; });
  const attention = claims.filter(c => { const d = daysUntil(c.forclusion_deadline); return d !== null && d > 7 && d <= 15; });
  const expire    = claims.filter(c => { const d = daysUntil(c.forclusion_deadline); return d !== null && d < 0; });

  const totalAtRisk = claims.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div style={s.shell}>
      {/* SIDEBAR */}
      <aside style={s.sidebar}>
        <div style={s.sbTop}>
          <div style={s.sbBrand}>
            <div style={s.sbMark}>
              <svg width="14" height="14" viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="6" fill="white"/>
                <circle cx="22" cy="22" r="2.8" fill="#5B4FE8"/>
                <line x1="22" y1="7" x2="22" y2="14" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="22" y1="30" x2="22" y2="37" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="7" y1="22" x2="14" y2="22" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="30" y1="22" x2="37" y2="22" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="12" y1="12" x2="16.5" y2="16.5" stroke="#C7C2F7" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="27.5" y1="27.5" x2="32" y2="32" stroke="#C7C2F7" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="32" y1="12" x2="27.5" y2="16.5" stroke="#C7C2F7" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="16.5" y1="27.5" x2="12" y2="32" stroke="#C7C2F7" strokeWidth="1.6" strokeLinecap="round"/>
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
          <a href="/dashboard/patients" style={s.sbItem}> Patients</a>
          <a href="/dashboard/prediction" style={s.sbItem}> Prédiction IA</a>
          <div style={s.sbSec}>Analyse</div>
          <a href="/dashboard/performance" style={s.sbItem}> Performance</a>
          <a href="/dashboard/forclusion" style={{ ...s.sbItem, ...s.sbItemActive }}> Forclusion</a>
          <a href="/dashboard/encours" style={s.sbItem}> Encours A/R</a>
          <a href="/dashboard/financier" style={s.sbItem}> Activité financière</a>
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
            <div style={s.topTitle}>Alertes Forclusion</div>
            <div style={s.topDate}>Dossiers en attente approchant le délai légal de 60 jours · {userName}</div>
          </div>
        </div>

        <div style={s.content}>

          {/* KPI CARDS */}
          <div style={s.kpiGrid}>
            <div style={{ ...s.kpi, borderTop: "3px solid #DC2626" }}>
              <div style={s.kpiLbl}>Critique (J-3)</div>
              <div style={{ ...s.kpiVal, color: "#DC2626" }}>{critique.length}</div>
              <div style={s.kpiSub}>Action immédiate</div>
            </div>
            <div style={{ ...s.kpi, borderTop: "3px solid #F59E0B" }}>
              <div style={s.kpiLbl}>Urgent (J-7)</div>
              <div style={{ ...s.kpiVal, color: "#F59E0B" }}>{urgent.length}</div>
              <div style={s.kpiSub}>Cette semaine</div>
            </div>
            <div style={{ ...s.kpi, borderTop: "3px solid #EAB308" }}>
              <div style={s.kpiLbl}>Attention (J-15)</div>
              <div style={{ ...s.kpiVal, color: "#854D0E" }}>{attention.length}</div>
              <div style={s.kpiSub}>Ce mois</div>
            </div>
            <div style={{ ...s.kpi, borderTop: "3px solid #5C5852" }}>
              <div style={s.kpiLbl}>Expirés</div>
              <div style={{ ...s.kpiVal, color: "#5C5852" }}>{expire.length}</div>
              <div style={s.kpiSub}>Perdus définitivement</div>
            </div>
            <div style={{ ...s.kpi, borderTop: "3px solid #8B5CF6" }}>
              <div style={s.kpiLbl}>Encours à risque</div>
              <div style={{ ...s.kpiVal, color: "#8B5CF6" }}>{formatMAD(totalAtRisk)}</div>
              <div style={s.kpiSub}>Montant total en danger</div>
            </div>
          </div>

          {/* ALERT BANNER */}
          {critique.length > 0 && (
            <div style={s.alertBanner}>
              <span style={s.alertIcon}>🚨</span>
              <span style={s.alertText}>
                <strong>{critique.length} dossier{critique.length > 1 ? "s" : ""} expirent dans moins de 3 jours.</strong>
                {" "}Soumettez-les immédiatement pour éviter une perte définitive.
              </span>
            </div>
          )}

          {/* FILTERS */}
          <div style={s.filterBar}>
            {[
              { label: "Tous", count: claims.length },
              { label: "Critique", count: critique.length },
              { label: "Urgent", count: urgent.length },
              { label: "Attention", count: attention.length },
              { label: "Expiré", count: expire.length },
            ].map(f => (
              <button
                key={f.label}
                style={filter === f.label ? { ...s.chip, ...s.chipActive } : s.chip}
                onClick={() => setFilter(f.label)}
              >
                {f.label} <span style={s.chipCount}>{f.count}</span>
              </button>
            ))}
          </div>

          {/* TABLE */}
          <div style={s.tableCard}>
            {loading ? (
              <div style={s.loading}>Chargement des alertes forclusion...</div>
            ) : filtered.length === 0 ? (
              <div style={s.empty}>
                <div style={s.emptyIcon}>✅</div>
                <div style={s.emptyText}>Aucun dossier à risque de forclusion dans cette catégorie.</div>
              </div>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    {["Urgence", "N° dossier", "Patient", "Caisse", "Montant", "Date de soin", "Échéance", "Risque IA"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(claim => {
                    const days = daysUntil(claim.forclusion_deadline);
                    const urg = urgencyStyle(days);
                    const ps = payerStyle(claim.insurance_type);
                    return (
                      <tr key={claim.id} style={s.tr}>
                        <td style={s.td}>
                          <span style={{ ...s.urgBadge, background: urg.bg, color: urg.color }}>
                            {urg.label}
                          </span>
                        </td>
                        <td style={s.td}><span style={s.mono}>{claim.claim_number}</span></td>
                        <td style={s.td}><span style={s.patientName}>{claim.patient_name}</span></td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, background: ps.bg, color: ps.color }}>
                            {claim.insurance_type}
                          </span>
                        </td>
                        <td style={s.td}><strong>{formatMAD(claim.amount)}</strong></td>
                        <td style={s.td}>{formatDate(claim.service_date)}</td>
                        <td style={s.td}>
                          <span style={{ color: days !== null && days <= 7 ? "#DC2626" : "#5C5852", fontWeight: 600, fontSize: 12 }}>
                            {claim.forclusion_deadline ? formatDate(claim.forclusion_deadline) : "—"}
                          </span>
                        </td>
                        <td style={s.td}>
                          {claim.risk_level ? (
                            <span style={{
                              ...s.badge,
                              background: claim.risk_level === "ÉLEVÉ" ? "#FEE2E2" : claim.risk_level === "MODÉRÉ" ? "#FEF9C3" : "#DCFCE7",
                              color: claim.risk_level === "ÉLEVÉ" ? "#991B1B" : claim.risk_level === "MODÉRÉ" ? "#854D0E" : "#166534",
                            }}>
                              {claim.risk_level}
                            </span>
                          ) : <span style={s.dash}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell:   { display: "flex", height: "100vh", overflow: "hidden", background: "#F2F1EE", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" },
  sidebar: { width: 210, flexShrink: 0, background: "#fff", borderRight: "0.5px solid #E5E3DD", display: "flex", flexDirection: "column" },
  sbTop:   { padding: "16px 14px 12px", borderBottom: "0.5px solid #F2F1EE" },
  sbBrand: { display: "flex", alignItems: "center", gap: 9 },
  sbMark:  { width: 28, height: 28, background: "#5B4FE8", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sbName:  { fontSize: 15, fontWeight: 300, color: "#1A1814", letterSpacing: "-0.02em", lineHeight: 1.1 },
  sbIQ:    { fontWeight: 800, color: "#5B4FE8" },
  sbRole:  { fontSize: 9, fontWeight: 600, color: "#9C9890", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 },
  sbNav:   { flex: 1, padding: "10px 8px", overflowY: "auto", display: "flex", flexDirection: "column" },
  sbSec:   { fontSize: 9, fontWeight: 600, color: "#C7C2F7", textTransform: "uppercase", letterSpacing: "0.1em", padding: "10px 8px 4px" },
  sbItem:  { display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 7, cursor: "pointer", color: "#5C5852", fontSize: 12, textDecoration: "none", marginBottom: 1 },
  sbItemActive: { background: "#EEEDFB", color: "#5B4FE8", fontWeight: 500 },
  sbFooter:{ padding: "10px 8px", borderTop: "0.5px solid #F2F1EE" },
  logoutBtn:{ width: "100%", padding: "8px", borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: "pointer", border: "0.5px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", fontFamily: "inherit" },

  main:    { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topbar:  { background: "#fff", borderBottom: "0.5px solid #E5E3DD", padding: "0 20px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  topTitle:{ fontSize: 14, fontWeight: 600, color: "#1A1814" },
  topDate: { fontSize: 11, color: "#9C9890", marginTop: 2 },

  content: { flex: 1, overflowY: "auto", padding: "16px 20px" },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 14 },
  kpi:     { background: "#fff", border: "0.5px solid #E5E3DD", borderRadius: 10, padding: "12px 14px" },
  kpiLbl:  { fontSize: 9, fontWeight: 600, color: "#9C9890", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 },
  kpiVal:  { fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 },
  kpiSub:  { fontSize: 10, color: "#9C9890", marginTop: 4 },

  alertBanner: { background: "#FEF2F2", border: "0.5px solid #FECACA", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 14 },
  alertIcon:   { fontSize: 16, flexShrink: 0 },
  alertText:   { fontSize: 12, color: "#991B1B" },

  filterBar: { display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" },
  chip:      { fontSize: 11, fontWeight: 500, padding: "5px 12px", borderRadius: 20, cursor: "pointer", border: "0.5px solid #E5E3DD", background: "#fff", color: "#5C5852", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 },
  chipActive:{ background: "#EEEDFB", color: "#5B4FE8", border: "0.5px solid #C7C2F7" },
  chipCount: { fontSize: 10, fontWeight: 700, background: "rgba(0,0,0,0.08)", padding: "1px 5px", borderRadius: 10 },

  tableCard: { background: "#fff", border: "0.5px solid #E5E3DD", borderRadius: 10, overflow: "hidden" },
  loading:   { padding: "24px 16px", fontSize: 13, color: "#9C9890" },
  empty:     { padding: "40px 16px", textAlign: "center" },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 13, color: "#9C9890" },
  table:     { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th:        { textAlign: "left", padding: "8px 14px", fontSize: 9, fontWeight: 600, color: "#9C9890", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "0.5px solid #F2F1EE", background: "#FAFAF7", whiteSpace: "nowrap" },
  tr:        { borderBottom: "0.5px solid #F5F4F1" },
  td:        { padding: "10px 14px", verticalAlign: "middle" },
  urgBadge:  { display: "inline-flex", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20 },
  mono:      { fontFamily: "monospace", fontSize: 11, color: "#1A1814", fontWeight: 500 },
  patientName:{ fontSize: 12, fontWeight: 500, color: "#1A1814" },
  badge:     { display: "inline-flex", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20 },
  dash:      { fontSize: 11, color: "#9C9890" },
};