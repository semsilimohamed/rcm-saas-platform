"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface KPIs {
  total_facture: number;
  total_approuve: number;
  total_rejete: number;
  total_conteste: number;
  total_regle: number;
  total_abandonne: number;
  total_pending: number;
  total_forclos: number;
  montant_risque: number;
  taux_recouvrement: number;
  taux_rejet: number;
  nb_total: number;
  nb_approuve: number;
  nb_rejete: number;
  nb_pending: number;
  nb_forclos: number;
}

interface PayerBreakdown {
  payer: string;
  nb: number;
  total: number;
  rejected: number;
  approved: number;
  rejection_rate: number;
}

interface MonthlyTrend {
  month: string;
  nb: number;
  total: number;
  approved: number;
  rejected: number;
}

interface TopCause {
  reason: string;
  nb: number;
  total: number;
}

interface FinancierData {
  period: string;
  kpis: KPIs;
  payer_breakdown: PayerBreakdown[];
  monthly_trend: MonthlyTrend[];
  top_causes: TopCause[];
}

function formatMAD(n: number) {
  return n.toLocaleString("fr-MA", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " MAD";
}

function formatMonth(m: string) {
  const [, mo] = m.split("-");
  const months = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
  return months[parseInt(mo) - 1];
}

const PAYER_COLORS: Record<string, { bg: string; color: string }> = {
  "CNOPS":       { bg: "#E6F1FB", color: "#1E40AF" },
  "CNSS":        { bg: "#F0FDF4", color: "#166534" },
  "AMO":         { bg: "#FFF7ED", color: "#9A3412" },
  "AMO-Tadamon": { bg: "#F5F3FF", color: "#6D28D9" },
};

export default function FinancierPage() {
  const [data, setData]       = useState<FinancierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState("all");
  const [error, setError]     = useState("");

  async function loadData(p: string) {
    setLoading(true);
    try {
      const token    = localStorage.getItem("sihaiq_token");
      const tenantId = localStorage.getItem("sihaiq_tenant_id");
      const res = await fetch(`${API_URL}/financier/summary?tenant_id=${tenantId}&period=${p}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur chargement données financières");
      setData(await res.json());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("sihaiq_token");
    const user  = JSON.parse(localStorage.getItem("sihaiq_user") || "{}");
    const role  = user.role || "";
    if (!token) { window.location.href = "/auth/login"; return; }
    Promise.resolve().then(() => {
      if (!["admin", "director"].includes(role)) {
        setError("Accès refusé. Cette page est réservée aux responsables BAF et à la Direction Financière.");
        setLoading(false);
        return;
      }
      loadData("all");
    });
  }, []);
    

  function changePeriod(p: string) {
    setPeriod(p);
    loadData(p);
  }

  if (error) return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#F0F4FA" }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 32, maxWidth: 400, textAlign: "center", border: "0.5px solid #E2E4E9" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1D23", marginBottom: 8 }}>Accès restreint</div>
        <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, marginBottom: 20 }}>{error}</div>
        <a href="/dashboard" style={{ fontSize: 13, color: "#0F62FE", textDecoration: "none" }}>← Retour au tableau de bord</a>
      </div>
    </div>
  );

  const k        = data?.kpis;
  const maxTrend = data ? Math.max(...data.monthly_trend.map(m => m.total), 1) : 1;

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
                <line x1="7"  y1="22" x2="14" y2="22" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="30" y1="22" x2="37" y2="22" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="12"   y1="12"   x2="16.5" y2="16.5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="27.5" y1="27.5" x2="32"   y2="32"   stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="32"   y1="12"   x2="27.5" y2="16.5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="16.5" y1="27.5" x2="12"   y2="32"   stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round"/>
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
          <Link href="/dashboard"             style={s.sbItem}> Tableau de bord</Link>
          <Link href="/dashboard/dossiers"    style={s.sbItem}> Dossiers BAF</Link>
          <Link href="/dashboard/patients"    style={s.sbItem}> Patients</Link>
          <Link href="/dashboard/prediction"  style={s.sbItem}> Prédiction IA</Link>
          <div style={s.sbSec}>Analyse</div>
          <Link href="/dashboard/performance" style={s.sbItem}> Performance</Link>
          <Link href="/dashboard/forclusion"  style={s.sbItem}> Forclusion</Link>
          <Link href="/dashboard/encours"     style={s.sbItem}> Encours A/R</Link>
          <Link href="/dashboard/financier" style={s.sbItem}> Activité financière</Link>
          <Link href="/dashboard/comptabilite" style={s.sbItem}>📒 Comptabilité DAF</Link>
          <div style={s.sbSec}>Système</div>
          <Link href="/dashboard/audit"    style={s.sbItem}> Journal d&apos;audit</Link>
          <Link href="/dashboard/settings" style={s.sbItem}> Paramètres</Link>
        </nav>
        <div style={s.sbFooter}>
          <button style={s.logoutBtn} onClick={() => { localStorage.clear(); window.location.href = "/auth/login"; }}>
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={s.main}>
        <div style={s.topbar}>
          <div>
            <div style={s.topTitle}>Activité financière</div>
            <div style={s.topSub}>Vue DAF · Cycle de revenus complet · Accès restreint</div>
          </div>
          <div style={s.periodBar}>
            {[
              { key: "month",   lbl: "Ce mois" },
              { key: "quarter", lbl: "Ce trimestre" },
              { key: "year",    lbl: "Cette année" },
              { key: "all",     lbl: "Tout" },
            ].map(p => (
              <button
                key={p.key}
                style={period === p.key ? { ...s.periodBtn, ...s.periodBtnActive } : s.periodBtn}
                onClick={() => changePeriod(p.key)}
              >{p.lbl}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 13, color: "#9EA3AE" }}>Chargement des données financières...</div>
          </div>
        ) : (
          <div style={s.content}>

            {/* KPI CARDS */}
            <div style={s.kpiGrid}>
              {[
                { lbl: "Total facturé",        val: formatMAD(k?.total_facture || 0),   sub: `${k?.nb_total || 0} dossiers`,             color: "#0F62FE", accent: "#E6F1FB" },
                { lbl: "Taux recouvrement",    val: `${k?.taux_recouvrement || 0}%`,    sub: "approuvé + réglé / total",                 color: "#16A34A", accent: "#DCFCE7" },
                { lbl: "Montant approuvé",     val: formatMAD(k?.total_approuve || 0),  sub: `${k?.nb_approuve || 0} dossiers`,          color: "#16A34A", accent: "#DCFCE7" },
                { lbl: "Montant rejeté",       val: formatMAD(k?.total_rejete || 0),    sub: `Taux rejet ${k?.taux_rejet || 0}%`,        color: "#DC2626", accent: "#FEE2E2" },
                { lbl: "Montant à risque",     val: formatMAD(k?.montant_risque || 0),  sub: "rejeté + contesté + abandonné",            color: "#F59E0B", accent: "#FEF9C3" },
                { lbl: "Forclos",              val: formatMAD(k?.total_forclos || 0),   sub: `${k?.nb_forclos || 0} dossiers expirés`,   color: "#6B7280", accent: "#F3F4F6" },
              ].map(kpi => (
                <div key={kpi.lbl} style={{ ...s.kpi, background: kpi.accent }}>
                  <div style={{ ...s.kpiBar, background: kpi.color }} />
                  <div style={s.kpiLbl}>{kpi.lbl}</div>
                  <div style={{ ...s.kpiVal, color: kpi.color }}>{kpi.val}</div>
                  <div style={s.kpiSub}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* FINANCIAL FLOW A→Z */}
            <div style={s.flowCard}>
              <div style={s.cardTitle}>Cycle de revenus A → Z</div>
              <div style={s.flowRow}>
                {([
                  { lbl: "Total facturé", val: k?.total_facture  || 0, color: "#0F62FE", icon: "📋" },
                  null,
                  { lbl: "Approuvé",     val: k?.total_approuve || 0, color: "#16A34A", icon: "✅" },
                  { lbl: "En attente",   val: k?.total_pending  || 0, color: "#F59E0B", icon: "⏳" },
                  { lbl: "Rejeté",       val: k?.total_rejete   || 0, color: "#DC2626", icon: "❌" },
                  null,
                  { lbl: "Contesté",     val: k?.total_conteste || 0, color: "#F97316", icon: "✉️" },
                  null,
                  { lbl: "Réglé",        val: k?.total_regle    || 0, color: "#16A34A", icon: "💰" },
                  { lbl: "Abandonné",    val: k?.total_abandonne|| 0, color: "#6B7280", icon: "🚫" },
                  { lbl: "Forclos",      val: k?.total_forclos  || 0, color: "#9CA3AF", icon: "⛔" },
                ] as ({ lbl: string; val: number; color: string; icon: string } | null)[]).map((item, i) =>
                  item === null ? (
                    <div key={i} style={s.flowArrow}>→</div>
                  ) : (
                    <div key={i} style={s.flowBox}>
                      <div style={s.flowIcon}>{item.icon}</div>
                      <div style={{ ...s.flowVal, color: item.color }}>{formatMAD(item.val)}</div>
                      <div style={s.flowLbl}>{item.lbl}</div>
                    </div>
                  )
                )}
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 6 }}>
                  <span>Taux de recouvrement net</span>
                  <span style={{ fontWeight: 700, color: "#16A34A" }}>{k?.taux_recouvrement || 0}%</span>
                </div>
                <div style={s.recoveryTrack}>
                  <div style={{ ...s.recoveryFill, width: `${k?.taux_recouvrement || 0}%` }} />
                  <div style={{ ...s.recoveryLost, width: `${k?.taux_rejet || 0}%`, left: `${k?.taux_recouvrement || 0}%` }} />
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: "#16A34A" }}>■ Recouvré {k?.taux_recouvrement || 0}%</span>
                  <span style={{ fontSize: 10, color: "#DC2626" }}>■ Perdu {k?.taux_rejet || 0}%</span>
                  <span style={{ fontSize: 10, color: "#9CA3AF" }}>■ En cours {Math.max(0, 100 - (k?.taux_recouvrement || 0) - (k?.taux_rejet || 0)).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div style={s.twoCol}>
              {/* MONTHLY TREND */}
              <div style={s.card}>
                <div style={s.cardTitle}>Tendance mensuelle (6 derniers mois)</div>
                {data && data.monthly_trend.length > 0 ? (
                  <>
                    <div style={s.chartArea}>
                      {data.monthly_trend.map((m, i) => (
                        <div key={i} style={s.barGroup}>
                          <div style={s.barTrack}>
                            <div style={{ ...s.barTotal,    height: `${(m.total    / maxTrend) * 100}%` }} />
                            <div style={{ ...s.barApproved, height: `${(m.approved / maxTrend) * 100}%` }} />
                          </div>
                          <div style={s.barLabel}>{formatMonth(m.month)}</div>
                          <div style={s.barAmt}>{Math.round(m.total / 1000)}K</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                      <span style={{ fontSize: 10, color: "#16A34A" }}>■ Approuvé</span>
                      <span style={{ fontSize: 10, color: "#B5D4F4" }}>■ Total facturé</span>
                    </div>
                  </>
                ) : (
                  <div style={s.empty}>Aucune donnée pour cette période.</div>
                )}
              </div>

              {/* PAYER BREAKDOWN */}
              <div style={s.card}>
                <div style={s.cardTitle}>Performance par caisse</div>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["Caisse","Dossiers","Total","Rejet %","Statut"].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data?.payer_breakdown.map((p, i) => {
                      const pc = PAYER_COLORS[p.payer] || { bg: "#F3F4F6", color: "#6B7280" };
                      return (
                        <tr key={i} style={s.tr}>
                          <td style={s.td}>
                            <span style={{ ...s.payerBadge, background: pc.bg, color: pc.color }}>{p.payer}</span>
                          </td>
                          <td style={s.td}>{p.nb}</td>
                          <td style={s.td}>{formatMAD(p.total)}</td>
                          <td style={s.td}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 50, height: 5, background: "#EEF2F8", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ width: `${p.rejection_rate}%`, height: "100%", borderRadius: 3, background: p.rejection_rate > 50 ? "#DC2626" : p.rejection_rate > 25 ? "#F59E0B" : "#16A34A" }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 600, color: p.rejection_rate > 50 ? "#DC2626" : p.rejection_rate > 25 ? "#854D0E" : "#166534" }}>{p.rejection_rate}%</span>
                            </div>
                          </td>
                          <td style={s.td}>
                            <span style={{ fontSize: 10, color: p.rejection_rate > 50 ? "#DC2626" : p.rejection_rate > 25 ? "#854D0E" : "#16A34A" }}>
                              {p.rejection_rate > 50 ? "⚠ Critique" : p.rejection_rate > 25 ? "⚡ Attention" : "✓ Normal"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TOP REJECTION CAUSES */}
            {data && data.top_causes.length > 0 && (
              <div style={s.card}>
                <div style={s.cardTitle}>Top 5 causes de rejet</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginTop: 12 }}>
                  {data.top_causes.map((c, i) => (
                    <div key={i} style={s.causeCard}>
                      <div style={s.causeRank}>{i + 1}</div>
                      <div style={s.causeReason}>{c.reason}</div>
                      <div style={s.causeStats}>
                        <span style={{ color: "#DC2626", fontWeight: 600 }}>{c.nb} dossier{c.nb > 1 ? "s" : ""}</span>
                        <span style={{ color: "#6B7280" }}>{formatMAD(c.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
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
  logoutBtn: { width: "100%", padding: "8px", borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: "pointer", border: "0.5px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", fontFamily: "inherit" },

  main:    { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topbar:  { background: "#fff", borderBottom: "0.5px solid #E2E4E9", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  topTitle:{ fontSize: 14, fontWeight: 600, color: "#1A1D23" },
  topSub:  { fontSize: 11, color: "#9EA3AE", marginTop: 2 },

  periodBar:      { display: "flex", gap: 4 },
  periodBtn:      { fontSize: 11, fontWeight: 500, padding: "5px 12px", borderRadius: 7, cursor: "pointer", border: "0.5px solid #E2E4E9", background: "#fff", color: "#6B7280", fontFamily: "inherit" },
  periodBtnActive:{ background: "#E6F1FB", color: "#0F62FE", borderColor: "#B5D4F4", fontWeight: 600 },

  content: { flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 },

  kpiGrid:  { display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10 },
  kpi:      { borderRadius: 10, padding: "14px 14px 12px", position: "relative", overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.06)" },
  kpiBar:   { position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "10px 10px 0 0" },
  kpiLbl:   { fontSize: 9, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 },
  kpiVal:   { fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 4 },
  kpiSub:   { fontSize: 9, color: "#9EA3AE" },

  flowCard:     { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, padding: 16 },
  flowRow:      { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 12 },
  flowArrow:    { fontSize: 16, color: "#9EA3AE", flexShrink: 0 },
  flowBox:      { background: "#F8FBFF", border: "0.5px solid #E6F1FB", borderRadius: 8, padding: "10px 12px", textAlign: "center", minWidth: 88 },
  flowIcon:     { fontSize: 16, marginBottom: 4 },
  flowVal:      { fontSize: 11, fontWeight: 700, letterSpacing: "-0.01em" },
  flowLbl:      { fontSize: 9, color: "#9EA3AE", marginTop: 3 },
  recoveryTrack:{ height: 8, background: "#F3F4F6", borderRadius: 4, overflow: "hidden", position: "relative" },
  recoveryFill: { position: "absolute", left: 0, top: 0, height: "100%", background: "#16A34A", borderRadius: 4, transition: "width 0.5s" },
  recoveryLost: { position: "absolute", top: 0, height: "100%", background: "#DC2626", borderRadius: 4 },

  twoCol:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  card:     { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, padding: 16 },
  cardTitle:{ fontSize: 12, fontWeight: 600, color: "#1A1D23", marginBottom: 12 },

  chartArea:  { display: "flex", gap: 8, alignItems: "flex-end", height: 110 },
  barGroup:   { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 },
  barTrack:   { width: "100%", height: 80, background: "#F3F4F6", borderRadius: 4, position: "relative", overflow: "hidden" },
  barTotal:   { position: "absolute", bottom: 0, left: 0, right: 0, background: "#E6F1FB", borderRadius: "4px 4px 0 0" },
  barApproved:{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#16A34A", opacity: 0.85, borderRadius: "4px 4px 0 0" },
  barLabel:   { fontSize: 9, color: "#9EA3AE", textAlign: "center", whiteSpace: "nowrap" },
  barAmt:     { fontSize: 9, fontWeight: 600, color: "#6B7280" },
  empty:      { fontSize: 12, color: "#9EA3AE", textAlign: "center", padding: "20px 0" },

  table:     { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th:        { textAlign: "left", padding: "6px 10px", fontSize: 9, fontWeight: 600, color: "#9EA3AE", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "0.5px solid #EEF2F8" },
  tr:        { borderBottom: "0.5px solid #F5F7FA" },
  td:        { padding: "9px 10px", verticalAlign: "middle" },
  payerBadge:{ display: "inline-flex", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20 },

  causeCard:  { background: "#F8FBFF", border: "0.5px solid #E6F1FB", borderRadius: 8, padding: "12px 14px" },
  causeRank:  { fontSize: 18, fontWeight: 800, color: "#DBEAFE", marginBottom: 6 },
  causeReason:{ fontSize: 11, fontWeight: 600, color: "#1A1D23", marginBottom: 8, lineHeight: 1.4 },
  causeStats: { display: "flex", flexDirection: "column", gap: 2, fontSize: 11 },
};