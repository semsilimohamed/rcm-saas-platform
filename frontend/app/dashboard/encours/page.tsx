"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Claim {
  id: string;
  claim_number: string;
  patient_ne: string;
  amount: number;
  insurance_type: string;
  service_type: string;
  service_date: string;
  status: string;
  risk_level: string | null;
  risk_score: number | null;
  forclusion_deadline: string | null;
  created_at: string;
}

function formatMAD(n: number) {
  return n.toLocaleString("fr-MA") + " MAD";
}

function payerStyle(p: string) {
  if (p === "CNOPS") return { bg: "#E6F1FB", color: "#1E40AF" };
  if (p === "CNSS")  return { bg: "#F0FDF4", color: "#166534" };
  if (p === "AMO")   return { bg: "#FFF7ED", color: "#9A3412" };
  return { bg: "#F5F3FF", color: "#6D28D9" };
}

function getDaysInAR(serviceDate: string) {
  return Math.floor((Date.now() - new Date(serviceDate).getTime()) / 86400000);
}

function getDaysToForclusion(deadline: string | null) {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
}

type Bucket = {
  key: string;
  label: string;
  range: string;
  color: string;
  bg: string;
  border: string;
  min: number;
  max: number | null;
};

const BUCKETS: Bucket[] = [
  { key: "0-30",   label: "0–30 jours",   range: "Normal",   color: "#166534", bg: "#DCFCE7", border: "#86EFAC", min: 0,  max: 30  },
  { key: "31-45",  label: "31–45 jours",  range: "Attention", color: "#854D0E", bg: "#FEF9C3", border: "#FDE047", min: 31, max: 45  },
  { key: "46-55",  label: "46–55 jours",  range: "Urgent",   color: "#9A3412", bg: "#FFF7ED", border: "#FED7AA", min: 46, max: 55  },
  { key: "56-60",  label: "56–60 jours",  range: "Critique", color: "#991B1B", bg: "#FEE2E2", border: "#FCA5A5", min: 56, max: 60  },
  { key: "forclos",label: "Forclos",       range: "Expiré",   color: "#6B7280", bg: "#F3F4F6", border: "#D1D5DB", min: 61, max: null },
];

function getBucket(daysInAR: number): Bucket {
  if (daysInAR <= 30) return BUCKETS[0];
  if (daysInAR <= 45) return BUCKETS[1];
  if (daysInAR <= 55) return BUCKETS[2];
  if (daysInAR <= 60) return BUCKETS[3];
  return BUCKETS[4];
}

