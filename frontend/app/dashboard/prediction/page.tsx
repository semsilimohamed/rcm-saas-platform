"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface PredictionResult {
  risk_score: number;
  risk_label: string;
  risk_percentage: string;
  top_factors: { feature: string; impact: number; direction: string }[];
  recommended_actions: string[];
  model_used: string;
}

const FEATURE_LABELS: Record<string, string> = {
  payer: "Caisse",
  service_type: "Type de soin",
  ngap_code: "Code NGAP",
  num_acts: "Nombre d'actes",
  patient_age: "Âge du patient",
  is_ald: "ALD",
  is_ayant_droit: "Ayant droit",
  inpe_present: "INPE présent",
  immatriculation_valid: "Immatriculation valide",
  cin_valid: "CIN valide",
  ngap_coding_valid: "Codage NGAP valide",
  prescription_legible: "Prescription lisible",
  droits_active: "Droits actifs",
  docs_completeness_ratio: "Complétude dossier",
  days_since_service: "Jours depuis le soin",
  pec_required: "PEC requise",
  pec_obtained: "PEC obtenue",
};

export default function PredictionPage() {
  const [form, setForm] = useState({
    payer: "CNOPS",
    service_type: "consultation",
    ngap_code: "C",
    num_acts: 1,
    patient_age: 35,
    is_ald: 0,
    is_ayant_droit: 0,
    inpe_present: 1,
    immatriculation_valid: 1,
    cin_valid: 1,
    ngap_coding_valid: 1,
    prescription_legible: 1,
    droits_active: 1,
    docs_completeness_ratio: 1.0,
    days_since_service: 0,
    pec_required: 0,
    pec_obtained: 0,
  });

  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(key: string, val: string | number) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handlePredict() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/predict/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { setError("Erreur lors de la prédiction."); return; }
      setResult(await res.json());
    } catch { setError("Impossible de contacter le serveur."); }
    finally { setLoading(false); }
  }

  function riskColor(label: string) {
    if (label === "ÉLEVÉ")  return { bg: "#FEE2E2", color: "#991B1B", bar: "#DC2626" };
    if (label === "MODÉRÉ") return { bg: "#FEF9C3", color: "#854D0E", bar: "#F59E0B" };
    return { bg: "#DCFCE7", color: "#166534", bar: "#16A34A" };
  }

  const userName = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("sihaiq_user") || "{}").name || "Utilisateur"
    : "Utilisateur";

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
          <a href="/dashboard" style={s.sbItem}>📊 Tableau de bord</a>
          <a href="/dashboard/dossiers" style={s.sbItem}>📋 Dossiers BAF</a>
          <a href="/dashboard/patients" style={s.sbItem}>👥 Patients</a>
          <a href="/dashboard/prediction" style={{ ...s.sbItem, ...s.sbItemActive }}>🧠 Prédiction IA</a>
          <div style={s.sbSec}>Analyse</div>
          <a href="/dashboard/performance" style={s.sbItem}>📈 Performance</a>
          <a href="/dashboard/forclusion" style={s.sbItem}>⚠️ Forclusion</a>
          <a href="/dashboard/encours" style={s.sbItem}>💰 Encours A/R</a>
          <div style={s.sbSec}>Système</div>
          <a href="/dashboard/audit" style={s.sbItem}>📜 Journal d&apos;audit</a>
          <a href="/dashboard/settings" style={s.sbItem}>⚙️ Paramètres</a>
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
            <div style={s.topTitle}>Prédiction IA</div>
            <div style={s.topDate}>Moteur XGBoost · {userName}</div>
          </div>
        </div>

        <div style={s.content}>
          <div style={s.layout}>

            {/* FORM */}
            <div style={s.formPanel}>
              <div style={s.panelTitle}>Critères du dossier</div>
              <div style={s.panelSub}>Renseignez les informations du dossier pour obtenir un score de risque de rejet.</div>

              <div style={s.section}>
                <div style={s.sectionTitle}>Identification</div>
                <div style={s.fieldGrid}>
                  <div style={s.field}>
                    <label style={s.label}>Caisse</label>
                    <select style={s.input} value={form.payer} onChange={e => update("payer", e.target.value)}>
                      <option value="CNOPS">CNOPS</option>
                      <option value="CNSS">CNSS</option>
                      <option value="AMO">AMO</option>
                      <option value="AMO-Tadamon">AMO-Tadamon</option>
                    </select>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Type de soin</label>
                    <select style={s.input} value={form.service_type} onChange={e => update("service_type", e.target.value)}>
                      <option value="consultation">Consultation</option>
                      <option value="hospitalisation">Hospitalisation</option>
                      <option value="chirurgie">Chirurgie</option>
                      <option value="radiologie">Radiologie</option>
                      <option value="laboratoire">Laboratoire</option>
                      <option value="kinesitherapie">Kinésithérapie</option>
                    </select>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Code NGAP</label>
                    <select style={s.input} value={form.ngap_code} onChange={e => update("ngap_code", e.target.value)}>
                      {["C","K","Z","B","AMI","AIS","SPE"].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Âge patient</label>
                    <input style={s.input} type="number" min={0} max={120} value={form.patient_age}
                      onChange={e => update("patient_age", parseInt(e.target.value))} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Nombre d&apos;actes</label>
                    <input style={s.input} type="number" min={1} value={form.num_acts}
                      onChange={e => update("num_acts", parseInt(e.target.value))} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Jours depuis soin</label>
                    <input style={s.input} type="number" min={0} value={form.days_since_service}
                      onChange={e => update("days_since_service", parseInt(e.target.value))} />
                  </div>
                </div>
              </div>

              <div style={s.section}>
                <div style={s.sectionTitle}>Validation du dossier</div>
                <div style={s.toggleGrid}>
                  {[
                    { key: "inpe_present",         label: "INPE présent" },
                    { key: "immatriculation_valid", label: "Immatriculation valide" },
                    { key: "cin_valid",             label: "CIN valide" },
                    { key: "ngap_coding_valid",     label: "Codage NGAP valide" },
                    { key: "prescription_legible",  label: "Prescription lisible" },
                    { key: "droits_active",         label: "Droits actifs" },
                    { key: "is_ald",                label: "ALD" },
                    { key: "is_ayant_droit",        label: "Ayant droit" },
                    { key: "pec_required",          label: "PEC requise" },
                    { key: "pec_obtained",          label: "PEC obtenue" },
                  ].map(f => (
                    <div key={f.key} style={s.toggleItem}
                      onClick={() => update(f.key, form[f.key as keyof typeof form] === 1 ? 0 : 1)}>
                      <div style={{
                        ...s.toggle,
                        background: form[f.key as keyof typeof form] === 1 ? "#0F62FE" : "#E5E7EB",
                      }}>
                        <div style={{
                          ...s.toggleThumb,
                          transform: form[f.key as keyof typeof form] === 1 ? "translateX(16px)" : "translateX(0)",
                        }} />
                      </div>
                      <span style={s.toggleLabel}>{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={s.section}>
                <div style={s.sectionTitle}>Complétude du dossier</div>
                <div style={s.field}>
                  <label style={s.label}>
                    Ratio de complétude : {Math.round(form.docs_completeness_ratio * 100)}%
                  </label>
                  <input style={s.range} type="range" min={0} max={1} step={0.1}
                    value={form.docs_completeness_ratio}
                    onChange={e => update("docs_completeness_ratio", parseFloat(e.target.value))} />
                </div>
              </div>

              {error && <div style={s.errorBox}>{error}</div>}

              <button
                style={loading ? { ...s.predictBtn, opacity: 0.7 } : s.predictBtn}
                onClick={handlePredict}
                disabled={loading}
              >
                {loading ? "Analyse en cours..." : "🧠 Analyser le dossier"}
              </button>
            </div>

            {/* RESULT */}
            <div style={s.resultPanel}>
              <div style={s.panelTitle}>Résultat de l&apos;analyse</div>

              {!result && !loading && (
                <div style={s.emptyResult}>
                  <div style={s.emptyIcon}>🧠</div>
                  <div style={s.emptyText}>Renseignez les critères du dossier et cliquez sur Analyser pour obtenir un score de risque.</div>
                </div>
              )}

              {loading && (
                <div style={s.emptyResult}>
                  <div style={s.emptyIcon}>⏳</div>
                  <div style={s.emptyText}>Analyse en cours...</div>
                </div>
              )}

              {result && (() => {
                const rc = riskColor(result.risk_label);
                return (
                  <>
                    {/* SCORE */}
                    <div style={{ ...s.scoreCard, background: rc.bg, border: `1px solid ${rc.bar}` }}>
                      <div style={s.scoreLabel}>Score de risque de rejet</div>
                      <div style={{ ...s.scoreVal, color: rc.color }}>{result.risk_percentage}</div>
                      <div style={s.scoreBar}>
                        <div style={{ ...s.scoreBarFill, width: result.risk_percentage, background: rc.bar }} />
                      </div>
                      <div style={{ ...s.scoreBadge, background: rc.bar, color: "#fff" }}>
                        {result.risk_label}
                      </div>
                      <div style={s.scoreModel}>Modèle : {result.model_used}</div>
                    </div>

                    {/* TOP FACTORS */}
                    <div style={s.factorsCard}>
                      <div style={s.factorsTitle}>Top 3 facteurs déterminants</div>
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

                    {/* RECOMMENDED ACTIONS */}
                    {result.recommended_actions.length > 0 && (
                      <div style={s.actionsCard}>
                        <div style={s.actionsTitle}>Actions recommandées</div>
                        {result.recommended_actions.map((a, i) => (
                          <div key={i} style={s.actionRow}>
                            <span style={s.actionIcon}>→</span>
                            <span style={s.actionText}>{a}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
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

  content: { flex: 1, overflowY: "auto", padding: "16px 20px" },
  layout:  { display: "grid", gridTemplateColumns: "1fr 380px", gap: 14, height: "100%" },

  formPanel:  { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, padding: 20, overflowY: "auto" },
  resultPanel:{ background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, padding: 20, overflowY: "auto" },
  panelTitle: { fontSize: 13, fontWeight: 600, color: "#1A1D23", marginBottom: 4 },
  panelSub:   { fontSize: 12, color: "#9EA3AE", marginBottom: 16, lineHeight: 1.5 },

  section:      { marginBottom: 18, paddingBottom: 18, borderBottom: "0.5px solid #EEF2F8" },
  sectionTitle: { fontSize: 10, fontWeight: 600, color: "#9EA3AE", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 },
  fieldGrid:    { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 },
  field:        { display: "flex", flexDirection: "column", gap: 5 },
  label:        { fontSize: 10, fontWeight: 500, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" },
  input:        { padding: "7px 10px", border: "0.5px solid #D1D5DB", borderRadius: 7, fontSize: 12, color: "#1A1D23", outline: "none", fontFamily: "inherit", background: "#FAFAFA" },
  range:        { width: "100%", marginTop: 4 },

  toggleGrid:  { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 },
  toggleItem:  { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 0" },
  toggle:      { width: 32, height: 18, borderRadius: 9, position: "relative", flexShrink: 0, transition: "background 0.2s" },
  toggleThumb: { position: "absolute", top: 2, left: 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "transform 0.2s" },
  toggleLabel: { fontSize: 11, color: "#4B5060" },

  predictBtn: { width: "100%", padding: "11px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: "#0F62FE", color: "#fff", fontFamily: "inherit", marginTop: 4 },
  errorBox:   { background: "#FEE2E2", border: "0.5px solid #FCA5A5", borderRadius: 7, padding: "8px 12px", fontSize: 12, color: "#991B1B", marginBottom: 10 },

  emptyResult: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 12 },
  emptyIcon:   { fontSize: 40 },
  emptyText:   { fontSize: 13, color: "#9EA3AE", textAlign: "center", lineHeight: 1.6, maxWidth: 280 },

  scoreCard:    { borderRadius: 10, padding: 16, marginBottom: 12 },
  scoreLabel:   { fontSize: 10, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 },
  scoreVal:     { fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 },
  scoreBar:     { height: 6, background: "rgba(0,0,0,0.1)", borderRadius: 3, overflow: "hidden", marginBottom: 10 },
  scoreBarFill: { height: "100%", borderRadius: 3, transition: "width 0.5s" },
  scoreBadge:   { display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginBottom: 8 },
  scoreModel:   { fontSize: 10, color: "#9EA3AE" },

  factorsCard:  { background: "#F8FBFF", border: "0.5px solid #E6F1FB", borderRadius: 10, padding: 14, marginBottom: 12 },
  factorsTitle: { fontSize: 11, fontWeight: 600, color: "#1A1D23", marginBottom: 10 },
  factorRow:    { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "0.5px solid #EEF2F8" },
  factorLeft:   { display: "flex", alignItems: "center", gap: 8 },
  factorRank:   { width: 18, height: 18, borderRadius: "50%", background: "#E6F1FB", color: "#0F62FE", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" },
  factorName:   { fontSize: 12, color: "#1A1D23" },
  factorRight:  { display: "flex", alignItems: "center", gap: 8 },
  factorDir:    { fontSize: 10, fontWeight: 500 },
  factorImpact: { fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "monospace" },

  actionsCard:  { background: "#FFF8F0", border: "0.5px solid #FED7AA", borderRadius: 10, padding: 14 },
  actionsTitle: { fontSize: 11, fontWeight: 600, color: "#9A3412", marginBottom: 10 },
  actionRow:    { display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" },
  actionIcon:   { color: "#EA580C", fontWeight: 700, flexShrink: 0, marginTop: 1 },
  actionText:   { fontSize: 12, color: "#9A3412", lineHeight: 1.5 },
};