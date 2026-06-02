"use client";

import { useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface PredictionResult {
  risk_score: number;
  risk_label: string;
  risk_percentage: string;
  top_factors: { feature: string; impact: number; direction: string }[];
  recommended_actions: string[];
  model_used: string;
}

interface BatchRow {
  index: number;
  payer: string;
  service_type: string;
  patient_name?: string;
  risk_score?: number;
  risk_label?: string;
  risk_percentage?: string;
  top_factor?: string;
  status: "pending" | "done" | "error";
  feedback?: "approved" | "rejected";
}

const FEATURE_LABELS: Record<string, string> = {
  payer: "Caisse", service_type: "Type de soin", ngap_code: "Code NGAP",
  num_acts: "Nombre d'actes", patient_age: "Âge du patient", is_ald: "ALD",
  is_ayant_droit: "Ayant droit", inpe_present: "INPE présent",
  immatriculation_valid: "Immatriculation valide", cin_valid: "CIN valide",
  ngap_coding_valid: "Codage NGAP valide", prescription_legible: "Prescription lisible",
  droits_active: "Droits actifs", docs_completeness_ratio: "Complétude dossier",
  days_since_service: "Jours depuis le soin", pec_required: "PEC requise", pec_obtained: "PEC obtenue",
};

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

function buildPayload(row: Record<string, string>) {
  return {
    payer:                  row["payer"] || row["caisse"] || "CNOPS",
    service_type:           row["service_type"] || row["type_service"] || "consultation",
    ngap_code:              row["ngap_code"] || row["code_ngap"] || "C",
    num_acts:               parseInt(row["num_acts"] || row["nombre_actes"] || "1") || 1,
    patient_age:            parseInt(row["patient_age"] || row["age"] || "35") || 35,
    is_ald:                 parseInt(row["is_ald"] || "0") || 0,
    is_ayant_droit:         parseInt(row["is_ayant_droit"] || "0") || 0,
    inpe_present:           parseInt(row["inpe_present"] || "1") || 1,
    immatriculation_valid:  parseInt(row["immatriculation_valid"] || "1") || 1,
    cin_valid:              parseInt(row["cin_valid"] || "1") || 1,
    ngap_coding_valid:      parseInt(row["ngap_coding_valid"] || "1") || 1,
    prescription_legible:   parseInt(row["prescription_legible"] || "1") || 1,
    droits_active:          parseInt(row["droits_active"] || "1") || 1,
    docs_completeness_ratio:parseFloat(row["docs_completeness_ratio"] || row["completude"] || "1.0") || 1.0,
    days_since_service:     parseInt(row["days_since_service"] || row["jours"] || "0") || 0,
    pec_required:           parseInt(row["pec_required"] || "0") || 0,
    pec_obtained:           parseInt(row["pec_obtained"] || "0") || 0,
  };
}

export default function PredictionPage() {
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");

  // ── Single prediction ────────────────────────────────────────────────────
  const [form, setForm] = useState({
    payer: "CNOPS", service_type: "consultation", ngap_code: "C",
    num_acts: 1, patient_age: 35, is_ald: 0, is_ayant_droit: 0,
    inpe_present: 1, immatriculation_valid: 1, cin_valid: 1,
    ngap_coding_valid: 1, prescription_legible: 1, droits_active: 1,
    docs_completeness_ratio: 1.0, days_since_service: 0, pec_required: 0, pec_obtained: 0,
  });
  const [result, setResult]     = useState<PredictionResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  function update(key: string, val: string | number) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handlePredict() {
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`${API_URL}/predict/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { setError("Erreur lors de la prédiction."); return; }
      setResult(await res.json());
    } catch { setError("Impossible de contacter le serveur."); }
    finally { setLoading(false); }
  }

  // ── Batch prediction ─────────────────────────────────────────────────────
  const [batchFile, setBatchFile]         = useState<File | null>(null);
  const [batchRows, setBatchRows]         = useState<BatchRow[]>([]);
  const [rawRows, setRawRows]             = useState<Record<string, string>[]>([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchRunning, setBatchRunning]   = useState(false);
  const [batchDone, setBatchDone]         = useState(false);
  const [batchFilter, setBatchFilter]     = useState<"all" | "ÉLEVÉ" | "MODÉRÉ" | "FAIBLE">("all");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBatchFile(file);
    setBatchDone(false);
    setBatchRows([]);
    setBatchProgress(0);
    const text = await file.text();
    const parsed = parseCSV(text);
    setRawRows(parsed);
    setBatchRows(parsed.map((row, i) => ({
      index: i + 1,
      payer: row["payer"] || row["caisse"] || "CNOPS",
      service_type: row["service_type"] || row["type_service"] || "consultation",
      patient_name: row["patient_name"] || row["patient"] || `Ligne ${i + 1}`,
      status: "pending",
    })));
  }

  async function runBatch() {
    if (!rawRows.length) return;
    setBatchRunning(true);
    setBatchProgress(0);
    setBatchDone(false);
    const results: BatchRow[] = [...batchRows];
    for (let i = 0; i < rawRows.length; i++) {
      try {
        const payload = buildPayload(rawRows[i]);
        const res = await fetch(`${API_URL}/predict/`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data: PredictionResult = await res.json();
          results[i] = {
            ...results[i],
            risk_score:      data.risk_score,
            risk_label:      data.risk_label,
            risk_percentage: data.risk_percentage,
            top_factor:      data.recommended_actions?.[0] || data.top_factors?.[0]?.feature || "—",
            status:          "done",
          };
        } else {
          results[i] = { ...results[i], status: "error" };
        }
      } catch {
        results[i] = { ...results[i], status: "error" };
      }
      setBatchProgress(i + 1);
      setBatchRows([...results]);
    }
    setBatchRunning(false);
    setBatchDone(true);
  }

  function setFeedback(index: number, feedback: "approved" | "rejected") {
    setBatchRows(prev => prev.map(r => r.index === index ? { ...r, feedback } : r));
  }

  function downloadResults() {
    const header = "Ligne,Patient,Caisse,Type soin,Score risque,Niveau,Top facteur,Feedback";
    const rows = batchRows.filter(r => r.status === "done").map(r =>
      `${r.index},"${r.patient_name}",${r.payer},${r.service_type},${r.risk_score?.toFixed(4)},${r.risk_label},"${r.top_factor}",${r.feedback || ""}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "sihaiq_batch_resultats.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function riskColor(label?: string) {
    if (label === "ÉLEVÉ")  return { bg: "#FEE2E2", color: "#991B1B", bar: "#DC2626" };
    if (label === "MODÉRÉ") return { bg: "#FEF9C3", color: "#854D0E", bar: "#F59E0B" };
    return { bg: "#DCFCE7", color: "#166534", bar: "#16A34A" };
  }

  const userName = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("sihaiq_user") || "{}").name || "Utilisateur"
    : "Utilisateur";

  const doneRows    = batchRows.filter(r => r.status === "done");
  const highRisk    = doneRows.filter(r => r.risk_label === "ÉLEVÉ").length;
  const avgScore    = doneRows.length ? doneRows.reduce((s, r) => s + (r.risk_score || 0), 0) / doneRows.length : 0;
  const filteredBatch = batchFilter === "all" ? batchRows : batchRows.filter(r => r.risk_label === batchFilter);

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
          <Link href="/dashboard"            style={s.sbItem}>📊 Tableau de bord</Link>
          <Link href="/dashboard/dossiers"   style={s.sbItem}>📋 Dossiers BAF</Link>
          <Link href="/dashboard/patients"   style={s.sbItem}>👥 Patients</Link>
          <div style={{ ...s.sbItem, ...s.sbItemActive }}>🧠 Prédiction IA</div>
          <div style={s.sbSec}>Analyse</div>
          <Link href="/dashboard/performance" style={s.sbItem}>📈 Performance</Link>
          <Link href="/dashboard/forclusion"  style={s.sbItem}>⚠️ Forclusion</Link>
          <Link href="/dashboard/encours"     style={s.sbItem}>💰 Encours A/R</Link>
          <div style={s.sbSec}>Système</div>
          <Link href="/dashboard/audit"    style={s.sbItem}>📜 Journal d&apos;audit</Link>
          <Link href="/dashboard/settings" style={s.sbItem}>⚙️ Paramètres</Link>
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
            <div style={s.topDate}>Moteur XGBoost · {userName}</div>
          </div>
          {/* TAB BAR */}
          <div style={s.tabBar}>
            <button
              style={activeTab === "single" ? { ...s.tab, ...s.tabActive } : s.tab}
              onClick={() => setActiveTab("single")}
            >
              🧠 Analyse individuelle
            </button>
            <button
              style={activeTab === "batch" ? { ...s.tab, ...s.tabActive } : s.tab}
              onClick={() => setActiveTab("batch")}
            >
              📊 Analyse par lot (CSV)
            </button>
          </div>
        </div>

        <div style={s.content}>

          {/* ── SINGLE PREDICTION ── */}
          {activeTab === "single" && (
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
                        {["consultation","hospitalisation","chirurgie","radiologie","laboratoire","kinesitherapie"].map(v => (
                          <option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>
                        ))}
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
                        <div style={{ ...s.toggle, background: form[f.key as keyof typeof form] === 1 ? "#0F62FE" : "#E5E7EB" }}>
                          <div style={{ ...s.toggleThumb, transform: form[f.key as keyof typeof form] === 1 ? "translateX(16px)" : "translateX(0)" }} />
                        </div>
                        <span style={s.toggleLabel}>{f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={s.section}>
                  <div style={s.sectionTitle}>Complétude du dossier</div>
                  <div style={s.field}>
                    <label style={s.label}>Ratio de complétude : {Math.round(form.docs_completeness_ratio * 100)}%</label>
                    <input style={s.range} type="range" min={0} max={1} step={0.1}
                      value={form.docs_completeness_ratio}
                      onChange={e => update("docs_completeness_ratio", parseFloat(e.target.value))} />
                  </div>
                </div>

                {error && <div style={s.errorBox}>{error}</div>}

                <button
                  style={loading ? { ...s.predictBtn, opacity: 0.7 } : s.predictBtn}
                  onClick={handlePredict} disabled={loading}
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
                      <div style={{ ...s.scoreCard, background: rc.bg, border: `1px solid ${rc.bar}` }}>
                        <div style={s.scoreLabel}>Score de risque de rejet</div>
                        <div style={{ ...s.scoreVal, color: rc.color }}>{result.risk_percentage}</div>
                        <div style={s.scoreBar}>
                          <div style={{ ...s.scoreBarFill, width: result.risk_percentage, background: rc.bar }} />
                        </div>
                        <div style={{ ...s.scoreBadge, background: rc.bar, color: "#fff" }}>{result.risk_label}</div>
                        <div style={s.scoreModel}>Modèle : {result.model_used}</div>
                      </div>
                      <div style={s.factorsCard}>
                        <div style={s.factorsTitle}>Top 3 facteurs déterminants</div>
                        {result.top_factors.map((f, i) => (
                          <div key={i} style={s.factorRow}>
                            <div style={s.factorLeft}>
                              <span style={s.factorRank}>{i + 1}</span>
                              <span style={s.factorName}>{FEATURE_LABELS[f.feature] || f.feature}</span>
                            </div>
                            <div style={s.factorRight}>
                              <span style={{ ...s.factorDir, color: f.impact > 0 ? "#DC2626" : "#16A34A" }}>{f.direction}</span>
                              <span style={s.factorImpact}>{Math.abs(f.impact).toFixed(3)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
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
          )}

          {/* ── BATCH PREDICTION ── */}
          {activeTab === "batch" && (
            <div>
              {/* Upload + controls */}
              <div style={s.batchHeader}>
                <div style={s.batchUploadCard}>
                  <div style={s.batchUploadTitle}>📂 Importer un fichier CSV</div>
                  <div style={s.batchUploadSub}>
                    Colonnes attendues : <span style={s.batchCode}>payer, service_type, ngap_code, patient_name</span> + critères optionnels.
                    Les colonnes manquantes utilisent les valeurs par défaut.
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
                    <label style={s.uploadLabel}>
                      <input type="file" accept=".csv,.xlsx" style={{ display: "none" }} onChange={handleFileChange} />
                      📁 Choisir un fichier
                    </label>
                    {batchFile && (
                      <span style={s.fileName}>
                        {batchFile.name} · {batchRows.length} ligne{batchRows.length > 1 ? "s" : ""} détectée{batchRows.length > 1 ? "s" : ""}
                      </span>
                    )}
                    {batchRows.length > 0 && !batchRunning && (
                      <button style={s.runBtn} onClick={runBatch}>
                        🚀 Lancer l&apos;analyse XGBoost
                      </button>
                    )}
                    {batchDone && (
                      <button style={s.downloadBtn} onClick={downloadResults}>
                        ⬇ Télécharger les résultats
                      </button>
                    )}
                  </div>

                  {/* Progress bar */}
                  {batchRunning && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, color: "#185FA5", marginBottom: 6 }}>
                        Analyse en cours... {batchProgress} / {batchRows.length}
                      </div>
                      <div style={s.progressTrack}>
                        <div style={{ ...s.progressFill, width: `${(batchProgress / batchRows.length) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* KPI summary */}
                {batchDone && (
                  <div style={s.batchKpis}>
                    {[
                      { lbl: "Analysés",    val: String(doneRows.length),       color: "#0F62FE" },
                      { lbl: "Risque élevé",val: String(highRisk),              color: "#DC2626" },
                      { lbl: "Score moyen", val: `${Math.round(avgScore * 100)}%`, color: "#F59E0B" },
                      { lbl: "Feedbacks",   val: String(batchRows.filter(r => r.feedback).length), color: "#16A34A" },
                    ].map(k => (
                      <div key={k.lbl} style={s.batchKpi}>
                        <div style={{ fontSize: 10, color: "#9EA3AE", marginBottom: 4 }}>{k.lbl}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: k.color, letterSpacing: "-0.02em" }}>{k.val}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter chips */}
              {batchDone && (
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  {(["all","ÉLEVÉ","MODÉRÉ","FAIBLE"] as const).map(f => (
                    <button key={f}
                      style={batchFilter === f ? { ...s.chip, ...s.chipActive } : s.chip}
                      onClick={() => setBatchFilter(f)}
                    >
                      {f === "all" ? "Tous" : f}
                    </button>
                  ))}
                </div>
              )}

              {/* Results table */}
              {batchRows.length > 0 && (
                <div style={s.batchTable}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {["#","Patient","Caisse","Type soin","Score IA","Niveau","Recommandation","Feedback"].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBatch.map(row => {
                        const rc = riskColor(row.risk_label);
                        return (
                          <tr key={row.index} style={s.tr}>
                            <td style={s.td}><span style={s.rowNum}>{row.index}</span></td>
                            <td style={s.td}><span style={s.patName}>{row.patient_name}</span></td>
                            <td style={s.td}>
                              <span style={{ ...s.payerBadge, background: row.payer === "CNOPS" ? "#E6F1FB" : row.payer === "CNSS" ? "#F0FDF4" : "#FFF7ED", color: row.payer === "CNOPS" ? "#1E40AF" : row.payer === "CNSS" ? "#166534" : "#9A3412" }}>
                                {row.payer}
                              </span>
                            </td>
                            <td style={s.td}><span style={s.serviceType}>{row.service_type}</span></td>
                            <td style={s.td}>
                              {row.status === "pending" && <span style={s.pendingDot}>En attente</span>}
                              {row.status === "error"   && <span style={{ fontSize: 11, color: "#DC2626" }}>Erreur</span>}
                              {row.status === "done"    && (
                                <div>
                                  <div style={{ ...s.scoreSmall, color: rc.color }}>{row.risk_percentage}</div>
                                  <div style={s.scoreBarSmall}>
                                    <div style={{ ...s.scoreBarSmallFill, width: row.risk_percentage || "0%", background: rc.bar }} />
                                  </div>
                                </div>
                              )}
                            </td>
                            <td style={s.td}>
                              {row.risk_label && (
                                <span style={{ ...s.riskBadge, background: rc.bg, color: rc.color }}>{row.risk_label}</span>
                              )}
                            </td>
                            <td style={{ ...s.td, maxWidth: 220 }}>
                              <span style={s.topFactor}>{row.top_factor || "—"}</span>
                            </td>
                            <td style={s.td}>
                              {row.status === "done" && (
                                <div style={{ display: "flex", gap: 5 }}>
                                  <button
                                    style={{ ...s.fbBtn, background: row.feedback === "approved" ? "#DCFCE7" : "#F3F4F6", color: row.feedback === "approved" ? "#166534" : "#6B7280", border: row.feedback === "approved" ? "0.5px solid #86EFAC" : "0.5px solid #E2E4E9" }}
                                    onClick={() => setFeedback(row.index, "approved")}
                                  >✓</button>
                                  <button
                                    style={{ ...s.fbBtn, background: row.feedback === "rejected" ? "#FEE2E2" : "#F3F4F6", color: row.feedback === "rejected" ? "#991B1B" : "#6B7280", border: row.feedback === "rejected" ? "0.5px solid #FCA5A5" : "0.5px solid #E2E4E9" }}
                                    onClick={() => setFeedback(row.index, "rejected")}
                                  >✗</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {batchRows.length === 0 && (
                <div style={s.batchEmpty}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
                  <div style={{ fontSize: 14, color: "#9EA3AE", marginBottom: 6 }}>Aucun fichier chargé</div>
                  <div style={{ fontSize: 12, color: "#C4C4C4" }}>
                    Importez un CSV avec les colonnes : payer, service_type, ngap_code, patient_name
                  </div>
                </div>
              )}
            </div>
          )}

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
  topbar:  { background: "#fff", borderBottom: "0.5px solid #E2E4E9", padding: "0 20px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 16 },
  topTitle:{ fontSize: 14, fontWeight: 600, color: "#1A1D23" },
  topDate: { fontSize: 11, color: "#9EA3AE", marginTop: 2 },

  tabBar:    { display: "flex", gap: 4 },
  tab:       { fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 8, cursor: "pointer", border: "0.5px solid #E2E4E9", background: "#fff", color: "#6B7280", fontFamily: "inherit" },
  tabActive: { background: "#E6F1FB", color: "#0F62FE", borderColor: "#B5D4F4", fontWeight: 600 },

  content: { flex: 1, overflowY: "auto", padding: "16px 20px" },
  layout:  { display: "grid", gridTemplateColumns: "1fr 380px", gap: 14 },

  formPanel:   { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, padding: 20, overflowY: "auto" },
  resultPanel: { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, padding: 20, overflowY: "auto" },
  panelTitle:  { fontSize: 13, fontWeight: 600, color: "#1A1D23", marginBottom: 4 },
  panelSub:    { fontSize: 12, color: "#9EA3AE", marginBottom: 16, lineHeight: 1.5 },

  section:      { marginBottom: 18, paddingBottom: 18, borderBottom: "0.5px solid #EEF2F8" },
  sectionTitle: { fontSize: 10, fontWeight: 600, color: "#9EA3AE", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 },
  fieldGrid:    { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 },
  field:        { display: "flex", flexDirection: "column", gap: 5 },
  label:        { fontSize: 10, fontWeight: 500, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" },
  input:        { padding: "7px 10px", border: "0.5px solid #D1D5DB", borderRadius: 7, fontSize: 12, color: "#1A1D23", outline: "none", fontFamily: "inherit", background: "#FAFAFA" },
  range:        { width: "100%", marginTop: 4 },
  toggleGrid:   { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 },
  toggleItem:   { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 0" },
  toggle:       { width: 32, height: 18, borderRadius: 9, position: "relative", flexShrink: 0, transition: "background 0.2s" },
  toggleThumb:  { position: "absolute", top: 2, left: 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "transform 0.2s" },
  toggleLabel:  { fontSize: 11, color: "#4B5060" },
  predictBtn:   { width: "100%", padding: "11px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: "#0F62FE", color: "#fff", fontFamily: "inherit", marginTop: 4 },
  errorBox:     { background: "#FEE2E2", border: "0.5px solid #FCA5A5", borderRadius: 7, padding: "8px 12px", fontSize: 12, color: "#991B1B", marginBottom: 10 },

  emptyResult:  { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 12 },
  emptyIcon:    { fontSize: 40 },
  emptyText:    { fontSize: 13, color: "#9EA3AE", textAlign: "center", lineHeight: 1.6, maxWidth: 280 },
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

  // Batch styles
  batchHeader:     { display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" },
  batchUploadCard: { flex: 1, background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, padding: 18 },
  batchUploadTitle:{ fontSize: 13, fontWeight: 600, color: "#1A1D23", marginBottom: 6 },
  batchUploadSub:  { fontSize: 12, color: "#9EA3AE", lineHeight: 1.5 },
  batchCode:       { fontFamily: "monospace", fontSize: 11, color: "#185FA5", background: "#E6F1FB", padding: "1px 5px", borderRadius: 4 },
  uploadLabel:     { fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8, cursor: "pointer", border: "0.5px solid #B5D4F4", background: "#E6F1FB", color: "#185FA5", fontFamily: "inherit" },
  fileName:        { fontSize: 12, color: "#6B7280", background: "#F3F4F6", padding: "6px 10px", borderRadius: 6 },
  runBtn:          { fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 8, cursor: "pointer", border: "none", background: "#0F62FE", color: "#fff", fontFamily: "inherit" },
  downloadBtn:     { fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 8, cursor: "pointer", border: "0.5px solid #86EFAC", background: "#DCFCE7", color: "#166534", fontFamily: "inherit" },
  progressTrack:   { height: 6, background: "#E6F1FB", borderRadius: 3, overflow: "hidden" },
  progressFill:    { height: "100%", background: "#0F62FE", borderRadius: 3, transition: "width 0.2s" },
  batchKpis:       { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, width: 220 },
  batchKpi:        { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 8, padding: "10px 12px" },
  chip:            { fontSize: 10, fontWeight: 500, padding: "4px 10px", borderRadius: 20, cursor: "pointer", border: "0.5px solid #E2E4E9", background: "#fff", color: "#6B7280", fontFamily: "inherit" },
  chipActive:      { background: "#E6F1FB", color: "#0F62FE", borderColor: "#B5D4F4" },

  batchTable:      { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 10, overflow: "auto" },
  table:           { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th:              { textAlign: "left", padding: "8px 12px", fontSize: 9, fontWeight: 600, color: "#9EA3AE", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "0.5px solid #EEF2F8", background: "#FAFBFF", whiteSpace: "nowrap" },
  tr:              { borderBottom: "0.5px solid #F5F7FA" },
  td:              { padding: "10px 12px", verticalAlign: "middle" },
  rowNum:          { fontFamily: "monospace", fontSize: 10, color: "#9EA3AE" },
  patName:         { fontSize: 12, fontWeight: 500, color: "#1A1D23" },
  payerBadge:      { display: "inline-flex", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20 },
  serviceType:     { fontSize: 11, color: "#6B7280" },
  pendingDot:      { fontSize: 10, color: "#9EA3AE" },
  scoreSmall:      { fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" },
  scoreBarSmall:   { height: 3, background: "#EEF2F8", borderRadius: 2, overflow: "hidden", marginTop: 3, width: 60 },
  scoreBarSmallFill:{ height: "100%", borderRadius: 2 },
  riskBadge:       { display: "inline-flex", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20 },
  topFactor:       { fontSize: 11, color: "#9A3412", lineHeight: 1.4 },
  fbBtn:           { fontSize: 11, fontWeight: 700, width: 26, height: 26, borderRadius: 6, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" },
  batchEmpty:      { textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 10, border: "0.5px solid #E2E4E9" },
};