export default function EncoursPage() {
  const [claims, setClaims]         = useState<Claim[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeBucket, setActiveBucket] = useState<string | null>(null);
  const [payerFilter, setPayerFilter]   = useState("Tous");

  useEffect(() => {
    const load = async () => {
      const token    = localStorage.getItem("sihaiq_token");
      if (!token) { window.location.href = "/auth/login"; return; }
      const tenantId = localStorage.getItem("sihaiq_tenant_id");
      try {
        const res = await fetch(`${API_URL}/claims/with-patients?tenant_id=${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setClaims(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Only pending claims are in A/R
  const pendingClaims = claims.filter(c => c.status === "pending");

  const filtered = pendingClaims.filter(c =>
    payerFilter === "Tous" || c.insurance_type === payerFilter
  );

  // Bucket stats
  const bucketStats = BUCKETS.map(b => {
    const inBucket = filtered.filter(c => {
      const days = getDaysInAR(c.service_date);
      return getBucket(days).key === b.key;
    });
    return {
      ...b,
      count: inBucket.length,
      amount: inBucket.reduce((s, c) => s + c.amount, 0),
    };
  });

  const totalEncours    = filtered.reduce((s, c) => s + c.amount, 0);
  const totalCount      = filtered.length;
  const critiqueCount   = bucketStats.find(b => b.key === "56-60")?.count ?? 0;
  const forclosCount    = bucketStats.find(b => b.key === "forclos")?.count ?? 0;
  const avgDays         = totalCount
    ? Math.round(filtered.reduce((s, c) => s + getDaysInAR(c.service_date), 0) / totalCount)
    : 0;

  const displayClaims = activeBucket
    ? filtered.filter(c => getBucket(getDaysInAR(c.service_date)).key === activeBucket)
    : filtered;

  const activeBucketData = activeBucket ? BUCKETS.find(b => b.key === activeBucket) : null;

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
                <line x1="22" y1="7"    x2="22" y2="14"   stroke="white"   strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="22" y1="30"   x2="22" y2="37"   stroke="white"   strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="7"  y1="22"   x2="14" y2="22"   stroke="white"   strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="30" y1="22"   x2="37" y2="22"   stroke="white"   strokeWidth="2.2" strokeLinecap="round"/>
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
          <Link href="/dashboard"            style={s.sbItem}> Tableau de bord</Link>
          <Link href="/dashboard/dossiers"   style={s.sbItem}> Dossiers BAF</Link>
          <Link href="/dashboard/patients"   style={s.sbItem}> Patients</Link>
          <Link href="/dashboard/prediction" style={s.sbItem}> Prédiction IA</Link>
          <div style={s.sbSec}>Analyse</div>
          <Link href="/dashboard/performance" style={s.sbItem}> Performance</Link>
          <Link href="/dashboard/forclusion"  style={s.sbItem}> Forclusion</Link>
          <div style={{ ...s.sbItem, ...s.sbItemActive }}> Encours A/R</div>
          <Link href="/dashboard/financier" style={s.sbItem}> Activité financière</Link>
          <Link href="/dashboard/comptabilite" style={s.sbItem}>📒 Comptabilité DAF</Link>
          
          <div style={s.sbSec}>Système</div>
          <Link href="/dashboard/audit"    style={s.sbItem}> Journal d&apos;audit</Link>
          <Link href="/dashboard/settings" style={s.sbItem}> Paramètres</Link>
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

        {/* TOPBAR */}
        <div style={s.topbar}>
          <div>
            <div style={s.topTitle}>Encours A/R — Vieillissement des créances</div>
            <div style={s.topSub}>Dossiers en attente de règlement · délai forclusion 60 jours</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["Tous", "CNOPS", "CNSS", "AMO", "AMO-Tadamon"].map(p => (
              <button
                key={p}
                style={payerFilter === p ? { ...s.chip, ...s.chipActive } : s.chip}
                onClick={() => setPayerFilter(p)}
              >{p}</button>
            ))}
          </div>
        </div>

        <div style={s.content}>

          {/* CRITIQUE ALERT */}
          {(critiqueCount > 0 || forclosCount > 0) && (
            <div style={s.alert}>
              <span style={{ fontSize: 14, color: "#DC2626" }}>⚠</span>
              <span style={s.alertText}>
                {critiqueCount > 0 && <><strong>{critiqueCount} dossier{critiqueCount > 1 ? "s" : ""} critique{critiqueCount > 1 ? "s" : ""}</strong> — forclusion dans moins de 4 jours. </>}
                {forclosCount > 0 && <><strong>{forclosCount} dossier{forclosCount > 1 ? "s" : ""} forclos</strong> — créances définitivement perdues.</>}
              </span>
            </div>
          )}

          {/* KPI ROW */}
          <div style={s.kpiGrid}>
            {[
              { lbl: "Encours total",      val: formatMAD(totalEncours), accent: "#0F62FE", sub: `${totalCount} dossiers en attente` },
              { lbl: "Délai moyen A/R",    val: `${avgDays} jours`,      accent: "#8B5CF6", sub: "depuis création dossier" },
              { lbl: "Critique (56–60j)",  val: String(critiqueCount),   accent: "#DC2626", sub: "action immédiate requise" },
              { lbl: "Forclos",            val: String(forclosCount),    accent: "#6B7280", sub: "créances irrécouvrables" },
            ].map(k => (
              <div key={k.lbl} style={s.kpi}>
                <div style={{ ...s.kpiAccent, background: k.accent }} />
                <div style={s.kpiLbl}>{k.lbl}</div>
                <div style={{ ...s.kpiVal, color: k.accent }}>{loading ? "—" : k.val}</div>
                <div style={s.kpiSub}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* AGING BUCKETS */}
          <div style={s.bucketsRow}>
            {bucketStats.map(b => (
              <button
                key={b.key}
                style={{
                  ...s.bucketCard,
                  background: activeBucket === b.key ? b.bg : "#fff",
                  border: activeBucket === b.key ? `1.5px solid ${b.border}` : "0.5px solid #E2E4E9",
                }}
                onClick={() => setActiveBucket(activeBucket === b.key ? null : b.key)}
              >
                <div style={{ ...s.bucketRange, color: b.color, background: b.bg, border: `0.5px solid ${b.border}` }}>
                  {b.range}
                </div>
                <div style={{ ...s.bucketLabel }}>{b.label}</div>
                <div style={{ ...s.bucketCount, color: b.color }}>{loading ? "—" : b.count}</div>
                <div style={s.bucketAmount}>{loading ? "—" : formatMAD(b.amount)}</div>
              </button>
            ))}
          </div>

          {/* BAR CHART */}
          <div style={s.chartCard}>
            <div style={s.chartTitle}>
              Répartition de l&apos;encours par tranche d&apos;âge
              {activeBucket && (
                <button style={s.clearFilter} onClick={() => setActiveBucket(null)}>
                  × Effacer le filtre
                </button>
              )}
            </div>
            <div style={s.chartBars}>
              {bucketStats.map(b => {
                const pct = totalEncours > 0 ? (b.amount / totalEncours) * 100 : 0;
                return (
                  <div key={b.key} style={s.barGroup}>
                    <div style={s.barTrack}>
                      <div style={{ ...s.barFill, height: `${pct}%`, background: b.color, opacity: activeBucket && activeBucket !== b.key ? 0.2 : 1 }} />
                    </div>
                    <div style={s.barLabel}>{b.label}</div>
                    <div style={{ ...s.barPct, color: b.color }}>{pct.toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CLAIMS TABLE */}
          <div style={s.tableCard}>
            <div style={s.tableHdr}>
              <div style={s.tableTitle}>
                {activeBucketData
                  ? <span>Dossiers — <span style={{ color: activeBucketData.color }}>{activeBucketData.label} ({activeBucketData.range})</span></span>
                  : "Tous les dossiers en attente"
                }
              </div>
              <div style={s.tableCount}>{displayClaims.length} dossier{displayClaims.length > 1 ? "s" : ""}</div>
            </div>
            {loading ? (
              <div style={s.loading}>Chargement...</div>
            ) : displayClaims.length === 0 ? (
              <div style={s.loading}>Aucun dossier dans cette tranche.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["N° dossier", "Patient", "Caisse", "Montant", "Âge A/R", "Forclusion", "Risque IA"].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayClaims
                      .sort((a, b) => getDaysInAR(b.service_date) - getDaysInAR(a.service_date))
                      .map(claim => {
                        const days    = getDaysInAR(claim.service_date);
                        const bucket  = getBucket(days);
                        const daysToF = getDaysToForclusion(claim.forclusion_deadline);
                        const ps      = payerStyle(claim.insurance_type);
                        return (
                          <tr key={claim.id} style={s.tr}>
                            <td style={s.td}><span style={s.claimNum}>{claim.claim_number}</span></td>
                            <td style={s.td}><span style={s.patientName}>NE {claim.patient_ne}</span></td>
                            <td style={s.td}>
                              <span style={{ ...s.badge, background: ps.bg, color: ps.color }}>
                                {claim.insurance_type}
                              </span>
                            </td>
                            <td style={s.td}><strong>{formatMAD(claim.amount)}</strong></td>
                            <td style={s.td}>
                              <span style={{ ...s.ageBadge, background: bucket.bg, color: bucket.color, border: `0.5px solid ${bucket.border}` }}>
                                {days}j — {bucket.range}
                              </span>
                            </td>
                            <td style={s.td}>
                              {daysToF !== null ? (
                                <span style={{ fontSize: 11, fontWeight: 600, color: daysToF <= 4 ? "#DC2626" : daysToF <= 15 ? "#EA580C" : "#6B7280" }}>
                                  {daysToF < 0 ? "Forclos" : `J-${daysToF}`}
                                </span>
                              ) : <span style={{ color: "#9EA3AE", fontSize: 11 }}>—</span>}
                            </td>
                            <td style={s.td}>
                              {claim.risk_level ? (
                                <span style={{
                                  ...s.badge,
                                  background: claim.risk_level === "ÉLEVÉ" ? "#FEE2E2" : claim.risk_level === "MODÉRÉ" ? "#FEF9C3" : "#DCFCE7",
                                  color:      claim.risk_level === "ÉLEVÉ" ? "#991B1B" : claim.risk_level === "MODÉRÉ" ? "#854D0E" : "#166534",
                                }}>
                                  {claim.risk_level} {claim.risk_score ? `${Math.round(claim.risk_score * 100)}%` : ""}
                                </span>
                              ) : <span style={{ color: "#9EA3AE", fontSize: 11 }}>—</span>}
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
  topbar:  { background: "#fff", borderBottom: "0.5px solid #E2E4E9", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 16 },
  topTitle:{ fontSize: 14, fontWeight: 600, color: "#1A1D23" },
  topSub:  { fontSize: 11, color: "#9EA3AE", marginTop: 2 },
  chip:    { fontSize: 10, fontWeight: 500, padding: "4px 10px", borderRadius: 20, cursor: "pointer", border: "0.5px solid #E2E4E9", background: "#fff", color: "#6B7280", fontFamily: "inherit" },
  chipActive: { background: "#E6F1FB", color: "#0F62FE", borderColor: "#B5D4F4" },

  content: { flex: 1, overflowY: "auto", padding: "16px 20px" },

  alert:     { background: "#FFF8F0", border: "0.5px solid #FED7AA", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 14 },
  alertText: { fontSize: 12, color: "#9A3412", flex: 1 },

  kpiGrid:  { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 },
  kpi:      { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, padding: "14px 14px 12px", position: "relative", overflow: "hidden" },
  kpiAccent:{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "10px 10px 0 0" },
  kpiLbl:   { fontSize: 9, fontWeight: 600, color: "#9EA3AE", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 },
  kpiVal:   { fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 },
  kpiSub:   { fontSize: 10, color: "#9EA3AE", marginTop: 5 },

  bucketsRow:   { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 14 },
  bucketCard:   { borderRadius: 10, padding: "14px 12px", cursor: "pointer", textAlign: "center", fontFamily: "inherit", transition: "all 0.15s" },
  bucketRange:  { display: "inline-block", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 },
  bucketLabel:  { fontSize: 11, fontWeight: 600, color: "#1A1D23", marginBottom: 6 },
  bucketCount:  { fontSize: 22, fontWeight: 700, lineHeight: 1, marginBottom: 4 },
  bucketAmount: { fontSize: 10, color: "#6B7280" },

  chartCard:  { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, padding: "16px 20px", marginBottom: 14 },
  chartTitle: { fontSize: 12, fontWeight: 600, color: "#1A1D23", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" },
  clearFilter:{ fontSize: 11, color: "#378ADD", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" },
  chartBars:  { display: "flex", gap: 16, alignItems: "flex-end", height: 120 },
  barGroup:   { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  barTrack:   { width: "100%", height: 100, background: "#F3F4F6", borderRadius: 4, display: "flex", alignItems: "flex-end", overflow: "hidden" },
  barFill:    { width: "100%", borderRadius: "4px 4px 0 0", transition: "height 0.3s ease" },
  barLabel:   { fontSize: 10, color: "#6B7280", textAlign: "center" },
  barPct:     { fontSize: 11, fontWeight: 600 },

  tableCard:  { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, overflow: "hidden" },
  tableHdr:   { padding: "12px 16px", borderBottom: "0.5px solid #EEF2F8", display: "flex", alignItems: "center", justifyContent: "space-between" },
  tableTitle: { fontSize: 12, fontWeight: 600, color: "#1A1D23" },
  tableCount: { fontSize: 11, color: "#9EA3AE" },
  loading:    { padding: "24px 16px", fontSize: 13, color: "#9EA3AE" },
  table:      { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th:         { textAlign: "left", padding: "8px 14px", fontSize: 9, fontWeight: 600, color: "#9EA3AE", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "0.5px solid #EEF2F8", background: "#FAFBFF", whiteSpace: "nowrap" },
  tr:         { borderBottom: "0.5px solid #F5F7FA" },
  td:         { padding: "10px 14px", verticalAlign: "middle" },
  claimNum:   { fontFamily: "monospace", fontSize: 11, color: "#1A1D23", fontWeight: 500 },
  patientName:{ fontSize: 12, fontWeight: 500, color: "#1A1D23" },
  badge:      { display: "inline-flex", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20 },
  ageBadge:   { display: "inline-flex", fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20 },
};