"use client";

import { useState, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// ── Types ──────────────────────────────────────────────────────────────────
interface Act {
  ngap_code: string;
  service_type: string;
  amount: number;
  quantity: number;
  ngap_coding_valid: boolean | null;
  prescription_legible: boolean | null;
  pec_required: boolean | null;
  pec_obtained: boolean | null;
}

interface ScanResult {
  extracted: {
    claim_number: string | null;
    amount: number | null;
    service_date: string | null;
    insurance_type: string;
    service_type: string | null;
    acts: Act[];
  };
  prediction: {
    risk_score: number | null;
    risk_level: string | null;
    rejection_cause_predicted: string | null;
    ml_top_factors: string | null;
  };
  validation: {
    immatriculation_valid: number;
    cin_valid: number;
    inpe_present: number;
    pec_obtained: number;
  };
  confidence: Record<string, number>;
  needs_review: boolean;
  critical_missing: string[];
  message: string;
}

interface Patient {
  id: string;
  full_name: string;
  insurance_type: string;
  insurance_number: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function riskColor(level: string | null) {
  if (level === "ÉLEVÉ")  return { bg: "#FEE2E2", color: "#991B1B", border: "#FCA5A5" };
  if (level === "MODÉRÉ") return { bg: "#FEF9C3", color: "#854D0E", border: "#FDE68A" };
  return { bg: "#DCFCE7", color: "#166534", border: "#86EFAC" };
}

function confColor(conf: number) {
  if (conf >= 0.8) return "#16A34A";
  if (conf >= 0.5) return "#D97706";
  return "#DC2626";
}

function confLabel(conf: number) {
  if (conf >= 0.8) return "Haute";
  if (conf >= 0.5) return "Moyenne";
  return "Faible";
}

// ── Confidence Bar ─────────────────────────────────────────────────────────
function ConfBar({ value, label }: { value: number; label: string }) {
  const color = confColor(value);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{
        flex: 1, height: 4, background: "#F2F1EE", borderRadius: 2, overflow: "hidden"
      }}>
        <div style={{
          width: `${Math.round(value * 100)}%`,
          height: "100%",
          background: color,
          borderRadius: 2,
          transition: "width 0.6s ease",
        }} />
      </div>
      <span style={{ fontSize: 9, color, fontWeight: 600, minWidth: 38 }}>
        {label}
      </span>
    </div>
  );
}

