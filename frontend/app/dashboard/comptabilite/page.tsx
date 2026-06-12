"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface KPIs {
  ca_total: number;
  total_charges: number;
  ebe: number;
  ebe_pct: number;
  amortissements: number;
  ebit: number;
  tresorerie_nette: number;
  bfr: number;
  ratio_liquidite: number;
  dso: number;
  taux_occupation: number;
  ratio_encaissement: number;
  recette_moy_patient: number;
  cout_journee: number;
  nb_admissions: number;
  total_journees: number;
  budget_recettes: number;
  ecart_recettes: number;
  budget_charges: number;
  ecart_charges: number;
  charges_personnel: number;
  charges_medicaments: number;
  charges_honoraires: number;
  charges_generaux: number;
}

interface ChargeDetail {
  categorie: string;
  label: string;
  montant: number;
  pct: number;
}

interface MonthlyTrend {
  periode: string;
  ca: number;
  charges: number;
  ebe: number;
}

interface LitDetail {
  service: string;
  nb_total: number;
  nb_occupes: number;
  journees: number;
  taux: number;
}

interface ComptaData {
  periode: string;
  kpis: KPIs;
  charges_detail: ChargeDetail[];
  monthly_trend: MonthlyTrend[];
  lits_detail: LitDetail[];
}

function formatMAD(n: number) {
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + "M MAD";
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(0) + "K MAD";
  return n.toLocaleString("fr-MA") + " MAD";
}

function formatPct(n: number) { return (n > 0 ? "+" : "") + n.toFixed(1) + "%"; }

const CHARGE_COLORS: Record<string, string> = {
  personnel:      "#5B4FE8",
  medicaments:    "#F2711C",
  honoraires:     "#5B4FE8",
  frais_generaux: "#16A34A",
  amortissements: "#9CA3AF",
};

const PERIODS = [
  { key: "2026-06", lbl: "Juin 2026" },
  { key: "2026-05", lbl: "Mai 2026" },
  { key: "2026-04", lbl: "Avr 2026" },
];

