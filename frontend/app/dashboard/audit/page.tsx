"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface AuditLog {
  id: string;
  user_email: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: string | null;
  created_at: string;
}

const ACTION_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  "DOSSIER_APPROUVÉ":  { bg: "#DCFCE7", color: "#166534", label: "Approuvé" },
  "DOSSIER_REJETÉ":    { bg: "#FEE2E2", color: "#991B1B", label: "Rejeté" },
  "DOSSIER_SUPPRIMÉ":  { bg: "#FEF9C3", color: "#854D0E", label: "Supprimé" },
  "DOSSIER_CRÉÉ":      { bg: "#E6F1FB", color: "#1E40AF", label: "Créé" },
  "PATIENT_CRÉÉ":      { bg: "#F0FDF4", color: "#166534", label: "Patient créé" },
  "PATIENT_SUPPRIMÉ":  { bg: "#FEE2E2", color: "#991B1B", label: "Patient supprimé" },
  "CONNEXION":         { bg: "#F5F3FF", color: "#6D28D9", label: "Connexion" },
  "DÉCONNEXION":       { bg: "#F3F4F6", color: "#6B7280", label: "Déconnexion" },
};

function getActionStyle(action: string) {
  return ACTION_STYLES[action] ?? { bg: "#F3F4F6", color: "#6B7280", label: action };
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" })
    + " · "
    + d.toLocaleTimeString("fr-MA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function getInitials(email: string) {
  if (!email || email === "inconnu") return "?";
  return email.split("@")[0].slice(0, 2).toUpperCase();
}
function getLast7Days(logs: AuditLog[]) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("fr-MA", { day: "2-digit", month: "short" });
    const dateStr = d.toISOString().split("T")[0];
    const count = logs.filter(l => l.created_at.startsWith(dateStr)).length;
    days.push({ label, count });
  }
  return days;
}
export default function AuditPage() {
  const [logs, setLogs]           = useState<AuditLog[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [actionFilter, setActionFilter] = useState("Tous");
  const [timeFilter, setTimeFilter] = useState("Tous");


  useEffect(() => {
    const load = async () => {
      const token    = localStorage.getItem("sihaiq_token");
      if (!token) { window.location.href = "/auth/login"; return; }
      const tenantId = localStorage.getItem("sihaiq_tenant_id");
      try {
        const res = await fetch(`${API_URL}/audit/logs?tenant_id=${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setLogs(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const uniqueActions = ["Tous", ...Array.from(new Set(logs.map(l => l.action)))];

  const filtered = logs.filter(l => {
    const matchAction = actionFilter === "Tous" || l.action === actionFilter;
    const matchSearch = search === "" ||
      l.user_email.toLowerCase().includes(search.toLowerCase()) ||
      (l.resource_id ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (l.details ?? "").toLowerCase().includes(search.toLowerCase());
    const logDate = new Date(l.created_at);
    const now = new Date();
    let matchTime = true;
    if (timeFilter === "Aujourd'hui") {
      matchTime = logDate.toDateString() === now.toDateString();
    } else if (timeFilter === "7 derniers jours") {
      const d7 = new Date(); d7.setDate(now.getDate() - 7);
      matchTime = logDate >= d7;
    } else if (timeFilter === "30 derniers jours") {
      const d30 = new Date(); d30.setDate(now.getDate() - 30);
      matchTime = logDate >= d30;
    } else if (timeFilter === "Ce mois") {
      matchTime = logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
    }
    return matchAction && matchSearch && matchTime;
  });

  // KPI counts
  const totalToday = logs.filter(l => {
    const d = new Date(l.created_at);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
  }).length;

  const uniqueUsers = new Set(logs.map(l => l.user_email)).size;
  const deletions   = logs.filter(l => l.action === "DOSSIER_SUPPRIMÉ").length;
  const rejections  = logs.filter(l => l.action === "DOSSIER_REJETÉ").length;

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
          <Link href="/dashboard"            style={s.sbItem}>📊 Tableau de bord</Link>
          <Link href="/dashboard/dossiers"   style={s.sbItem}>📋 Dossiers BAF</Link>
          <Link href="/dashboard/patients"   style={s.sbItem}>👥 Patients</Link>
          <Link href="/dashboard/prediction" style={s.sbItem}>🧠 Prédiction IA</Link>
          <div style={s.sbSec}>Analyse</div>
          <Link href="/dashboard/performance" style={s.sbItem}>📈 Performance</Link>
          <Link href="/dashboard/forclusion"  style={s.sbItem}>⚠️ Forclusion</Link>
          <Link href="/dashboard/encours"     style={s.sbItem}>💰 Encours A/R</Link>
          <div style={s.sbSec}>Système</div>
          <div style={{ ...s.sbItem, ...s.sbItemActive }}>📜 Journal d&apos;audit</div>
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

        {/* TOPBAR */}
        <div style={s.topbar}>
          <div>
            <div style={s.topTitle}>Journal d&apos;audit</div>
            <div style={s.topSub}>Traçabilité complète des actions </div>
          </div>
          <div style={s.topRight}>
            <input
              style={s.searchInput}
              placeholder="Rechercher utilisateur, dossier, détail..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={s.content}>

          {/* KPI ROW */}
          <div style={s.kpiGrid}>
            {[
              { lbl: "Total événements", val: String(logs.length),   accent: "#0F62FE", sub: "depuis le début" },
              { lbl: "Aujourd'hui",      val: String(totalToday),    accent: "#8B5CF6", sub: "actions enregistrées" },
              { lbl: "Utilisateurs",     val: String(uniqueUsers),   accent: "#16A34A", sub: "actifs sur la plateforme" },
              { lbl: "Suppressions",     val: String(deletions),     accent: "#F59E0B", sub: "dossiers supprimés" },
              { lbl: "Rejets saisis",    val: String(rejections),    accent: "#DC2626", sub: "statuts rejetés" },
            ].map(k => (
              <div key={k.lbl} style={s.kpi}>
                <div style={{ ...s.kpiAccent, background: k.accent }} />
                <div style={s.kpiLbl}>{k.lbl}</div>
                <div style={{ ...s.kpiVal, color: k.accent }}>{loading ? "—" : k.val}</div>
                <div style={s.kpiSub}>{k.sub}</div>
              </div>
            ))}
          </div>
          {/* HISTORIQUE 7 JOURS */}
          <div style={s.histCard}>
            <div style={s.histTitle}>Activité des 7 derniers jours</div>
            <div style={s.histBars}>
              {getLast7Days(logs).map((d, i) => {
                const max = Math.max(...getLast7Days(logs).map(x => x.count), 1);
                const pct = (d.count / max) * 100;
                return (
                  <div key={i} style={s.histBarGroup}>
                    <div style={s.histBarCount}>{d.count > 0 ? d.count : ""}</div>
                    <div style={s.histBarTrack}>
                      <div style={{
                        ...s.histBarFill,
                        height: `${pct}%`,
                        background: pct > 66 ? "#0F62FE" : pct > 33 ? "#8B5CF6" : "#B5D4F4",
                      }} />
                    </div>
                    <div style={s.histBarLabel}>{d.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FILTERS */}
          <div style={s.filterBar}>
            <span style={s.filterLabel}>Action :</span>
            <div style={s.chips}>
              {uniqueActions.map(a => (
                <button
                  key={a}
                  style={actionFilter === a ? { ...s.chip, ...s.chipActive } : s.chip}
                  onClick={() => setActionFilter(a)}
                >
                  {a === "Tous" ? "Tous" : (ACTION_STYLES[a]?.label ?? a)}
                </button>
              ))}
            </div>
            <span style={{ ...s.filterLabel, marginLeft: 8 }}>Période :</span>
            <div style={s.chips}>
              {["Tous", "Aujourd'hui", "7 derniers jours", "30 derniers jours", "Ce mois"].map(t => (
                <button
                  key={t}
                  style={timeFilter === t ? { ...s.chip, ...s.chipActive } : s.chip}
                  onClick={() => setTimeFilter(t)}
                >{t}</button>
              ))}
            </div>
          </div>

          {/* LOG TABLE */}
          <div style={s.tableCard}>
            <div style={s.tableHdr}>
              <div style={s.tableTitle}>
                {filtered.length} événement{filtered.length > 1 ? "s" : ""}
                {actionFilter !== "Tous" && ` · ${ACTION_STYLES[actionFilter]?.label ?? actionFilter}`}
              </div>
              <div style={s.immutable}> Journal </div>
            </div>

            {loading ? (
              <div style={s.loading}>Chargement du journal d&apos;audit...</div>
            ) : filtered.length === 0 ? (
              <div style={s.loading}>Aucun événement trouvé.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["Date & heure", "Utilisateur", "Action", "Dossier / Ressource", "Détails"].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(log => {
                      const ast = getActionStyle(log.action);
                      return (
                        <tr key={log.id} style={s.tr}>
                          <td style={s.td}>
                            <span style={s.datetime}>{formatDateTime(log.created_at)}</span>
                          </td>
                          <td style={s.td}>
                            <div style={s.userCell}>
                              <div style={s.avatar}>{getInitials(log.user_email)}</div>
                              <span style={s.userEmail}>{log.user_email}</span>
                            </div>
                          </td>
                          <td style={s.td}>
                            <span style={{ ...s.actionBadge, background: ast.bg, color: ast.color }}>
                              {ast.label}
                            </span>
                          </td>
                          <td style={s.td}>
                            {log.resource_id
                              ? <span style={s.resourceId}>{log.resource_id}</span>
                              : <span style={s.dash}>—</span>}
                          </td>
                          <td style={s.td}>
                            <span style={s.details}>{log.details ?? "—"}</span>
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
  topbar:  { background: "#fff", borderBottom: "0.5px solid #E2E4E9", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  topTitle:{ fontSize: 14, fontWeight: 600, color: "#1A1D23" },
  topSub:  { fontSize: 11, color: "#9EA3AE", marginTop: 2 },
  topRight:{ display: "flex", alignItems: "center", gap: 10 },
  searchInput: { padding: "7px 14px", border: "0.5px solid #D1D5DB", borderRadius: 8, fontSize: 12, color: "#1A1D23", outline: "none", fontFamily: "inherit", background: "#fff", width: 280 },

  content: { flex: 1, overflowY: "auto", padding: "16px 20px" },

  kpiGrid:  { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 14 },
  kpi:      { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, padding: "14px 14px 12px", position: "relative", overflow: "hidden" },
  kpiAccent:{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "10px 10px 0 0" },
  kpiLbl:   { fontSize: 9, fontWeight: 600, color: "#9EA3AE", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 },
  kpiVal:   { fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 },
  kpiSub:   { fontSize: 10, color: "#9EA3AE", marginTop: 5 },

  filterBar:   { display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" },
  filterLabel: { fontSize: 11, color: "#6B7280", fontWeight: 500, flexShrink: 0 },
  chips:       { display: "flex", gap: 5, flexWrap: "wrap" },
  chip:        { fontSize: 10, fontWeight: 500, padding: "4px 10px", borderRadius: 20, cursor: "pointer", border: "0.5px solid #E2E4E9", background: "#fff", color: "#6B7280", fontFamily: "inherit" },
  chipActive:  { background: "#E6F1FB", color: "#0F62FE", borderColor: "#B5D4F4" },

  tableCard:  { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, overflow: "hidden" },
  tableHdr:   { padding: "12px 16px", borderBottom: "0.5px solid #EEF2F8", display: "flex", alignItems: "center", justifyContent: "space-between" },
  tableTitle: { fontSize: 12, fontWeight: 600, color: "#1A1D23" },
  immutable:  { fontSize: 10, color: "#6B7280", background: "#F0F4FA", padding: "3px 8px", borderRadius: 20 },
  loading:    { padding: "24px 16px", fontSize: 13, color: "#9EA3AE" },
  table:      { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th:         { textAlign: "left", padding: "8px 14px", fontSize: 9, fontWeight: 600, color: "#9EA3AE", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "0.5px solid #EEF2F8", background: "#FAFBFF", whiteSpace: "nowrap" },
  tr:         { borderBottom: "0.5px solid #F5F7FA" },
  td:         { padding: "10px 14px", verticalAlign: "middle" },

  datetime:   { fontSize: 11, color: "#6B7280", whiteSpace: "nowrap" },
  userCell:   { display: "flex", alignItems: "center", gap: 8 },
  avatar:     { width: 24, height: 24, borderRadius: "50%", background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#0F62FE", flexShrink: 0 },
  userEmail:  { fontSize: 11, color: "#1A1D23", fontWeight: 500 },
  actionBadge:{ display: "inline-flex", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" },
  resourceId: { fontFamily: "monospace", fontSize: 11, color: "#0F62FE", fontWeight: 500 },
  details:    { fontSize: 11, color: "#6B7280", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" },
  dash:       { fontSize: 11, color: "#9EA3AE" },
  histCard:      { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, padding: "16px 20px", marginBottom: 14 },
  histTitle:     { fontSize: 12, fontWeight: 600, color: "#1A1D23", marginBottom: 14 },
  histBars:      { display: "flex", gap: 8, alignItems: "flex-end", height: 80 },
  histBarGroup:  { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  histBarCount:  { fontSize: 10, fontWeight: 600, color: "#6B7280", height: 14 },
  histBarTrack:  { width: "100%", height: 52, background: "#F3F4F6", borderRadius: 4, display: "flex", alignItems: "flex-end", overflow: "hidden" },
  histBarFill:   { width: "100%", borderRadius: "4px 4px 0 0", transition: "height 0.3s" },
  histBarLabel:  { fontSize: 9, color: "#9EA3AE", textAlign: "center", whiteSpace: "nowrap" },
};