// ── Validation Badge ───────────────────────────────────────────────────────
function ValBadge({ ok, label }: { ok: number; label: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "4px 8px", borderRadius: 6,
      background: ok ? "#DCFCE7" : "#FEE2E2",
      border: `0.5px solid ${ok ? "#86EFAC" : "#FCA5A5"}`,
    }}>
      <span style={{ fontSize: 11 }}>{ok ? "✓" : "✗"}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: ok ? "#166534" : "#991B1B" }}>
        {label}
      </span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function ScanReviewModal({ onClose, onConfirm }: {
  onClose: () => void;
  onConfirm: (data: unknown) => void;
}) {
  const [step, setStep]               = useState<"upload" | "review" | "confirming">("upload");
  const [scanning, setScanning]       = useState(false);
  const [scanResult, setScanResult]   = useState<ScanResult | null>(null);
  const [scanError, setScanError]     = useState<string | null>(null);
  const [dragOver, setDragOver]       = useState(false);
  const [fileName, setFileName]       = useState<string | null>(null);

  // Editable extracted fields
  const [claimNumber, setClaimNumber] = useState("");
  const [amount, setAmount]           = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [acts, setActs]               = useState<Act[]>([]);

  // Patient selection
  const [patientSearch, setPatientSearch]   = useState("");
  const [patients, setPatients]             = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchingPatients, setSearchingPatients] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Upload & Scan ──────────────────────────────────────────────────────
  async function handleFile(file: File) {
    const allowed = [".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".tif"];
    if (!allowed.some(ext => file.name.toLowerCase().endsWith(ext))) {
      setScanError("Format non supporté. Veuillez uploader un fichier PDF ou image.");
      return;
    }
    setFileName(file.name);
    setScanning(true);
    setScanError(null);

    try {
      const token = localStorage.getItem("sihaiq_token");
      const form  = new FormData();
      form.append("file", file);

      const res = await fetch(`${API_URL}/claims/scan`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erreur lecture document");
      }

      const data: ScanResult = await res.json();
      setScanResult(data);

      // Pre-fill editable fields
      setClaimNumber(data.extracted.claim_number || "");
      setAmount(data.extracted.amount?.toString() || "");
      setServiceDate(data.extracted.service_date || "");
      setServiceType(data.extracted.service_type || "consultation");
      setActs(data.extracted.acts || []);

      setStep("review");
    } catch (e: unknown) {
      setScanError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setScanning(false);
    }
  }

  // ── Patient search ─────────────────────────────────────────────────────
  async function searchPatients(query: string) {
    if (query.length < 2) { setPatients([]); return; }
    setSearchingPatients(true);
    try {
      const token = localStorage.getItem("sihaiq_token");
      const res   = await fetch(`${API_URL}/patients/?search=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPatients(await res.json());
    } catch { setPatients([]); }
    finally { setSearchingPatients(false); }
  }

  // ── Act editing ────────────────────────────────────────────────────────
  const NGAP_TO_TYPE: Record<string, string> = {
  "C": "consultation", "CS": "consultation", "V": "visite",
  "K": "chirurgie", "KC": "chirurgie", "CKZ": "chirurgie",
  "B": "biologie", "BAMI": "biologie",
  "P": "radiologie", "Z": "radiologie",
  "AMI": "kinesitherapie", "AIS": "kinesitherapie",
  "SPE": "consultation",
};

function updateAct(i: number, field: keyof Act, val: string | number) {
  setActs(prev => prev.map((a, idx) => {
    if (idx !== i) return a;
    const updated = { ...a, [field]: val };
    // Auto-update service_type when ngap_code changes
    if (field === "ngap_code" && typeof val === "string") {
      const prefix = val.replace(/\d/g, "").toUpperCase();
      const mapped = NGAP_TO_TYPE[prefix];
      if (mapped) updated.service_type = mapped;
    }
    return updated;
  }));
}

  function removeAct(i: number) {
    setActs(prev => prev.filter((_, idx) => idx !== i));
  }

  function addAct() {
    setActs(prev => [...prev, {
      ngap_code: "", service_type: "consultation", amount: 0, quantity: 1,
      ngap_coding_valid: null, prescription_legible: null,
      pec_required: null, pec_obtained: null,
    }]);
  }

  // ── Confirm & create claim ─────────────────────────────────────────────
  async function confirmAndCreate() {
    if (!selectedPatient) {
      alert("Veuillez sélectionner un patient.");
      return;
    }
    if (!claimNumber || !amount || !serviceDate) {
      alert("Veuillez compléter les champs obligatoires.");
      return;
    }

    setStep("confirming");
    try {
      const token = localStorage.getItem("sihaiq_token");
      const body  = {
        patient_id:     selectedPatient.id,
        claim_number:   claimNumber,
        amount:         parseFloat(amount),
        insurance_type: scanResult?.extracted.insurance_type || "CNSS",
        service_type:   serviceType,
        service_date:   new Date(serviceDate).toISOString(),
        acts:           acts.map(a => ({
          ngap_code:          a.ngap_code,
          service_type:       a.service_type,
          amount:             a.amount,
          quantity:           a.quantity,
          ngap_coding_valid:  a.ngap_coding_valid,
          prescription_legible: a.prescription_legible,
          pec_required:       a.pec_required,
          pec_obtained:       a.pec_obtained,
        })),
      };

      const res = await fetch(`${API_URL}/claims/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erreur création dossier");
      }

      const created = await res.json();
      onConfirm(created);
      onClose();
    } catch (e: unknown) {
      alert("❌ " + (e instanceof Error ? e.message : "Erreur inconnue"));
      setStep("review");
    }
  }

  const risk = scanResult ? riskColor(scanResult.prediction.risk_level) : null;

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={s.hdr}>
          <div style={s.hdrLeft}>
            <div style={s.hdrIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
            </div>
            <div>
              <div style={s.hdrTitle}>Scanner un dossier FSE</div>
              <div style={s.hdrSub}>
                {step === "upload"     && "Importez un scan PDF de la feuille de soins CNSS"}
                {step === "review"     && `Vérifiez les données extraites — ${fileName}`}
                {step === "confirming" && "Création du dossier en cours..."}
              </div>
            </div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── Step indicator ── */}
        <div style={s.steps}>
          {[
            { key: "upload",     n: "1", label: "Import" },
            { key: "review",     n: "2", label: "Vérification" },
            { key: "confirming", n: "3", label: "Confirmation" },
          ].map((st, i) => {
            const active  = step === st.key;
            const done    = (step === "review" && i === 0) || (step === "confirming" && i < 2);
            return (
              <div key={st.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  background: done ? "#5B4FE8" : active ? "#5B4FE8" : "#E5E3DD",
                  color: done || active ? "#fff" : "#9C9890",
                  fontSize: 10, fontWeight: 700,
                }}>
                  {done ? "✓" : st.n}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: active ? 600 : 400,
                  color: active ? "#5B4FE8" : done ? "#1A1814" : "#9C9890",
                }}>
                  {st.label}
                </span>
                {i < 2 && <div style={{ width: 24, height: 1, background: "#E5E3DD", margin: "0 4px" }} />}
              </div>
            );
          })}
        </div>

        {/* ── STEP 1: Upload ── */}
        {step === "upload" && (
          <div style={s.body}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf, .jpg, .jpeg, .png, .tiff, .tif"
              style={{ display: "none" }}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            <div
              style={{
                ...s.dropzone,
                ...(dragOver ? s.dropzoneActive : {}),
                ...(scanning ? { opacity: 0.7, pointerEvents: "none" } : {}),
              }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {scanning ? (
                <div style={s.scanningState}>
                  <div style={s.spinner} />
                  <div style={s.scanTitle}>Lecture en cours...</div>
                  <div style={s.scanSub}>OCR + extraction des champs + analyse IA</div>
                  <div style={s.scanSteps}>
                    <span style={s.scanStep}>✓ Tesseract OCR</span>
                    <span style={s.scanStep}>✓ Extraction NGAP</span>
                    <span style={{ ...s.scanStep, opacity: 0.5 }}>⋯ Prédiction XGBoost</span>
                  </div>
                </div>
              ) : (
                <div style={s.uploadState}>
                  <div style={s.uploadIcon}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5B4FE8" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <div style={s.uploadTitle}>Déposez le scan FSE ici</div>
                  <div style={s.uploadSub}>ou cliquez pour sélectionner un fichier PDF</div>
                  <div style={s.uploadHint}>
                    Feuille de Soins Maladie CNSS · PDF, JPG, PNG, TIFF
                  </div>
                  <div style={s.uploadPrivacy}>
                    Le document est analysé localement et immédiatement supprimé — aucune donnée personnelle n&apos;est conservée
                  </div>
                </div>
              )}
            </div>

            {scanError && (
              <div style={s.errorBox}>
                <span style={{ fontSize: 13 }}>⚠️</span>
                <span>{scanError}</span>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Review ── */}
        {step === "review" && scanResult && (
          <div style={s.body}>

            {/* AI Risk Banner */}
            {scanResult.prediction.risk_level && risk && (
              <div style={{ ...s.riskBanner, background: risk.bg, border: `0.5px solid ${risk.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: risk.color }}>
                      🧠 Risque de rejet : {scanResult.prediction.risk_level} —{" "}
                      {scanResult.prediction.risk_score
                        ? `${Math.round(scanResult.prediction.risk_score * 100)}%`
                        : ""}
                    </div>
                    {scanResult.prediction.rejection_cause_predicted && (
                      <div style={{ fontSize: 10, color: risk.color, marginTop: 3, opacity: 0.85 }}>
                        {scanResult.prediction.rejection_cause_predicted}
                      </div>
                    )}
                  </div>
                  <div style={{
                    padding: "4px 10px", borderRadius: 20,
                    background: risk.color, color: "#fff",
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {scanResult.prediction.risk_score
                      ? `${Math.round(scanResult.prediction.risk_score * 100)}%`
                      : "—"}
                  </div>
                </div>
              </div>
            )}

            {/* Needs review warning */}
            {scanResult.needs_review && (
              <div style={s.warnBox}>
                ⚠️ Champs manquants : {scanResult.critical_missing.join(", ")} — veuillez les compléter manuellement.
              </div>
            )}

            <div style={s.reviewGrid}>

              {/* LEFT: Dossier fields */}
              <div style={s.reviewCol}>
                <div style={s.secTitle}>Informations du dossier</div>

                {/* Claim number */}
                <div style={s.fieldGroup}>
                  <div style={s.fieldRow}>
                    <label style={s.fieldLabel}>N° Dossier *</label>
                    <ConfBar
                      value={scanResult.confidence.dossier_number}
                      label={confLabel(scanResult.confidence.dossier_number)}
                    />
                  </div>
                  <input
                    style={s.fieldInput}
                    value={claimNumber}
                    onChange={e => setClaimNumber(e.target.value)}
                    placeholder="DOS-2026-XXXXX"
                  />
                </div>

                {/* Amount */}
                <div style={s.fieldGroup}>
                  <div style={s.fieldRow}>
                    <label style={s.fieldLabel}>Montant total (MAD) *</label>
                    <ConfBar
                      value={scanResult.confidence.amount}
                      label={confLabel(scanResult.confidence.amount)}
                    />
                  </div>
                  <input
                    style={s.fieldInput}
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                {/* Date */}
                <div style={s.fieldGroup}>
                  <div style={s.fieldRow}>
                    <label style={s.fieldLabel}>Date de soins *</label>
                    <ConfBar
                      value={scanResult.confidence.service_date}
                      label={confLabel(scanResult.confidence.service_date)}
                    />
                  </div>
                  <input
                    style={s.fieldInput}
                    type="date"
                    value={serviceDate}
                    onChange={e => setServiceDate(e.target.value)}
                  />
                </div>

                {/* Service type */}
                <div style={s.fieldGroup}>
                  <div style={s.fieldRow}>
                    <label style={s.fieldLabel}>Type de soins</label>
                    <ConfBar
                      value={scanResult.confidence.service_type}
                      label={confLabel(scanResult.confidence.service_type)}
                    />
                  </div>
                  <select
                    style={s.fieldInput}
                    value={serviceType}
                    onChange={e => setServiceType(e.target.value)}
                  >
                    {["consultation","hospitalisation","chirurgie","radiologie","laboratoire","kinesitherapie","maternite","accident"].map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>

                {/* Validation flags */}
                <div style={s.secTitle}>Validation automatique</div>
                <div style={s.valGrid}>
                  <ValBadge ok={scanResult.validation.immatriculation_valid} label="Immatriculation" />
                  <ValBadge ok={scanResult.validation.cin_valid}             label="CIN" />
                  <ValBadge ok={scanResult.validation.inpe_present}          label="INPE" />
                  <ValBadge ok={scanResult.validation.pec_obtained}          label="PEC obtenue" />
                </div>

                {/* Patient selection */}
                <div style={s.secTitle}>Patient *</div>
                <div style={s.fieldGroup}>
                  <input
                    style={s.fieldInput}
                    placeholder="Rechercher par nom..."
                    value={patientSearch}
                    onChange={e => {
                      setPatientSearch(e.target.value);
                      searchPatients(e.target.value);
                    }}
                  />
                  {patients.length > 0 && !selectedPatient && (
                    <div style={s.patientDropdown}>
                      {patients.map(p => (
                        <div
                          key={p.id}
                          style={s.patientOption}
                          onClick={() => {
                            setSelectedPatient(p);
                            setPatientSearch(p.full_name);
                            setPatients([]);
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: 12 }}>{p.full_name}</span>
                          <span style={{ fontSize: 10, color: "#9C9890" }}>{p.insurance_type} · {p.insurance_number}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchingPatients && (
                    <div style={{ fontSize: 10, color: "#9C9890", padding: "4px 0" }}>Recherche...</div>
                  )}
                  {selectedPatient && (
                    <div style={s.selectedPatient}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{selectedPatient.full_name}</div>
                        <div style={{ fontSize: 10, color: "#9C9890" }}>
                          {selectedPatient.insurance_type} · {selectedPatient.insurance_number}
                        </div>
                      </div>
                      <button style={s.clearPatient} onClick={() => { setSelectedPatient(null); setPatientSearch(""); }}>
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Acts */}
              <div style={s.reviewCol}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={s.secTitle}>
                    Actes extraits ({acts.length})
                  </div>
                  <button style={s.addActBtn} onClick={addAct}>+ Ajouter</button>
                </div>

                {acts.length === 0 ? (
                  <div style={s.emptyActs}>
                    Aucun acte extrait — ajoutez-les manuellement
                  </div>
                ) : (
                  <div style={s.actsList}>
                    {acts.map((act, i) => (
                      <div key={i} style={s.actCard}>
                        <div style={s.actCardHdr}>
                          <span style={s.actNum}>Acte {i + 1}</span>
                          <button style={s.removeActBtn} onClick={() => removeAct(i)}>✕</button>
                        </div>
                        <div style={s.actFields}>
                          <div style={s.actField}>
                            <label style={s.actLabel}>Code NGAP</label>
                            <input
                              style={s.actInput}
                              value={act.ngap_code}
                              onChange={e => updateAct(i, "ngap_code", e.target.value)}
                              placeholder="C23"
                            />
                          </div>
                          <div style={s.actField}>
                            <label style={s.actLabel}>Type</label>
                            <select
                              style={s.actInput}
                              value={act.service_type}
                              onChange={e => updateAct(i, "service_type", e.target.value)}
                            >
                              {["consultation","hospitalisation","chirurgie","radiologie","biologie","kinesitherapie"].map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                          <div style={s.actField}>
                            <label style={s.actLabel}>Montant (MAD)</label>
                            <input
                              style={s.actInput}
                              type="number"
                              value={act.amount}
                              onChange={e => updateAct(i, "amount", parseFloat(e.target.value))}
                            />
                          </div>
                          <div style={s.actField}>
                            <label style={s.actLabel}>Quantité</label>
                            <input
                              style={s.actInput}
                              type="number"
                              value={act.quantity}
                              min={1}
                              onChange={e => updateAct(i, "quantity", parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                        {/* Service type badge */}
                        <div style={{
                          display: "inline-flex", marginTop: 6,
                          padding: "2px 8px", borderRadius: 10,
                          background: "#EEEDFB", color: "#5B4FE8",
                          fontSize: 9, fontWeight: 600, textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}>
                          {act.service_type}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Amount reconciliation */}
                {acts.length > 0 && (
                  <div style={{
                    ...s.reconcile,
                    borderColor: Math.abs(acts.reduce((s, a) => s + a.amount, 0) - parseFloat(amount || "0")) > 0.01
                      ? "#FCA5A5" : "#86EFAC",
                    background: Math.abs(acts.reduce((s, a) => s + a.amount, 0) - parseFloat(amount || "0")) > 0.01
                      ? "#FEF2F2" : "#F0FDF4",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "#5C5852" }}>Somme des actes</span>
                      <span style={{ fontWeight: 700 }}>
                        {acts.reduce((s, a) => s + a.amount, 0).toLocaleString("fr-MA")} MAD
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 4 }}>
                      <span style={{ color: "#5C5852" }}>Montant total saisi</span>
                      <span style={{ fontWeight: 700 }}>{parseFloat(amount || "0").toLocaleString("fr-MA")} MAD</span>
                    </div>
                    {Math.abs(acts.reduce((s, a) => s + a.amount, 0) - parseFloat(amount || "0")) > 0.01 && (
                      <div style={{ fontSize: 10, color: "#991B1B", marginTop: 6, fontWeight: 600 }}>
                        ⚠️ Discordance détectée — corrigez avant de confirmer
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Confirming ── */}
        {step === "confirming" && (
          <div style={{ ...s.body, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
            <div style={{ textAlign: "center" }}>
              <div style={s.spinner} />
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1814", marginTop: 16 }}>
                Création du dossier...
              </div>
              <div style={{ fontSize: 11, color: "#9C9890", marginTop: 4 }}>
                Sauvegarde des actes et lancement de la prédiction IA
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        {step === "review" && (
          <div style={s.footer}>
            <button style={s.cancelBtn} onClick={() => setStep("upload")}>
              ← Rescan
            </button>
            <button
              style={{
                ...s.confirmBtn,
                opacity: (!selectedPatient || !claimNumber || !amount || !serviceDate) ? 0.5 : 1,
                cursor: (!selectedPatient || !claimNumber || !amount || !serviceDate) ? "not-allowed" : "pointer",
              }}
              disabled={!selectedPatient || !claimNumber || !amount || !serviceDate}
              onClick={confirmAndCreate}
            >
              Confirmer et créer le dossier →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  overlay:     { position: "fixed", inset: 0, background: "rgba(26,24,20,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" },
  modal:       { background: "#FAFAF7", borderRadius: 14, width: "100%", maxWidth: 920, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.22)", overflow: "hidden" },

  hdr:         { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px 14px", borderBottom: "0.5px solid #E5E3DD", background: "#fff", flexShrink: 0 },
  hdrLeft:     { display: "flex", alignItems: "center", gap: 12 },
  hdrIcon:     { width: 36, height: 36, background: "#5B4FE8", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  hdrTitle:    { fontSize: 14, fontWeight: 700, color: "#1A1814", letterSpacing: "-0.02em" },
  hdrSub:      { fontSize: 11, color: "#9C9890", marginTop: 2 },
  closeBtn:    { fontSize: 16, color: "#9C9890", cursor: "pointer", border: "none", background: "none", padding: 4, lineHeight: 1 },

  steps:       { display: "flex", alignItems: "center", padding: "10px 24px", background: "#fff", borderBottom: "0.5px solid #F2F1EE", flexShrink: 0 },

  body:        { flex: 1, overflowY: "auto", padding: "20px 24px" },

  dropzone:    { border: "1.5px dashed #C7C2F7", borderRadius: 12, padding: "40px 24px", cursor: "pointer", transition: "all 0.2s", background: "#fff", textAlign: "center" as const },
  dropzoneActive: { borderColor: "#5B4FE8", background: "#EEEDFB" },

  uploadState: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 8 },
  uploadIcon:  { width: 64, height: 64, background: "#EEEDFB", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  uploadTitle: { fontSize: 15, fontWeight: 600, color: "#1A1814" },
  uploadSub:   { fontSize: 12, color: "#9C9890" },
  uploadHint:  { fontSize: 10, color: "#C7C2F7", fontFamily: "monospace", background: "#F5F3FF", padding: "4px 10px", borderRadius: 6, marginTop: 4 },
  uploadPrivacy: { fontSize: 10, color: "#9C9890", marginTop: 8, maxWidth: 380, lineHeight: 1.5 },

  scanningState: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 10 },
  scanTitle:   { fontSize: 14, fontWeight: 600, color: "#1A1814" },
  scanSub:     { fontSize: 11, color: "#9C9890" },
  scanSteps:   { display: "flex", gap: 12, marginTop: 6 },
  scanStep:    { fontSize: 10, color: "#5B4FE8", fontWeight: 600, background: "#EEEDFB", padding: "3px 8px", borderRadius: 6 },

  spinner:     {
    width: 32, height: 32, borderRadius: "50%",
    border: "3px solid #EEEDFB",
    borderTop: "3px solid #5B4FE8",
    animation: "spin 0.8s linear infinite",
  },

  errorBox:    { display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "10px 14px", background: "#FEF2F2", border: "0.5px solid #FCA5A5", borderRadius: 8, fontSize: 12, color: "#991B1B" },
  warnBox:     { padding: "8px 12px", background: "#FFFBEB", border: "0.5px solid #FDE68A", borderRadius: 8, fontSize: 11, color: "#92400E", marginBottom: 14 },

  riskBanner:  { borderRadius: 10, padding: "12px 14px", marginBottom: 14 },

  reviewGrid:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  reviewCol:   { display: "flex", flexDirection: "column" as const, gap: 0 },

  secTitle:    { fontSize: 9, fontWeight: 700, color: "#9C9890", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 10, marginTop: 16, paddingBottom: 6, borderBottom: "0.5px solid #F2F1EE" },

  fieldGroup:  { marginBottom: 12, position: "relative" as const },
  fieldRow:    { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  fieldLabel:  { fontSize: 10, fontWeight: 600, color: "#5C5852" },
  fieldInput:  { width: "100%", padding: "8px 10px", border: "0.5px solid #E5E3DD", borderRadius: 7, fontSize: 12, fontFamily: "inherit", outline: "none", background: "#fff", color: "#1A1814", boxSizing: "border-box" as const },

  valGrid:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 4 },

  patientDropdown: { position: "absolute" as const, top: "100%", left: 0, right: 0, background: "#fff", border: "0.5px solid #E5E3DD", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 10, maxHeight: 180, overflowY: "auto" as const },
  patientOption:   { display: "flex", flexDirection: "column" as const, gap: 2, padding: "10px 12px", cursor: "pointer", borderBottom: "0.5px solid #F2F1EE" },
  selectedPatient: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#EEEDFB", border: "0.5px solid #C7C2F7", borderRadius: 7, marginTop: 6 },
  clearPatient:    { fontSize: 11, color: "#9C9890", background: "none", border: "none", cursor: "pointer" },

  actsList:    { display: "flex", flexDirection: "column" as const, gap: 8, maxHeight: 340, overflowY: "auto" as const },
  actCard:     { background: "#fff", border: "0.5px solid #E5E3DD", borderRadius: 8, padding: "10px 12px" },
  actCardHdr:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  actNum:      { fontSize: 10, fontWeight: 700, color: "#5B4FE8", textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  removeActBtn:{ fontSize: 11, color: "#9C9890", background: "none", border: "none", cursor: "pointer" },
  actFields:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  actField:    { display: "flex", flexDirection: "column" as const, gap: 4 },
  actLabel:    { fontSize: 9, fontWeight: 600, color: "#9C9890", textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  actInput:    { padding: "6px 8px", border: "0.5px solid #E5E3DD", borderRadius: 6, fontSize: 11, fontFamily: "inherit", outline: "none", background: "#FAFAF7" },
  addActBtn:   { fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 6, cursor: "pointer", border: "0.5px solid #C7C2F7", background: "#EEEDFB", color: "#5B4FE8", fontFamily: "inherit" },
  emptyActs:   { fontSize: 12, color: "#9C9890", padding: "20px", textAlign: "center" as const, background: "#fff", border: "0.5px dashed #E5E3DD", borderRadius: 8 },

  reconcile:   { marginTop: 10, padding: "10px 12px", borderRadius: 8, border: "0.5px solid" },

  footer:      { padding: "14px 24px", borderTop: "0.5px solid #E5E3DD", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", flexShrink: 0 },
  cancelBtn:   { fontSize: 12, fontWeight: 500, padding: "8px 16px", borderRadius: 7, cursor: "pointer", border: "0.5px solid #E5E3DD", background: "#fff", color: "#5C5852", fontFamily: "inherit" },
  confirmBtn:  { fontSize: 12, fontWeight: 700, padding: "9px 20px", borderRadius: 7, border: "none", background: "#5B4FE8", color: "#fff", fontFamily: "inherit", letterSpacing: "-0.01em" },
};