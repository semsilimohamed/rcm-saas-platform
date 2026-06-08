"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Stats {
  total_claims: number;
  pending: number;
  approved: number;
  rejected: number;
  total_amount_mad: number;
  rejection_rate: number;
}

interface Claim {
  id: string;
  claim_number: string;
  amount: number;
  insurance_type: string;
  service_type: string;
  status: string;
  risk_score: number | null;
  risk_level: string | null;
  service_date: string;
}

function formatMAD(amount: number) {
  return amount.toLocaleString("fr-MA") + " MAD";
}

export default function PerformancePage() {
  const [stats, setStats]   = useState<Stats | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Utilisateur");

  useEffect(() => {
    const loadUser = () => {
      const user = JSON.parse(localStorage.getItem("sihaiq_user") || "{}");
      setUserName(user.name || "Utilisateur");
    };
    loadUser();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("sihaiq_token");
    if (!token) { window.location.href = "/auth/login"; return; }
    const tenantId = localStorage.getItem("sihaiq_tenant_id");

    const load = async () => {
      try {
        const [sr, cr] = await Promise.all([
          fetch(`${API_URL}/claims/stats/summary?tenant_id=${tenantId}`),
          fetch(`${API_URL}/claims/with-patients?tenant_id=${tenantId}`),
        ]);
        if (sr.ok) setStats(await sr.json());
        if (cr.ok) setClaims(await cr.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Payer breakdown
  const payers = ["CNOPS", "CNSS", "AMO", "AMO-Tadamon"];
  const payerData = payers.map(p => {
    const pClaims = claims.filter(c => c.insurance_type === p);
    const rejected = pClaims.filter(c => c.status === "rejected").length;
    const total = pClaims.length;
    return {
      name: p,
      total,
      rejected,
      approved: pClaims.filter(c => c.status === "approved").length,
      pending: pClaims.filter(c => c.status === "pending").length,
      rejectionRate: total > 0 ? Math.round((rejected / total) * 100) : 0,
      amount: pClaims.reduce((s, c) => s + c.amount, 0),
    };
  }).filter(p => p.total > 0);

  // Service breakdown
  const services = ["consultation", "hospitalisation", "chirurgie", "radiologie", "laboratoire", "kinesitherapie"];
  const serviceData = services.map(sv => {
    const sClaims = claims.filter(c => c.service_type === sv);
    const rejected = sClaims.filter(c => c.status === "rejected").length;
    const total = sClaims.length;
    return {
      name: sv.charAt(0).toUpperCase() + sv.slice(1),
      total,
      rejected,
      rejectionRate: total > 0 ? Math.round((rejected / total) * 100) : 0,
      amount: sClaims.reduce((s, c) => s + c.amount, 0),
    };
  }).filter(s => s.total > 0);

  // Risk distribution
  const highRisk = claims.filter(c => c.risk_level === "ÉLEVÉ").length;
  const midRisk  = claims.filter(c => c.risk_level === "MODÉRÉ").length;
  const lowRisk  = claims.filter(c => c.risk_level === "FAIBLE").length;
  const noRisk   = claims.filter(c => !c.risk_level).length;

  const approvalRate = stats ? Math.round((stats.approved / stats.total_claims) * 100) : 0;
  const avgAmount    = claims.length ? Math.round(claims.reduce((s, c) => s + c.amount, 0) / claims.length) : 0;

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
          <a href="/dashboard/patients" style={s.sbItem}> Patients</a>
          <a href="/dashboard/prediction" style={s.sbItem}> Prédiction IA</a>
          <div style={s.sbSec}>Analyse</div>
          <a href="/dashboard/performance" style={{ ...s.sbItem, ...s.sbItemActive }}> Performance</a>
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
            <div style={s.topTitle}>Performance</div>
            <div style={s.topDate}>Analyse du cycle de revenus · {userName}</div>
          </div>
        </div>

        <div style={s.content}>

          {/* KPI CARDS */}
          <div style={s.kpiGrid}>
            {[
              { lbl: "Total dossiers",    val: loading ? "—" : String(stats?.total_claims ?? 0), accent: "#0F62FE", sub: "portefeuille total" },
              { lbl: "Taux d'approbation", val: loading ? "—" : `${approvalRate}%`,               accent: "#16A34A", sub: "dossiers approuvés" },
              { lbl: "Taux de rejet",     val: loading ? "—" : `${stats?.rejection_rate ?? 0}%`,  accent: "#DC2626", sub: "dossiers rejetés" },
              { lbl: "Montant moyen",     val: loading ? "—" : formatMAD(avgAmount),              accent: "#F59E0B", sub: "par dossier" },
              { lbl: "Encours total",     val: loading ? "—" : formatMAD(stats?.total_amount_mad ?? 0), accent: "#8B5CF6", sub: "MAD facturés" },
            ].map(k => (
              <div key={k.lbl} style={s.kpi}>
                <div style={{ ...s.kpiAccent, background: k.accent }} />
                <div style={s.kpiLbl}>{k.lbl}</div>
                <div style={{ ...s.kpiVal, color: k.accent }}>{k.val}</div>
                <div style={s.kpiSub}>{k.sub}</div>
              </div>
            ))}
          </div>

          <div style={s.row2}>

            {/* PAYER PERFORMANCE */}
            <div style={s.card}>
              <div style={s.cardHdr}>
                <span style={s.cardTitle}>Performance par caisse</span>
              </div>
              {loading ? <div style={s.loading}>Chargement...</div> : (
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["Caisse", "Total", "Approuvés", "Rejetés", "Taux rejet", "Montant"].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payerData.map(p => (
                      <tr key={p.name} style={s.tr}>
                        <td style={s.td}>
                          <span style={{ ...s.badge, ...payerBadge(p.name) }}>{p.name}</span>
                        </td>
                        <td style={s.td}>{p.total}</td>
                        <td style={s.td}><span style={{ color: "#16A34A", fontWeight: 600 }}>{p.approved}</span></td>
                        <td style={s.td}><span style={{ color: "#DC2626", fontWeight: 600 }}>{p.rejected}</span></td>
                        <td style={s.td}>
                          <div style={s.rateWrap}>
                            <div style={s.rateBar}>
                              <div style={{ ...s.rateFill, width: `${p.rejectionRate}%`, background: p.rejectionRate > 40 ? "#DC2626" : p.rejectionRate > 20 ? "#F59E0B" : "#16A34A" }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: p.rejectionRate > 40 ? "#DC2626" : "#4B5060" }}>{p.rejectionRate}%</span>
                          </div>
                        </td>
                        <td style={s.td}>{formatMAD(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* RISK DISTRIBUTION */}
            <div style={s.card}>
              <div style={s.cardHdr}>
                <span style={s.cardTitle}>Distribution des risques IA</span>
              </div>
              {loading ? <div style={s.loading}>Chargement...</div> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { lbl: "Risque ÉLEVÉ",  count: highRisk, color: "#DC2626", bg: "#FEE2E2" },
                    { lbl: "Risque MODÉRÉ", count: midRisk,  color: "#F59E0B", bg: "#FEF9C3" },
                    { lbl: "Risque FAIBLE", count: lowRisk,  color: "#16A34A", bg: "#DCFCE7" },
                    { lbl: "Non analysé",   count: noRisk,   color: "#9EA3AE", bg: "#F3F4F6" },
                  ].map(r => (
                    <div key={r.lbl} style={s.riskRow}>
                      <span style={{ ...s.riskBadge, background: r.bg, color: r.color }}>{r.lbl}</span>
                      <div style={s.riskTrack}>
                        <div style={{ ...s.riskFill, width: claims.length ? `${Math.round((r.count / claims.length) * 100)}%` : "0%", background: r.color }} />
                      </div>
                      <span style={s.riskCount}>{r.count}</span>
                      <span style={s.riskPct}>{claims.length ? Math.round((r.count / claims.length) * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SERVICE PERFORMANCE */}
          <div style={s.card}>
            <div style={s.cardHdr}>
              <span style={s.cardTitle}>Performance par type de soin</span>
            </div>
            {loading ? <div style={s.loading}>Chargement...</div> : (
              <div style={s.serviceGrid}>
                {serviceData.map(sv => (
                  <div key={sv.name} style={s.serviceCard}>
                    <div style={s.serviceName}>{sv.name}</div>
                    <div style={s.serviceVal}>{sv.total} dossiers</div>
                    <div style={s.serviceRate}>
                      <div style={s.serviceRateBar}>
                        <div style={{
                          ...s.serviceRateFill,
                          width: `${sv.rejectionRate}%`,
                          background: sv.rejectionRate > 40 ? "#DC2626" : sv.rejectionRate > 20 ? "#F59E0B" : "#16A34A"
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: sv.rejectionRate > 40 ? "#DC2626" : "#6B7280", fontWeight: 600 }}>
                        {sv.rejectionRate}% rejetés
                      </span>
                    </div>
                    <div style={s.serviceAmount}>{formatMAD(sv.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function payerBadge(payer: string) {
  if (payer === "CNOPS") return { background: "#E6F1FB", color: "#1E40AF" };
  if (payer === "CNSS")  return { background: "#F0FDF4", color: "#166534" };
  if (payer === "AMO")   return { background: "#FFF7ED", color: "#9A3412" };
  return { background: "#F5F3FF", color: "#6D28D9" };
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

  content: { flex: 1, overflowY: "auto", padding: "16px 20px" },

  kpiGrid:  { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 12 },
  kpi:      { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, padding: "12px 14px", position: "relative", overflow: "hidden" },
  kpiAccent:{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "10px 10px 0 0" },
  kpiLbl:   { fontSize: 9, fontWeight: 600, color: "#9EA3AE", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 },
  kpiVal:   { fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 },
  kpiSub:   { fontSize: 10, color: "#9EA3AE", marginTop: 4 },

  row2:    { display: "grid", gridTemplateColumns: "1fr 300px", gap: 12, marginBottom: 12 },
  card:    { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, padding: 16, marginBottom: 12 },
  cardHdr: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cardTitle:{ fontSize: 12, fontWeight: 600, color: "#1A1D23" },
  loading: { padding: "16px 0", fontSize: 13, color: "#9EA3AE" },

  table:   { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th:      { textAlign: "left", padding: "7px 12px", fontSize: 9, fontWeight: 600, color: "#9EA3AE", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "0.5px solid #EEF2F8", background: "#FAFBFF", whiteSpace: "nowrap" },
  tr:      { borderBottom: "0.5px solid #F5F7FA" },
  td:      { padding: "9px 12px", verticalAlign: "middle" },
  badge:   { display: "inline-flex", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20 },

  rateWrap:{ display: "flex", alignItems: "center", gap: 6 },
  rateBar: { width: 60, height: 4, background: "#EEF2F8", borderRadius: 2, overflow: "hidden" },
  rateFill:{ height: "100%", borderRadius: 2 },

  riskRow:   { display: "flex", alignItems: "center", gap: 8 },
  riskBadge: { display: "inline-flex", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, width: 110, justifyContent: "center", flexShrink: 0 },
  riskTrack: { flex: 1, height: 6, background: "#EEF2F8", borderRadius: 3, overflow: "hidden" },
  riskFill:  { height: "100%", borderRadius: 3 },
  riskCount: { fontSize: 12, fontWeight: 600, color: "#1A1D23", minWidth: 20, textAlign: "right" },
  riskPct:   { fontSize: 11, color: "#9EA3AE", minWidth: 32, textAlign: "right" },

  serviceGrid:    { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 },
  serviceCard:    { border: "0.5px solid #E2E4E9", borderRadius: 8, padding: "12px 14px" },
  serviceName:    { fontSize: 12, fontWeight: 600, color: "#1A1D23", marginBottom: 4, textTransform: "capitalize" },
  serviceVal:     { fontSize: 11, color: "#6B7280", marginBottom: 8 },
  serviceRate:    { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  serviceRateBar: { flex: 1, height: 4, background: "#EEF2F8", borderRadius: 2, overflow: "hidden" },
  serviceRateFill:{ height: "100%", borderRadius: 2 },
  serviceAmount:  { fontSize: 11, fontWeight: 500, color: "#4B5060" },
};