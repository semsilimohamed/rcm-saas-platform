"use client";

import { useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface TopFactor {
  feature: string;
  impact: number;
  direction: string;
}

interface PredictionResult {
  risk_score: number;
  risk_level: string;
  risk_percentage: string;
  zone: "danger" | "sure";
  seuil: number;
  top_factors: TopFactor[];
  recommended_action: string | null;
  model_used: string;
}

const FEATURE_LABELS: Record<string, string> = {
  duree_sejour: "Durée de séjour",
  part_organisme: "Part organisme",
  montant_total: "Montant total",
  mois: "Mois du service",
  "org_CNOPS": "Régime CNOPS",
  "org_CNSS": "Régime CNSS",
  "org_FAR": "Régime FAR",
};

const MOIS_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default function PredictionPage() {
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");

  const [form, setForm] = useState({
    organisme: "CNOPS",
    duree_sejour: 3,
    part_organisme: 0.8,
    montant_total: 5000,
    mois: new Date().getMonth() + 1,
  });
  const [result, setResult]   = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  function update(key: string, val: string | number) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handlePredict() {
    setLoading(true); setError(""); setResult(null);
    try {
      const token = localStorage.getItem("sihaiq_token");
      const res = await fetch(`${API_URL}/claims/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          organisme: form.organisme,
          duree_sejour: Number(form.duree_sejour),
          part_organisme: Number(form.part_organisme),
          montant_total: Number(form.montant_total),
          mois: Number(form.mois),
        }),
      });
      if (!res.ok) { setError("Erreur lors de la prédiction."); return; }
      setResult(await res.json());
    } catch { setError("Impossible de contacter le serveur."); }
    finally { setLoading(false); }
  }

  const userName = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("sihaiq_user") || "{}").name || "Utilisateur"
    : "Utilisateur";

  const isDanger = result?.zone === "danger";

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
          <Link href="/dashboard"            style={s.sbItem}> Tableau de bord</Link>
          <Link href="/dashboard/dossiers"   style={s.sbItem}> Dossiers BAF</Link>
          <Link href="/dashboard/patients"   style={s.sbItem}> Patients</Link>
          <div style={{ ...s.sbItem, ...s.sbItemActive }}> Prédiction IA</div>
          <div style={s.sbSec}>Analyse</div>
          <Link href="/dashboard/performance" style={s.sbItem}> Performance</Link>
          <Link href="/dashboard/forclusion"  style={s.sbItem}> Forclusion</Link>
          <Link href="/dashboard/encours"     style={s.sbItem}> Encours A/R</Link>
          <Link href="/dashboard/financier" style={s.sbItem}> Activité financière</Link>
          <Link href="/dashboard/comptabilite" style={s.sbItem}>Comptabilité DAF</Link>
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
            <div style={s.topTitle}>Prédiction IA</div>
            <div style={s.topDate}>Moteur SihaIQ · {userName}</div>
          </div>
          <div style={s.tabBar}>
            <button
              style={activeTab === "single" ? { ...s.tab, ...s.tabActive } : s.tab}
              onClick={() => setActiveTab("single")}
            >
              Analyse individuelle
            </button>
            <button
              style={activeTab === "batch" ? { ...s.tab, ...s.tabActive } : s.tab}
              onClick={() => setActiveTab("batch")}
            >
              Analyse par lot (bientôt)
            </button>
          </div>
        </div>

        <div style={s.content}>

          {activeTab === "single" && (
            <div style={s.layout}>
              {/* FORM */}
              <div style={s.formPanel}>
                <div style={s.panelTitle}>Critères du dossier</div>
                <div style={s.panelSub}>
                  Simulez un dossier pour obtenir son score de risque de rejet. Aucun dossier n&apos;est créé.
                </div>

                <div style={s.privacyNote}>
                  Le modèle s&apos;appuie sur 5 variables réelles, validées sur les données BAF. Aucune donnée patient n&apos;est requise.
                </div>

                <div style={s.section}>
                  <div style={s.sectionTitle}>Variables du modèle</div>
                  <div style={s.fieldGrid}>
                    <div style={s.field}>
                      <label style={s.label}>Caisse (organisme)</label>
                      <select style={s.input} value={form.organisme} onChange={e => update("organisme", e.target.value)}>
                        <option value="CNOPS">CNOPS</option>
                        <option value="CNSS">CNSS</option>
                        <option value="FAR">FAR</option>
                      </select>
                    </div>

                    <div style={s.field}>
                      <label style={s.label}>Mois du service</label>
                      <select style={s.input} value={form.mois} onChange={e => update("mois", parseInt(e.target.value))}>
                        {MOIS_LABELS.map((m, i) => (
                          <option key={m} value={i + 1}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div style={s.section}>
                  <div style={s.sectionTitle}>Durée de séjour : {form.duree_sejour} jour{form.duree_sejour > 1 ? "s" : ""}</div>
                  <input style={s.range} type="range" min={1} max={30} step={1}
                    value={form.duree_sejour}
                    onChange={e => update("duree_sejour", parseInt(e.target.value))} />
                  <div style={s.rangeHint}>Connue à la sortie du patient · variable la plus prédictive</div>
                </div>

                <div style={s.section}>
                  <div style={s.sectionTitle}>Part organisme : {Math.round(form.part_organisme * 100)}%</div>
                  <input style={s.range} type="range" min={0.5} max={1} step={0.01}
                    value={form.part_organisme}
                    onChange={e => update("part_organisme", parseFloat(e.target.value))} />
                  <div style={s.rangeHint}>Part prise en charge par la caisse</div>
                </div>

                <div style={s.section}>
                  <div style={s.sectionTitle}>Montant total</div>
                  <div style={s.field}>
                    <input style={s.input} type="number" min={0} step={100}
                      value={form.montant_total}
                      onChange={e => update("montant_total", parseFloat(e.target.value) || 0)} />
                    <div style={s.rangeHint}>Montant réclamé en MAD</div>
                  </div>
                </div>

                {error && <div style={s.errorBox}>{error}</div>}

                <button
                  style={loading ? { ...s.predictBtn, opacity: 0.7 } : s.predictBtn}
                  onClick={handlePredict} disabled={loading}
                >
                  {loading ? "Analyse en cours..." : "Analyser le dossier"}
                </button>
              </div>

              {/* RESULT */}
              <div style={s.resultPanel}>
                <div style={s.panelTitle}>Résultat de l&apos;analyse</div>

                {!result && !loading && (
                  <div style={s.emptyResult}>
                    <div style={s.emptyText}>
                      Renseignez les critères du dossier et cliquez sur Analyser pour obtenir un score de risque.
                    </div>
                  </div>
                )}

                {loading && (
                  <div style={s.emptyResult}>
                    <div style={s.emptyText}>Analyse en cours...</div>
                  </div>
                )}

                {result && (
                  <>
                    <div style={{
                      ...s.zoneCard,
                      background: isDanger ? "#FEF2F2" : "#F0FDF4",
                      border: `1px solid ${isDanger ? "#FCA5A5" : "#86EFAC"}`,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isDanger ? "#991B1B" : "#166534", letterSpacing: "0.06em" }}>
                        {isDanger ? "ZONE DANGER" : "ZONE SÛRE"}
                      </div>
                      <div style={{ fontSize: 40, fontWeight: 800, color: isDanger ? "#DC2626" : "#16A34A", margin: "8px 0", letterSpacing: "-0.02em" }}>
                        {result.risk_percentage}
                      </div>
                      <div style={s.scoreBar}>
                        <div style={{ ...s.scoreBarFill, width: result.risk_percentage, background: isDanger ? "#DC2626" : "#16A34A" }} />
                      </div>
                      <div style={{ fontSize: 12, color: "#5C5852", marginTop: 10 }}>
                        Risque de rejet · {result.risk_level}
                      </div>
                      <div style={s.seuilNote}>
                        Seuil d&apos;alerte : {Math.round(result.seuil * 100)}% (priorité au rappel)
                      </div>
                    </div>

                    {isDanger && result.recommended_action && (
                      <div style={s.actionsCard}>
                        <div style={s.actionsTitle}>Action recommandée</div>
                        <div style={s.actionText}>{result.recommended_action}</div>
                        <div style={s.actionSub}>
                          Vérifiez le dossier acte par acte avant envoi à l&apos;organisme.
                        </div>
                      </div>
                    )}

                    {!isDanger && (
                      <div style={s.safeCard}>
                        <div style={s.safeTitle}>Dossier conforme</div>
                        <div style={s.safeText}>
                          Aucun facteur de risque majeur détecté. Le dossier peut être envoyé à l&apos;organisme.
                        </div>
                      </div>
                    )}

                    <div style={s.factorsCard}>
                      <div style={s.factorsTitle}>Facteurs déterminants (SHAP)</div>
                      {result.top_factors.map((f, i) => (
                        <div key={i} style={s.factorRow}>
                          <div style={s.factorLeft}>
                            <span style={s.factorRank}>{i + 1}</span>
                            <span style={s.factorName}>{FEATURE_LABELS[f.feature] || f.feature}</span>
                          </div>
                          <div style={s.factorRight}>
                            <span style={{ ...s.factorDir, color: f.impact > 0 ? "#DC2626" : "#16A34A" }}>
                              {f.direction}
                            </span>
                            <span style={s.factorImpact}>{Math.abs(f.impact).toFixed(3)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={s.modelNote}>{result.model_used}</div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === "batch" && (
            <div style={s.batchEmpty}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1814", marginBottom: 8 }}>
                Analyse par lot — bientôt disponible
              </div>
              <div style={{ fontSize: 13, color: "#9C9890", lineHeight: 1.6, maxWidth: 460, margin: "0 auto" }}>
                L&apos;import CSV en masse sera aligné sur les 5 variables du modèle
                (organisme, durée de séjour, part organisme, montant, mois).
                En attendant, utilisez l&apos;analyse individuelle.
              </div>
              <button style={{ ...s.predictBtn, width: "auto", marginTop: 20, padding: "9px 20px" }}
                onClick={() => setActiveTab("single")}>
                Aller à l&apos;analyse individuelle
              </button>
            </div>
          )}

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
  topbar:  { background: "#fff", borderBottom: "0.5px solid #E5E3DD", padding: "0 20px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 16 },
  topTitle:{ fontSize: 14, fontWeight: 600, color: "#1A1814" },
  topDate: { fontSize: 11, color: "#9C9890", marginTop: 2 },

  tabBar:    { display: "flex", gap: 4 },
  tab:       { fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 8, cursor: "pointer", border: "0.5px solid #E5E3DD", background: "#fff", color: "#5C5852", fontFamily: "inherit" },
  tabActive: { background: "#EEEDFB", color: "#5B4FE8", borderColor: "#C7C2F7", fontWeight: 600 },

  content: { flex: 1, overflowY: "auto", padding: "16px 20px" },
  layout:  { display: "grid", gridTemplateColumns: "1fr 380px", gap: 14 },

  formPanel:   { background: "#fff", border: "0.5px solid #E5E3DD", borderRadius: 10, padding: 20, overflowY: "auto" },
  resultPanel: { background: "#fff", border: "0.5px solid #E5E3DD", borderRadius: 10, padding: 20, overflowY: "auto" },
  panelTitle:  { fontSize: 13, fontWeight: 600, color: "#1A1814", marginBottom: 4 },
  panelSub:    { fontSize: 12, color: "#9C9890", marginBottom: 14, lineHeight: 1.5 },
  privacyNote: { fontSize: 11, color: "#6D28D9", background: "#F5F3FF", border: "0.5px solid #DDD6FE", borderRadius: 7, padding: "8px 10px", marginBottom: 16, lineHeight: 1.5 },

  section:      { marginBottom: 18, paddingBottom: 18, borderBottom: "0.5px solid #F2F1EE" },
  sectionTitle: { fontSize: 11, fontWeight: 600, color: "#1A1814", marginBottom: 10 },
  fieldGrid:    { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 },
  field:        { display: "flex", flexDirection: "column", gap: 5 },
  label:        { fontSize: 10, fontWeight: 500, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" },
  input:        { padding: "8px 10px", border: "0.5px solid #D1D5DB", borderRadius: 7, fontSize: 12, color: "#1A1814", outline: "none", fontFamily: "inherit", background: "#FAFAFA" },
  range:        { width: "100%", marginTop: 4, accentColor: "#5B4FE8" },
  rangeHint:    { fontSize: 10, color: "#9C9890", marginTop: 6 },
  predictBtn:   { width: "100%", padding: "11px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: "#5B4FE8", color: "#fff", fontFamily: "inherit", marginTop: 4 },
  errorBox:     { background: "#FEE2E2", border: "0.5px solid #FCA5A5", borderRadius: 7, padding: "8px 12px", fontSize: 12, color: "#991B1B", marginBottom: 10 },

  emptyResult:  { display: "flex", alignItems: "center", justifyContent: "center", height: 300 },
  emptyText:    { fontSize: 13, color: "#9C9890", textAlign: "center", lineHeight: 1.6, maxWidth: 280 },

  zoneCard:     { borderRadius: 10, padding: "18px 16px", marginBottom: 12, textAlign: "center" },
  scoreBar:     { height: 6, background: "rgba(0,0,0,0.08)", borderRadius: 3, overflow: "hidden", marginTop: 4 },
  scoreBarFill: { height: "100%", borderRadius: 3, transition: "width 0.5s" },
  seuilNote:    { fontSize: 10, color: "#9C9890", marginTop: 8 },

  actionsCard:  { background: "#FFF8F0", border: "0.5px solid #FED7AA", borderRadius: 10, padding: 14, marginBottom: 12 },
  actionsTitle: { fontSize: 11, fontWeight: 600, color: "#9A3412", marginBottom: 8 },
  actionText:   { fontSize: 12, color: "#9A3412", lineHeight: 1.5, marginBottom: 8 },
  actionSub:    { fontSize: 11, color: "#C2410C", lineHeight: 1.5, fontStyle: "italic" },

  safeCard:     { background: "#F0FDF4", border: "0.5px solid #86EFAC", borderRadius: 10, padding: 14, marginBottom: 12 },
  safeTitle:    { fontSize: 11, fontWeight: 600, color: "#166534", marginBottom: 6 },
  safeText:     { fontSize: 12, color: "#166534", lineHeight: 1.5 },

  factorsCard:  { background: "#F8F7FE", border: "0.5px solid #EEEDFB", borderRadius: 10, padding: 14, marginBottom: 12 },
  factorsTitle: { fontSize: 11, fontWeight: 600, color: "#1A1814", marginBottom: 10 },
  factorRow:    { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "0.5px solid #F2F1EE" },
  factorLeft:   { display: "flex", alignItems: "center", gap: 8 },
  factorRank:   { width: 18, height: 18, borderRadius: "50%", background: "#EEEDFB", color: "#5B4FE8", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  factorName:   { fontSize: 12, color: "#1A1814" },
  factorRight:  { display: "flex", alignItems: "center", gap: 8 },
  factorDir:    { fontSize: 10, fontWeight: 500 },
  factorImpact: { fontSize: 11, fontWeight: 600, color: "#5C5852", fontFamily: "monospace" },

  modelNote:    { fontSize: 10, color: "#9C9890", textAlign: "center", marginTop: 4 },

  batchEmpty:   { textAlign: "center", padding: "70px 20px", background: "#fff", borderRadius: 10, border: "0.5px solid #E5E3DD" },
};