export default function ComptabilitePage() {
  const [data, setData]       = useState<ComptaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState("2026-06");
  const [error, setError]     = useState("");
  const [activeSection, setActiveSection] = useState<"rentabilite"|"tresorerie"|"activite"|"budget">("rentabilite");
  const [showModal, setShowModal]   = useState(false);
  const [modalTab, setModalTab]     = useState<"charges"|"tresorerie"|"admissions">("charges");
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState("");
  const [formCharges, setFormCharges] = useState({
    personnel: "", medicaments: "", honoraires: "", frais_generaux: "", amortissements: "",
  });
  const [formTreo, setFormTreo] = useState({
    tresorerie_actif: "", tresorerie_passif: "", actif_circulant: "", passif_circulant: "",
  });
  const [formAdm, setFormAdm] = useState({
    nb_admissions: "", nb_journees: "", ca_total: "",
  });

  async function loadData(p: string) {
    setLoading(true);
    try {
      const token    = localStorage.getItem("sihaiq_token");
      const tenantId = localStorage.getItem("sihaiq_tenant_id");
      const res = await fetch(`${API_URL}/comptabilite/summary?tenant_id=${tenantId}&periode=${p}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur chargement données comptables");
      setData(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    const token = localStorage.getItem("sihaiq_token");
    const user  = JSON.parse(localStorage.getItem("sihaiq_user") || "{}");
    if (!token) { window.location.href = "/auth/login"; return; }
    Promise.resolve().then(() => {
      if (!["admin", "director"].includes(user.role || "")) {
        setError("Accès refusé. Cette page est réservée aux responsables BAF et à la Direction Financière.");
        setLoading(false);
        return;
      }
      loadData("2026-06");
    });
  }, []);

  const k = data?.kpis;
  const maxTrend = data ? Math.max(...data.monthly_trend.map(m => m.ca), 1) : 1;
  async function saveCharges() {
    setSaving(true); setSaveMsg("");
    try {
      const token    = localStorage.getItem("sihaiq_token");
      const tenantId = localStorage.getItem("sihaiq_tenant_id");
      const entries = [
        { categorie: "personnel",      montant: parseFloat(formCharges.personnel || "0"),      sous_categorie: "Masse salariale" },
        { categorie: "medicaments",    montant: parseFloat(formCharges.medicaments || "0"),    sous_categorie: "Pharmacie & DMI" },
        { categorie: "honoraires",     montant: parseFloat(formCharges.honoraires || "0"),     sous_categorie: "Médecins libéraux" },
        { categorie: "frais_generaux", montant: parseFloat(formCharges.frais_generaux || "0"), sous_categorie: "Énergie & maintenance" },
        { categorie: "amortissements", montant: parseFloat(formCharges.amortissements || "0"), sous_categorie: "Équipements médicaux" },
      ].filter(e => e.montant > 0);
      for (const entry of entries) {
        await fetch(`${API_URL}/comptabilite/charges`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tenant_id: tenantId, periode, ...entry }),
        });
      }
      setSaveMsg("✅ Charges enregistrées avec succès.");
      setTimeout(() => { setShowModal(false); setSaveMsg(""); loadData(periode); }, 1500);
    } catch { setSaveMsg("❌ Erreur lors de l'enregistrement."); }
    finally { setSaving(false); }
  }

  async function saveTresorerie() {
    setSaving(true); setSaveMsg("");
    try {
      const token    = localStorage.getItem("sihaiq_token");
      const tenantId = localStorage.getItem("sihaiq_tenant_id");
      await fetch(`${API_URL}/comptabilite/tresorerie`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tenant_id: tenantId, periode,
          tresorerie_actif:  parseFloat(formTreo.tresorerie_actif  || "0"),
          tresorerie_passif: parseFloat(formTreo.tresorerie_passif || "0"),
          actif_circulant:   parseFloat(formTreo.actif_circulant   || "0"),
          passif_circulant:  parseFloat(formTreo.passif_circulant  || "0"),
        }),
      });
      setSaveMsg("✅ Trésorerie enregistrée avec succès.");
      setTimeout(() => { setShowModal(false); setSaveMsg(""); loadData(periode); }, 1500);
    } catch { setSaveMsg("❌ Erreur lors de l'enregistrement."); }
    finally { setSaving(false); }
  }

  async function saveAdmissions() {
    setSaving(true); setSaveMsg("");
    try {
      const token    = localStorage.getItem("sihaiq_token");
      const tenantId = localStorage.getItem("sihaiq_tenant_id");
      await fetch(`${API_URL}/comptabilite/admissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tenant_id: tenantId, periode,
          nb_admissions: parseInt(formAdm.nb_admissions || "0"),
          nb_journees:   parseInt(formAdm.nb_journees   || "0"),
          ca_total:      parseFloat(formAdm.ca_total    || "0"),
        }),
      });
      setSaveMsg("✅ Données d'activité enregistrées.");
      setTimeout(() => { setShowModal(false); setSaveMsg(""); loadData(periode); }, 1500);
    } catch { setSaveMsg("❌ Erreur lors de l'enregistrement."); }
    finally { setSaving(false); }
  }
  if (error) return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#F2F1EE" }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 32, maxWidth: 400, textAlign: "center", border: "0.5px solid #E5E3DD" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1814", marginBottom: 8 }}>Accès restreint</div>
        <div style={{ fontSize: 13, color: "#5C5852", lineHeight: 1.6, marginBottom: 20 }}>{error}</div>
        <a href="/dashboard" style={{ fontSize: 13, color: "#5B4FE8", textDecoration: "none" }}>← Retour au tableau de bord</a>
      </div>
    </div>
  );

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
          <Link href="/dashboard"             style={s.sbItem}>📊 Tableau de bord</Link>
          <Link href="/dashboard/dossiers"    style={s.sbItem}>📋 Dossiers BAF</Link>
          <Link href="/dashboard/patients"    style={s.sbItem}>👥 Patients</Link>
          <Link href="/dashboard/prediction"  style={s.sbItem}>🧠 Prédiction IA</Link>
          <div style={s.sbSec}>Analyse</div>
          <Link href="/dashboard/performance" style={s.sbItem}>📈 Performance</Link>
          <Link href="/dashboard/forclusion"  style={s.sbItem}>⚠️ Forclusion</Link>
          <Link href="/dashboard/encours"     style={s.sbItem}>💰 Encours A/R</Link>
          <Link href="/dashboard/financier"   style={s.sbItem}>🏦 Activité financière</Link>
          <div style={{ ...s.sbItem, ...s.sbItemActive }}>📒 Comptabilité DAF</div>
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
            <div style={s.topTitle}>Tableau de bord DAF</div>
            <div style={s.topSub}>Comptabilité hospitalière · CGNC · Plan Comptable Marocain · Accès restreint</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={s.periodBar}>
              {PERIODS.map(p => (
                <button
                  key={p.key}
                  style={periode === p.key ? { ...s.periodBtn, ...s.periodBtnActive } : s.periodBtn}
                  onClick={() => { setPeriode(p.key); loadData(p.key); }}
                >{p.lbl}</button>
              ))}
            </div>
            <button style={s.saisirBtn} onClick={() => { setShowModal(true); setSaveMsg(""); }}>
              + Saisir les données
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 13, color: "#9C9890" }}>Chargement des données comptables...</div>
          </div>
        ) : (
          <div style={s.content}>

            {/* SECTION TABS */}
            <div style={s.sectionTabs}>
              {[
                { key: "rentabilite", lbl: "📈 Rentabilité & CPC" },
                { key: "tresorerie",  lbl: "💧 Trésorerie & BFR" },
                { key: "activite",    lbl: "🏥 Activité & Lits" },
                { key: "budget",      lbl: "🎯 Budget vs Réalisé" },
              ].map(tab => (
                <button
                  key={tab.key}
                  style={activeSection === tab.key ? { ...s.sectionTab, ...s.sectionTabActive } : s.sectionTab}
                  onClick={() => setActiveSection(tab.key as typeof activeSection)}
                >{tab.lbl}</button>
              ))}
            </div>

            {/* ── RENTABILITÉ ── */}
            {activeSection === "rentabilite" && (
              <>
                <div style={s.kpiGrid}>
                  {[
                    { lbl: "Chiffre d'affaires", val: formatMAD(k?.ca_total || 0),     sub: `${k?.nb_admissions || 0} admissions`,      color: "#5B4FE8", accent: "#EEEDFB" },
                    { lbl: "Total charges",       val: formatMAD(k?.total_charges || 0), sub: `${((k?.total_charges||0)/(k?.ca_total||1)*100).toFixed(1)}% du CA`, color: "#DC2626", accent: "#FEE2E2" },
                    { lbl: "EBE",                 val: formatMAD(k?.ebe || 0),           sub: `Marge EBE ${k?.ebe_pct || 0}% · Cible 20–25%`, color: k?.ebe_pct && k.ebe_pct >= 20 ? "#16A34A" : "#F59E0B", accent: k?.ebe_pct && k.ebe_pct >= 20 ? "#DCFCE7" : "#FEF9C3" },
                    { lbl: "EBIT",                val: formatMAD(k?.ebit || 0),          sub: `Après amortissements ${formatMAD(k?.amortissements || 0)}`, color: "#5B4FE8", accent: "#EEEDFB" },
                  ].map(kpi => (
                    <div key={kpi.lbl} style={{ ...s.kpi, background: kpi.accent }}>
                      <div style={{ ...s.kpiBar, background: kpi.color }} />
                      <div style={s.kpiLbl}>{kpi.lbl}</div>
                      <div style={{ ...s.kpiVal, color: kpi.color }}>{kpi.val}</div>
                      <div style={s.kpiSub}>{kpi.sub}</div>
                    </div>
                  ))}
                </div>

                <div style={s.twoCol}>
                  {/* Charges breakdown */}
                  <div style={s.card}>
                    <div style={s.cardTitle}>Structure des charges (Classe 6 CGNC)</div>
                    <div style={{ marginTop: 16 }}>
                      {data?.charges_detail.map(c => (
                        <div key={c.categorie} style={{ marginBottom: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                            <span style={{ fontSize: 12, color: "#1A1814", fontWeight: 500 }}>{c.label}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: CHARGE_COLORS[c.categorie] || "#5C5852" }}>
                              {formatMAD(c.montant)} <span style={{ fontSize: 10, color: "#9C9890" }}>({c.pct}%)</span>
                            </span>
                          </div>
                          <div style={{ height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${c.pct}%`, height: "100%", background: CHARGE_COLORS[c.categorie] || "#5C5852", borderRadius: 3, transition: "width 0.5s" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 16, padding: "10px 12px", background: "#F8F7FE", borderRadius: 8, fontSize: 11, color: "#4A3FD4" }}>
                      📌 Ratio masse salariale : {k ? ((k.charges_personnel / k.ca_total) * 100).toFixed(1) : 0}% du CA · Benchmark sectoriel : 45–55%
                    </div>
                  </div>

                  {/* Monthly trend */}
                  <div style={s.card}>
                    <div style={s.cardTitle}>Tendance CA vs Charges (3 derniers mois)</div>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-end", height: 140, marginTop: 16 }}>
                      {data?.monthly_trend.map((m, i) => (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ width: "100%", height: 110, position: "relative", display: "flex", alignItems: "flex-end", gap: 3 }}>
                            <div style={{ flex: 1, background: "#EEEDFB", borderRadius: "4px 4px 0 0", height: `${(m.ca / maxTrend) * 100}%` }} />
                            <div style={{ flex: 1, background: "#FEE2E2", borderRadius: "4px 4px 0 0", height: `${(m.charges / maxTrend) * 100}%` }} />
                            <div style={{ flex: 1, background: m.ebe >= 0 ? "#DCFCE7" : "#FEF9C3", borderRadius: "4px 4px 0 0", height: `${(Math.abs(m.ebe) / maxTrend) * 100}%` }} />
                          </div>
                          <div style={{ fontSize: 9, color: "#9C9890" }}>{m.periode.split("-")[1] === "04" ? "Avr" : m.periode.split("-")[1] === "05" ? "Mai" : "Jun"}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                      <span style={{ fontSize: 10, color: "#5B4FE8" }}>■ CA</span>
                      <span style={{ fontSize: 10, color: "#DC2626" }}>■ Charges</span>
                      <span style={{ fontSize: 10, color: "#16A34A" }}>■ EBE</span>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      {data?.monthly_trend.map((m, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "0.5px solid #F5F4F1", fontSize: 12 }}>
                          <span style={{ color: "#5C5852" }}>{m.periode.split("-")[1] === "04" ? "Avril" : m.periode.split("-")[1] === "05" ? "Mai" : "Juin"} 2026</span>
                          <span style={{ color: "#5B4FE8" }}>{formatMAD(m.ca)}</span>
                          <span style={{ color: "#DC2626" }}>{formatMAD(m.charges)}</span>
                          <span style={{ color: m.ebe >= 0 ? "#16A34A" : "#DC2626", fontWeight: 600 }}>{formatMAD(m.ebe)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── TRÉSORERIE ── */}
            {activeSection === "tresorerie" && (
              <>
                <div style={s.kpiGrid}>
                  {[
                    { lbl: "Trésorerie nette",   val: formatMAD(k?.tresorerie_nette || 0), sub: "Actif − Passif trésorerie · Doit rester > 0", color: k?.tresorerie_nette && k.tresorerie_nette > 0 ? "#16A34A" : "#DC2626", accent: k?.tresorerie_nette && k.tresorerie_nette > 0 ? "#DCFCE7" : "#FEE2E2" },
                    { lbl: "BFR",                 val: formatMAD(k?.bfr || 0),             sub: "Besoin en Fonds de Roulement",                  color: "#F59E0B", accent: "#FEF9C3" },
                    { lbl: "Ratio de liquidité",  val: String(k?.ratio_liquidite || 0),    sub: `Actif circ. / Passif circ. · Cible > 1.2`,     color: k?.ratio_liquidite && k.ratio_liquidite >= 1.2 ? "#16A34A" : "#DC2626", accent: k?.ratio_liquidite && k.ratio_liquidite >= 1.2 ? "#DCFCE7" : "#FEE2E2" },
                    { lbl: "DSO",                 val: `${k?.dso || 0} jours`,             sub: "Délai Moyen de Recouvrement · Cible 50–60j",   color: k?.dso && k.dso <= 60 ? "#16A34A" : k?.dso && k.dso <= 90 ? "#F59E0B" : "#DC2626", accent: "#F3F4F6" },
                  ].map(kpi => (
                    <div key={kpi.lbl} style={{ ...s.kpi, background: kpi.accent }}>
                      <div style={{ ...s.kpiBar, background: kpi.color }} />
                      <div style={s.kpiLbl}>{kpi.lbl}</div>
                      <div style={{ ...s.kpiVal, color: kpi.color }}>{kpi.val}</div>
                      <div style={s.kpiSub}>{kpi.sub}</div>
                    </div>
                  ))}
                </div>

                <div style={s.twoCol}>
                  <div style={s.card}>
                    <div style={s.cardTitle}>Bilan trésorerie — {periode}</div>
                    <div style={{ marginTop: 16 }}>
                      {[
                        { lbl: "Trésorerie Actif (Compte 5)", val: k?.tresorerie_nette && k.tresorerie_nette > 0 ? k.tresorerie_nette + (k?.bfr || 0) - (k?.bfr || 0) : 0, color: "#16A34A", sub: "Soldes bancaires + caisse" },
                        { lbl: "Trésorerie Passif (Découverts)", val: Math.max(0, (k?.bfr || 0) - (k?.tresorerie_nette || 0)), color: "#DC2626", sub: "Facilités de caisse + découverts" },
                        { lbl: "Actif Circulant (Compte 342)", val: k?.bfr ? k.bfr + (k?.tresorerie_nette || 0) : 0, color: "#5B4FE8", sub: "Créances clients + stocks" },
                        { lbl: "Passif Circulant (Compte 441)", val: k?.tresorerie_nette ? Math.abs(k.bfr || 0) : 0, color: "#F59E0B", sub: "Dettes fournisseurs + fiscales" },
                      ].map(row => (
                        <div key={row.lbl} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "0.5px solid #F5F4F1" }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: "#1A1814" }}>{row.lbl}</div>
                            <div style={{ fontSize: 10, color: "#9C9890" }}>{row.sub}</div>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{formatMAD(row.val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={s.card}>
                    <div style={s.cardTitle}>Indicateurs de recouvrement</div>
                    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                      <div style={{ background: k?.dso && k.dso <= 60 ? "#DCFCE7" : "#FEF9C3", borderRadius: 10, padding: "14px 16px" }}>
                        <div style={{ fontSize: 10, color: "#5C5852", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>DSO — Délai de recouvrement</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: k?.dso && k.dso <= 60 ? "#16A34A" : "#F59E0B" }}>{k?.dso || 0} <span style={{ fontSize: 14, fontWeight: 400 }}>jours</span></div>
                        <div style={{ fontSize: 11, color: "#5C5852", marginTop: 4 }}>Historique secteur : {">"}120j · Cible digitale : 50–60j</div>
                        <div style={{ marginTop: 8, height: 6, background: "rgba(0,0,0,0.1)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, (k?.dso || 0) / 120 * 100)}%`, height: "100%", background: k?.dso && k.dso <= 60 ? "#16A34A" : "#F59E0B", borderRadius: 3 }} />
                        </div>
                      </div>
                      <div style={{ background: "#EEEDFB", borderRadius: 10, padding: "14px 16px" }}>
                        <div style={{ fontSize: 10, color: "#5C5852", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>Ratio Encaissements / Facturations</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: "#5B4FE8" }}>{k?.ratio_encaissement || 0}<span style={{ fontSize: 14, fontWeight: 400 }}>%</span></div>
                        <div style={{ fontSize: 11, color: "#5C5852", marginTop: 4 }}>Cible : {">"}95% · Signal grippage {"<"}85%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── ACTIVITÉ & LITS ── */}
            {activeSection === "activite" && (
              <>
                <div style={s.kpiGrid}>
                  {[
                    { lbl: "Taux d'occupation", val: `${k?.taux_occupation || 0}%`, sub: `${k?.total_journees || 0} journées · Cible 65–75%`, color: k?.taux_occupation && k.taux_occupation >= 65 && k.taux_occupation <= 75 ? "#16A34A" : "#F59E0B", accent: "#DCFCE7" },
                    { lbl: "Admissions",         val: String(k?.nb_admissions || 0), sub: `${k?.total_journees || 0} journées d'hospitalisation`, color: "#5B4FE8", accent: "#EEEDFB" },
                    { lbl: "Recette moy/patient",val: formatMAD(k?.recette_moy_patient || 0), sub: "CA total / nb admissions", color: "#F2711C", accent: "#FEF2EA" },
                    { lbl: "Coût moy/journée",   val: formatMAD(k?.cout_journee || 0), sub: "Charges / nb journées facturées", color: "#5B4FE8", accent: "#EEEDFB" },
                  ].map(kpi => (
                    <div key={kpi.lbl} style={{ ...s.kpi, background: kpi.accent }}>
                      <div style={{ ...s.kpiBar, background: kpi.color }} />
                      <div style={s.kpiLbl}>{kpi.lbl}</div>
                      <div style={{ ...s.kpiVal, color: kpi.color }}>{kpi.val}</div>
                      <div style={s.kpiSub}>{kpi.sub}</div>
                    </div>
                  ))}
                </div>

                <div style={s.card}>
                  <div style={s.cardTitle}>Occupation des lits par service</div>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {["Service","Capacité","Occupés","Journées","Taux occupation","Statut"].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data?.lits_detail.map((l, i) => (
                        <tr key={i} style={s.tr}>
                          <td style={s.td}><span style={{ fontWeight: 500, color: "#1A1814" }}>{l.service}</span></td>
                          <td style={s.td}>{l.nb_total} lits</td>
                          <td style={s.td}>{l.nb_occupes} lits</td>
                          <td style={s.td}>{l.journees}j</td>
                          <td style={s.td}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 80, height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ width: `${l.taux}%`, height: "100%", background: l.taux >= 65 && l.taux <= 75 ? "#16A34A" : l.taux > 75 ? "#F59E0B" : "#DC2626", borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600, color: l.taux >= 65 ? "#16A34A" : "#DC2626" }}>{l.taux}%</span>
                            </div>
                          </td>
                          <td style={s.td}>
                            <span style={{ fontSize: 10, color: l.taux >= 65 && l.taux <= 75 ? "#16A34A" : l.taux < 65 ? "#DC2626" : "#F59E0B" }}>
                              {l.taux >= 65 && l.taux <= 75 ? "✓ Optimal" : l.taux < 65 ? "⚠ Sous-occupation" : "⚡ Sur-occupation"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 14, padding: "10px 12px", background: "#F8F7FE", borderRadius: 8, fontSize: 11, color: "#4A3FD4" }}>
                    📌 Taux global : {k?.taux_occupation || 0}% · Cible optimale rentabilité : 65–75% (couverture charges fixes)
                  </div>
                </div>
              </>
            )}

            {/* ── BUDGET VS RÉALISÉ ── */}
            {activeSection === "budget" && (
              <>
                <div style={s.kpiGrid}>
                  {[
                    { lbl: "CA réalisé",      val: formatMAD(k?.ca_total || 0),      sub: `Budget prévu : ${formatMAD(k?.budget_recettes || 0)}`,     color: "#5B4FE8", accent: "#EEEDFB" },
                    { lbl: "Écart recettes",  val: formatPct(k?.ecart_recettes || 0), sub: `${k?.ecart_recettes && k.ecart_recettes >= 0 ? "Dépassement positif" : "Sous-réalisation"}`, color: k?.ecart_recettes && k.ecart_recettes >= 0 ? "#16A34A" : "#DC2626", accent: k?.ecart_recettes && k.ecart_recettes >= 0 ? "#DCFCE7" : "#FEE2E2" },
                    { lbl: "Charges réelles", val: formatMAD(k?.total_charges || 0), sub: `Budget prévu : ${formatMAD(k?.budget_charges || 0)}`,       color: "#DC2626", accent: "#FEE2E2" },
                    { lbl: "Écart charges",   val: formatPct(k?.ecart_charges || 0), sub: `${k?.ecart_charges && k.ecart_charges > 0 ? "Dépassement budgétaire" : "Économies réalisées"}`, color: k?.ecart_charges && k.ecart_charges > 0 ? "#DC2626" : "#16A34A", accent: k?.ecart_charges && k.ecart_charges > 0 ? "#FEE2E2" : "#DCFCE7" },
                  ].map(kpi => (
                    <div key={kpi.lbl} style={{ ...s.kpi, background: kpi.accent }}>
                      <div style={{ ...s.kpiBar, background: kpi.color }} />
                      <div style={s.kpiLbl}>{kpi.lbl}</div>
                      <div style={{ ...s.kpiVal, color: kpi.color }}>{kpi.val}</div>
                      <div style={s.kpiSub}>{kpi.sub}</div>
                    </div>
                  ))}
                </div>

                <div style={s.card}>
                  <div style={s.cardTitle}>Budget vs Réalisé — {periode}</div>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {["Poste","Budget prévu","Réalisé","Écart MAD","Écart %","Statut"].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { poste: "Chiffre d'affaires", prevu: k?.budget_recettes || 0, realise: k?.ca_total || 0 },
                        { poste: "Charges personnel", prevu: k?.budget_charges ? k.budget_charges * 0.6 : 0, realise: k?.charges_personnel || 0 },
                        { poste: "Médicaments & DMI", prevu: k?.budget_charges ? k.budget_charges * 0.28 : 0, realise: k?.charges_medicaments || 0 },
                        { poste: "Frais généraux",    prevu: k?.budget_charges ? k.budget_charges * 0.12 : 0, realise: k?.charges_generaux || 0 },
                      ].map((row, i) => {
                        const ecart    = row.realise - row.prevu;
                        const ecartPct = row.prevu > 0 ? (ecart / row.prevu * 100) : 0;
                        const isRevenue = i === 0;
                        const isGood    = isRevenue ? ecart >= 0 : ecart <= 0;
                        return (
                          <tr key={i} style={s.tr}>
                            <td style={s.td}><span style={{ fontWeight: 500 }}>{row.poste}</span></td>
                            <td style={s.td}>{formatMAD(row.prevu)}</td>
                            <td style={s.td}>{formatMAD(row.realise)}</td>
                            <td style={{ ...s.td, color: isGood ? "#16A34A" : "#DC2626", fontWeight: 600 }}>{formatMAD(ecart)}</td>
                            <td style={{ ...s.td, color: isGood ? "#16A34A" : "#DC2626", fontWeight: 600 }}>{formatPct(ecartPct)}</td>
                            <td style={s.td}>
                              <span style={{ fontSize: 10, color: isGood ? "#16A34A" : "#DC2626" }}>
                                {isGood ? "✓ Dans les objectifs" : "⚠ Hors objectifs"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 14, padding: "10px 12px", background: "#FFF8F0", border: "0.5px solid #FED7AA", borderRadius: 8, fontSize: 11, color: "#9A3412" }}>
                    📌 Référentiel CGNC · Les écarts {">"} 10% déclenchent un rapport d&apos;alerte à la direction
                  </div>
                </div>
              </>
            )}

          </div>
        )}
      </div>
    {/* DATA ENTRY MODAL */}
      {showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHdr}>
              <div>
                <div style={s.modalTitle}>Saisir les données — {periode}</div>
                <div style={s.modalSub}>Renseignez les données comptables du mois sélectionné</div>
              </div>
              <button style={s.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>
            {/* Tabs */}
            <div style={s.modalTabs}>
              {([
                { key: "charges",     lbl: "📊 Charges" },
                { key: "tresorerie",  lbl: "💧 Trésorerie" },
                { key: "admissions",  lbl: "🏥 Activité" },
              ] as const).map(t => (
                <button key={t.key}
                  style={modalTab === t.key ? { ...s.modalTab, ...s.modalTabActive } : s.modalTab}
                  onClick={() => setModalTab(t.key)}
                >{t.lbl}</button>
              ))}
            </div>

            <div style={s.modalBody}>
              {/* CHARGES TAB */}
              {modalTab === "charges" && (
                <div>
                  <div style={s.modalNote}>Saisissez les charges en MAD pour la période {periode}</div>
                  <div style={s.formGrid}>
                    {[
                      { key: "personnel",      lbl: "Personnel (Classe 61)",          placeholder: "Ex: 187000", hint: "Salaires + charges sociales" },
                      { key: "medicaments",    lbl: "Médicaments & DMI (Classe 61)",  placeholder: "Ex: 91000",  hint: "Pharmacie + dispositifs médicaux" },
                      { key: "honoraires",     lbl: "Honoraires médecins (Classe 61)",placeholder: "Ex: 87000",  hint: "Praticiens libéraux" },
                      { key: "frais_generaux", lbl: "Frais généraux (Classe 61)",     placeholder: "Ex: 30000",  hint: "Énergie, maintenance, loyer" },
                      { key: "amortissements", lbl: "Amortissements (Classe 68)",     placeholder: "Ex: 35000",  hint: "Scanner, IRM, équipements lourds" },
                    ].map(f => (
                      <div key={f.key} style={s.formField}>
                        <label style={s.formLabel}>{f.lbl}</label>
                        <input
                          style={s.formInput}
                          type="number"
                          placeholder={f.placeholder}
                          value={formCharges[f.key as keyof typeof formCharges]}
                          onChange={e => setFormCharges(prev => ({ ...prev, [f.key]: e.target.value }))}
                        />
                        <div style={s.formHint}>{f.hint}</div>
                      </div>
                    ))}
                  </div>
                  {saveMsg && <div style={saveMsg.startsWith("✅") ? s.successMsg : s.errorMsg}>{saveMsg}</div>}
                  <button style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={saveCharges}>
                    {saving ? "Enregistrement..." : "Enregistrer les charges"}
                  </button>
                </div>
              )}

              {/* TRÉSORERIE TAB */}
              {modalTab === "tresorerie" && (
                <div>
                  <div style={s.modalNote}>Soldes de fin de période en MAD — {periode}</div>
                  <div style={s.formGrid}>
                    {[
                      { key: "tresorerie_actif",  lbl: "Trésorerie Actif (Compte 51/52)",   placeholder: "Ex: 187000", hint: "Soldes bancaires + caisse" },
                      { key: "tresorerie_passif", lbl: "Trésorerie Passif (Compte 56)",      placeholder: "Ex: 45000",  hint: "Découverts + facilités de caisse" },
                      { key: "actif_circulant",   lbl: "Actif Circulant (Compte 342/35)",    placeholder: "Ex: 312000", hint: "Créances clients + stocks" },
                      { key: "passif_circulant",  lbl: "Passif Circulant (Compte 441/44)",   placeholder: "Ex: 198000", hint: "Dettes fournisseurs + fiscales" },
                    ].map(f => (
                      <div key={f.key} style={s.formField}>
                        <label style={s.formLabel}>{f.lbl}</label>
                        <input
                          style={s.formInput}
                          type="number"
                          placeholder={f.placeholder}
                          value={formTreo[f.key as keyof typeof formTreo]}
                          onChange={e => setFormTreo(prev => ({ ...prev, [f.key]: e.target.value }))}
                        />
                        <div style={s.formHint}>{f.hint}</div>
                      </div>
                    ))}
                  </div>
                  {saveMsg && <div style={saveMsg.startsWith("✅") ? s.successMsg : s.errorMsg}>{saveMsg}</div>}
                  <button style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={saveTresorerie}>
                    {saving ? "Enregistrement..." : "Enregistrer la trésorerie"}
                  </button>
                </div>
              )}

              {/* ADMISSIONS TAB */}
              {modalTab === "admissions" && (
                <div>
                  <div style={s.modalNote}>Activité hospitalière du mois — {periode}</div>
                  <div style={s.formGrid}>
                    {[
                      { key: "nb_admissions", lbl: "Nombre d'admissions",          placeholder: "Ex: 187",    hint: "Total entrées patients hospitalisés" },
                      { key: "nb_journees",   lbl: "Nombre de journées",            placeholder: "Ex: 1410",   hint: "Total journées d'hospitalisation facturées" },
                      { key: "ca_total",      lbl: "Chiffre d'affaires total (MAD)",placeholder: "Ex: 487000", hint: "CA global du mois — toutes prestations" },
                    ].map(f => (
                      <div key={f.key} style={s.formField}>
                        <label style={s.formLabel}>{f.lbl}</label>
                        <input
                          style={s.formInput}
                          type="number"
                          placeholder={f.placeholder}
                          value={formAdm[f.key as keyof typeof formAdm]}
                          onChange={e => setFormAdm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        />
                        <div style={s.formHint}>{f.hint}</div>
                      </div>
                    ))}
                  </div>
                  {saveMsg && <div style={saveMsg.startsWith("✅") ? s.successMsg : s.errorMsg}>{saveMsg}</div>}
                  <button style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={saveAdmissions}>
                    {saving ? "Enregistrement..." : "Enregistrer l'activité"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell:   { display: "flex", height: "100vh", overflow: "hidden", background: "#F2F1EE", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" },
  sidebar: { width: 220, flexShrink: 0, background: "#fff", borderRight: "0.5px solid #E5E3DD", display: "flex", flexDirection: "column" },
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
  sbItemBtn: { display: "flex", alignItems: "center", padding: "6px 8px", borderRadius: 7, cursor: "pointer", color: "#5C5852", fontSize: 11, textDecoration: "none", marginBottom: 1, border: "none", background: "none", fontFamily: "inherit", width: "100%", textAlign: "left" as const },
  sbFooter:{ padding: "10px 8px", borderTop: "0.5px solid #F2F1EE" },
  logoutBtn: { width: "100%", padding: "8px", borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: "pointer", border: "0.5px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", fontFamily: "inherit" },

  main:    { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topbar:  { background: "#fff", borderBottom: "0.5px solid #E5E3DD", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  topTitle:{ fontSize: 14, fontWeight: 600, color: "#1A1814" },
  topSub:  { fontSize: 11, color: "#9C9890", marginTop: 2 },

  periodBar:      { display: "flex", gap: 4 },
  periodBtn:      { fontSize: 11, fontWeight: 500, padding: "5px 12px", borderRadius: 7, cursor: "pointer", border: "0.5px solid #E5E3DD", background: "#fff", color: "#5C5852", fontFamily: "inherit" },
  periodBtnActive:{ background: "#EEEDFB", color: "#5B4FE8", border: "0.5px solid #C4C0F8", fontWeight: 600 },

  content: { flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 },

  sectionTabs:    { display: "flex", gap: 4, marginBottom: 4 },
  sectionTab:     { fontSize: 12, fontWeight: 500, padding: "8px 16px", borderRadius: 8, cursor: "pointer", border: "0.5px solid #E5E3DD", background: "#fff", color: "#5C5852", fontFamily: "inherit" },
  sectionTabActive:{ background: "#EEEDFB", color: "#5B4FE8", border: "0.5px solid #C4C0F8", fontWeight: 600 },

  kpiGrid:  { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 },
  kpi:      { borderRadius: 10, padding: "14px 14px 12px", position: "relative", overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.06)" },
  kpiBar:   { position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "10px 10px 0 0" },
  kpiLbl:   { fontSize: 9, fontWeight: 600, color: "#5C5852", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 },
  kpiVal:   { fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 4 },
  kpiSub:   { fontSize: 9, color: "#9C9890" },

  twoCol:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  card:      { background: "#fff", border: "0.5px solid #E5E3DD", borderRadius: 10, padding: 16 },
  cardTitle: { fontSize: 12, fontWeight: 600, color: "#1A1814" },

  table:    { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th:       { textAlign: "left", padding: "6px 12px", fontSize: 9, fontWeight: 600, color: "#9C9890", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "0.5px solid #F2F1EE" },
  tr:       { borderBottom: "0.5px solid #F5F4F1" },
  td:       { padding: "10px 12px", verticalAlign: "middle", color: "#57534E" },

  saisirBtn:  { fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 8, cursor: "pointer", border: "none", background: "#5B4FE8", color: "#fff", fontFamily: "inherit" },
  overlay:    { position: "fixed", inset: 0, background: "rgba(26,24,20,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal:      { background: "#fff", borderRadius: 14, width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" },
  modalHdr:   { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 22px 16px", borderBottom: "0.5px solid #F2F1EE" },
  modalTitle: { fontSize: 15, fontWeight: 600, color: "#1A1814" },
  modalSub:   { fontSize: 11, color: "#9C9890", marginTop: 3 },
  closeBtn:   { background: "none", border: "none", fontSize: 16, color: "#9C9890", cursor: "pointer" },
  modalTabs:  { display: "flex", gap: 0, padding: "12px 22px 0", borderBottom: "0.5px solid #F2F1EE" },
  modalTab:   { fontSize: 12, fontWeight: 500, padding: "8px 16px", borderRadius: "8px 8px 0 0", cursor: "pointer", border: "none", background: "none", color: "#5C5852", fontFamily: "inherit" },
  modalTabActive: { background: "#EEEDFB", color: "#5B4FE8", fontWeight: 600 },
  modalBody:  { padding: "20px 22px" },
  modalNote:  { fontSize: 12, color: "#9C9890", marginBottom: 16, background: "#F8F7FE", padding: "8px 12px", borderRadius: 7 },
  formGrid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 },
  formField:  { display: "flex", flexDirection: "column", gap: 4 },
  formLabel:  { fontSize: 10, fontWeight: 600, color: "#374151", textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  formInput:  { padding: "9px 12px", border: "0.5px solid #E5E3DD", borderRadius: 8, fontSize: 13, color: "#1A1814", fontFamily: "inherit", outline: "none" },
  formHint:   { fontSize: 10, color: "#9C9890" },
  saveBtn:    { width: "100%", padding: "11px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: "#5B4FE8", color: "#fff", fontFamily: "inherit", marginTop: 4 },
  successMsg: { background: "#DCFCE7", border: "0.5px solid #86EFAC", borderRadius: 7, padding: "8px 12px", fontSize: 12, color: "#166534", marginBottom: 10 },
  errorMsg:   { background: "#FEE2E2", border: "0.5px solid #FCA5A5", borderRadius: 7, padding: "8px 12px", fontSize: 12, color: "#991B1B", marginBottom: 10 },
};
