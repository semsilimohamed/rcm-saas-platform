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
  risk_score: number | null;
  risk_level: string | null;
  forclusion_deadline: string | null;
  created_at: string;
}

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function urgencyStyle(days: number | null) {
  if (days === null) return { bg: "#F3F4F6", color: "#6B7280", label: "—" };
  if (days < 0)   return { bg: "#F3F4F6", color: "#6B7280", label: "Expiré" };
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
  if (payer === "FAR")   return { bg: "#EFF6FF", color: "#1D4ED8" };
  return { bg: "#F5F3FF", color: "#6D28D9" };
}

export default function ForclusionPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Tous");
  const [userName] = useState(() => {
    if (typeof window === "undefined") return "Utilisateur";
    const user = JSON.parse(localStorage.getItem("sihaiq_user") || "{}");
    return user.name || "Utilisateur";
  });

  useEffect(() => {
    const token = localStorage.getItem("sihaiq_token");
    if (!token) { window.location.href = "/auth/login"; return; }
    const tenantId = localStorage.getItem("sihaiq_tenant_id");

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/claims/with-patients?tenant_id=${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const all: Claim[] = await res.json();
          // Dossiers en attente ayant une échéance de forclusion
          const pending = all.filter(c => c.status === "pending" && c.forclusion_deadline !== null);
          pending.sort((a, b) => {
            const da = daysUntil(a.forclusion_deadline) ?? 9999;
            const db = daysUntil(b.forclusion_deadline) ?? 9999;
            return da - db;
          });
          setClaims(pending);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const critique  = claims.filter(c => { const d = daysUntil(c.forclusion_deadline); return d !== null && d >= 0 && d <= 3; });
  const urgent    = claims.filter(c => { const d = daysUntil(c.forclusion_deadline); return d !== null && d > 3 && d <= 7; });
  const attention = claims.filter(c => { const d = daysUntil(c.forclusion_deadline); return d !== null && d > 7 && d <= 15; });
  const expire    = claims.filter(c => { const d = daysUntil(c.forclusion_deadline); return d !== null && d < 0; });

  const totalAtRisk = [...critique, ...urgent, ...attention].reduce((sum, c) => sum + c.amount, 0);

  const filtered = claims.filter(c => {
    const days = daysUntil(c.forclusion_deadline);
    if (filter === "Critique") return days !== null && days >= 0 && days <= 3;
    if (filter === "Urgent")   return days !== null && days > 3 && days <= 7;
    if (filter === "Attention")return days !== null && days > 7 && days <= 15;
    if (filter === "Expiré")   return days !== null && days < 0;
    return true;
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
          <Link href="/dashboard" style={s.sbItem}> Tableau de bord</Link>
          <Link href="/dashboard/dossiers" style={s.sbItem}> Dossiers BAF</Link>
          <Link href="/dashboard/patients" style={s.sbItem}> Patients</Link>
          <Link href="/dashboard/prediction" style={s.sbItem}> Prédiction IA</Link>
          <div style={s.sbSec}>Analyse</div>
          <Link href="/dashboard/performance" style={s.sbItem}> Performance</Link>
          <Link href="/dashboard/forclusion" style={{ ...s.sbItem, ...s.sbItemActive }}> Forclusion</Link>
          <Link href="/dashboard/encours" style={s.sbItem}> Encours A/R</Link>
          <Link href="/dashboard/financier" style={s.sbItem}> Activité financière</Link>
          <Link href="/dashboard/comptabilite" style={s.sbItem}> Comptabilité DAF</Link>
          <div style={s.sbSec}>Système</div>
          <Link href="/dashboard/audit" style={s.sbItem}> Journal d&apos;audit</Link>
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
            <div style={{ ...s.kpi, borderTop: "3px solid #6B7280" }}>
              <div style={s.kpiLbl}>Expirés</div>
              <div style={{ ...s.kpiVal, color: "#6B7280" }}>{expire.length}</div>
              <div style={s.kpiSub}>Perdus définitivement</div>
            </div>
            <div style={{ ...s.kpi, borderTop: "3px solid #8B5CF6" }}>
              <div style={s.kpiLbl}>Encours à risque</div>
              <div style={{ ...s.kpiVal, color: "#8B5CF6", fontSize: 20 }}>{formatMAD(totalAtRisk)}</div>
              <div style={s.kpiSub}>Montant total en danger</div>
            </div>
          </div>

          {/* ALERT BANNER */}
          {critique.length > 0 && (
            <div style={s.alertBanner}>
              <span style={s.alertText}>
                <strong>{critique.length} dossier{critique.length > 1 ? "s" : ""} expire{critique.length > 1 ? "nt" : ""} dans moins de 3 jours.</strong>
                {" "}Soumettez-les immédiatement pour éviter une perte définitive.
              </span>
            </div>
          )}

          {/* FILTERS */}
          <div style={s.chips}>
            {["Tous", "Critique", "Urgent", "Attention", "Expiré"].map(f => {
              const count = f === "Tous" ? claims.length
                : f === "Critique" ? critique.length
                : f === "Urgent" ? urgent.length
                : f === "Attention" ? attention.length
                : expire.length;
              return (
                <button key={f} style={filter === f ? { ...s.chip, ...s.chipActive } : s.chip} onClick={() => setFilter(f)}>
                  {f} <span style={s.chipCount}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* TABLE */}
          <div style={s.tableCard}>
            {loading ? (
              <div style={s.empty}>Chargement...</div>
            ) : filtered.length === 0 ? (
              <div style={s.empty}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
                Aucun dossier à risque de forclusion dans cette catégorie.
              </div>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    {["N° dossier", "Patient", "Caisse", "Montant", "Échéance", "Délai"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const days = daysUntil(c.forclusion_deadline);
                    const u = urgencyStyle(days);
                    const ps = payerStyle(c.insurance_type);
                    return (
                      <tr key={c.id} style={s.tr}>
                        <td style={s.td}><span style={s.claimNum}>{c.claim_number}</span></td>
                        <td style={s.td}><span style={s.ne}>NE {c.patient_ne}</span></td>
                        <td style={s.td}><span style={{ ...s.badge, background: ps.bg, color: ps.color }}>{c.insurance_type}</span></td>
                        <td style={s.td}>{formatMAD(c.amount)}</td>
                        <td style={s.td}>{c.forclusion_deadline ? formatDate(c.forclusion_deadline) : "—"}</td>
                        <td style={s.td}><span style={{ ...s.badge, background: u.bg, color: u.color }}>{u.label}</span></td>
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
  topbar:  { background: "#fff", borderBottom: "0.5px solid #E5E3DD", padding: "0 20px", height: 52, display: "flex", alignItems: "center", flexShrink: 0 },
  topTitle:{ fontSize: 14, fontWeight: 600, color: "#1A1814" },
  topDate: { fontSize: 11, color: "#9C9890", marginTop: 2 },
  content: { flex: 1, overflowY: "auto", padding: "16px 20px" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 16 },
  kpi:     { background: "#fff", border: "0.5px solid #E5E3DD", borderRadius: 10, padding: "14px 16px" },
  kpiLbl:  { fontSize: 10, fontWeight: 600, color: "#9C9890", textTransform: "uppercase", letterSpacing: "0.06em" },
  kpiVal:  { fontSize: 26, fontWeight: 800, margin: "6px 0 2px" },
  kpiSub:  { fontSize: 10, color: "#9C9890" },
  alertBanner: { background: "#FEF2F2", border: "0.5px solid #FCA5A5", borderRadius: 10, padding: "12px 16px", marginBottom: 16 },
  alertText: { fontSize: 12, color: "#991B1B", lineHeight: 1.5 },
  chips:   { display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" },
  chip:    { fontSize: 11, fontWeight: 500, padding: "5px 12px", borderRadius: 20, cursor: "pointer", border: "0.5px solid #E5E3DD", background: "#fff", color: "#5C5852", fontFamily: "inherit" },
  chipActive: { background: "#EEEDFB", color: "#5B4FE8", borderColor: "#C7C2F7" },
  chipCount: { fontWeight: 700, marginLeft: 2 },
  tableCard: { background: "#fff", border: "0.5px solid #E5E3DD", borderRadius: 10, overflow: "hidden" },
  empty:   { padding: "48px 16px", textAlign: "center", fontSize: 13, color: "#9C9890" },
  table:   { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th:      { textAlign: "left", padding: "10px 14px", fontSize: 9, fontWeight: 600, color: "#9C9890", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "0.5px solid #F2F1EE", background: "#FAFAF7", whiteSpace: "nowrap" },
  tr:      { borderBottom: "0.5px solid #F5F4F1" },
  td:      { padding: "11px 14px", verticalAlign: "middle" },
  claimNum:{ fontFamily: "monospace", fontSize: 11, color: "#1A1814", fontWeight: 500 },
  ne:      { fontSize: 12, fontWeight: 600, color: "#5B4FE8", fontFamily: "monospace" },
  badge:   { display: "inline-flex", fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20 },
};