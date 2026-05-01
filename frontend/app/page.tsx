"use client";

import { useEffect, useState } from "react";

interface Claim {
  id: string;
  claim_number: string;
  patient_name: string;
  amount: number;
  insurance_type: string;
  service_type: string;
  service_date: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

interface Stats {
  total_claims: number;
  pending: number;
  approved: number;
  rejected: number;
  total_amount_mad: number;
  rejection_rate: number;
}

export default function Home() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [patients, setPatients] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form state
  const [form, setForm] = useState({
    patient_id: "",
    claim_number: "",
    amount: "",
    insurance_type: "AMO",
    service_type: "consultation",
    service_date: "",
  });

  async function fetchData() {
    try {
      const [claimsRes, statsRes, patientsRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/claims/with-patients"),
        fetch("http://127.0.0.1:8000/claims/stats/summary"),
        fetch("http://127.0.0.1:8000/patients"),
      ]);
      if (!claimsRes.ok) throw new Error("Failed to fetch claims");
      if (!statsRes.ok) throw new Error("Failed to fetch stats");
      setClaims(await claimsRes.json());
      setStats(await statsRes.json());
      if (patientsRes.ok) setPatients(await patientsRes.json());
    } catch (err) {
      setError("Cannot reach backend. Make sure FastAPI is running on port 8000.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleSubmit() {
    if (!form.patient_id || !form.claim_number || !form.amount || !form.service_date) {
      alert("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/claims/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: form.patient_id,
          claim_number: form.claim_number,
          amount: parseFloat(form.amount),
          insurance_type: form.insurance_type,
          service_type: form.service_type,
          service_date: new Date(form.service_date).toISOString(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert("Error: " + JSON.stringify(err.detail));
        return;
      }

      // Reset form and refresh data
      setForm({ patient_id: "", claim_number: "", amount: "", insurance_type: "AMO", service_type: "consultation", service_date: "" });
      setShowForm(false);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
      await fetchData();
    } catch (err) {
      alert("Failed to submit claim. Check that the backend is running.");
    } finally {
      setSubmitting(false);
    }
  }

  function statusStyle(status: string) {
    switch (status) {
      case "approved": return { background: "#d1fae5", color: "#065f46" };
      case "rejected": return { background: "#fee2e2", color: "#991b1b" };
      default: return { background: "#fef9c3", color: "#854d0e" };
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatMAD(amount: number) {
    return amount.toLocaleString("fr-MA") + " MAD";
  }

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>⚕</span>
            <span style={styles.logoText}>Sihaty <strong>RCM</strong></span>
          </div>
          <span style={styles.headerTag}>University Hospital · Casablanca</span>
        </div>
      </header>

      <main style={styles.main}>
        {error && <div style={styles.errorBanner}>⚠ {error}</div>}

        {submitSuccess && (
          <div style={styles.successBanner}>✓ Claim submitted successfully and added to dashboard</div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <h1 style={styles.h1}>Revenue Cycle Dashboard</h1>
            <p style={styles.subtitle}>Real-time claims data · AMO · CNOPS · CNSS · RAMED</p>
          </div>
          <button style={styles.primaryBtn} onClick={() => setShowForm(!showForm)}>
            {showForm ? "✕ Cancel" : "+ New Claim"}
          </button>
        </div>

        {/* CLAIM SUBMISSION FORM */}
        {showForm && (
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>Submit New Claim</h2>
            <div style={styles.formGrid}>

              <div style={styles.formGroup}>
                <label style={styles.label}>Patient</label>
                <select style={styles.input} value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })}>
                  <option value="">Select a patient</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Claim Number</label>
                <input style={styles.input} placeholder="CLM-2026-016" value={form.claim_number}
                  onChange={e => setForm({ ...form, claim_number: e.target.value })} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Amount (MAD)</label>
                <input style={styles.input} type="number" placeholder="1500" value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Insurance Type</label>
                <select style={styles.input} value={form.insurance_type} onChange={e => setForm({ ...form, insurance_type: e.target.value })}>
                  <option value="AMO">AMO</option>
                  <option value="CNOPS">CNOPS</option>
                  <option value="CNSS">CNSS</option>
                  <option value="RAMED">RAMED</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Service Type</label>
                <select style={styles.input} value={form.service_type} onChange={e => setForm({ ...form, service_type: e.target.value })}>
                  <option value="consultation">Consultation</option>
                  <option value="hospitalisation">Hospitalisation</option>
                  <option value="chirurgie">Chirurgie</option>
                  <option value="radiologie">Radiologie</option>
                  <option value="laboratoire">Laboratoire</option>
                  <option value="kinesitherapie">Kinésithérapie</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Service Date</label>
                <input style={styles.input} type="date" value={form.service_date}
                  onChange={e => setForm({ ...form, service_date: e.target.value })} />
              </div>

            </div>

            <div style={{ marginTop: 20 }}>
              <button style={submitting ? styles.disabledBtn : styles.primaryBtn} onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Claim"}
              </button>
            </div>
          </div>
        )}

        {/* STAT CARDS */}
        <div style={styles.statsGrid}>
          <StatCard label="Total Claims" value={loading ? "—" : String(stats?.total_claims ?? 0)} color="#3b82f6" />
          <StatCard label="Pending" value={loading ? "—" : String(stats?.pending ?? 0)} color="#f59e0b" />
          <StatCard label="Approved" value={loading ? "—" : String(stats?.approved ?? 0)} color="#10b981" />
          <StatCard label="Rejected" value={loading ? "—" : String(stats?.rejected ?? 0)} color="#ef4444" />
          <StatCard label="Total Billed" value={loading ? "—" : formatMAD(stats?.total_amount_mad ?? 0)} color="#8b5cf6" />
          <StatCard label="Rejection Rate" value={loading ? "—" : `${stats?.rejection_rate ?? 0}%`}
            color={(stats?.rejection_rate ?? 0) > 20 ? "#ef4444" : "#10b981"} />
        </div>

        {/* CLAIMS TABLE */}
        <div style={styles.tableCard}>
          <h2 style={styles.tableTitle}>Recent Claims</h2>
          {loading ? (
            <p style={styles.loadingText}>Loading claims from Supabase...</p>
          ) : claims.length === 0 ? (
            <p style={styles.loadingText}>No claims found.</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {["Claim #", "Patient", "Insurance", "Service", "Amount", "Service Date", "Status", "Submitted"].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {claims.map(claim => (
                    <tr key={claim.id} style={styles.tr}>
                      <td style={styles.td}><strong>{claim.claim_number}</strong></td>
                      <td style={styles.td}>{claim.patient_name}</td>
                      <td style={styles.td}>
                        <span style={styles.insuranceBadge}>{claim.insurance_type}</span>
                      </td>
                      <td style={styles.td}>{claim.service_type}</td>
                      <td style={styles.td}>{formatMAD(claim.amount)}</td>
                      <td style={styles.td}>{formatDate(claim.service_date)}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.statusBadge, ...statusStyle(claim.status) }}>{claim.status}</span>
                      </td>
                      <td style={styles.td}>{formatDate(claim.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statAccent, background: color }} />
      <p style={styles.statLabel}>{label}</p>
      <p style={{ ...styles.statValue, color }}>{value}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#1e293b" },
  header: { background: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "0 2rem", position: "sticky", top: 0, zIndex: 100 },
  headerInner: { maxWidth: 1200, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { display: "flex", alignItems: "center", gap: 10, fontSize: 20 },
  logoIcon: { fontSize: 24 },
  logoText: { fontWeight: 400, letterSpacing: "-0.02em" },
  headerTag: { fontSize: 13, color: "#64748b", background: "#f1f5f9", padding: "4px 12px", borderRadius: 20 },
  main: { maxWidth: 1200, margin: "0 auto", padding: "2rem" },
  errorBanner: { background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", padding: "12px 16px", borderRadius: 8, marginBottom: 24, fontSize: 14 },
  successBanner: { background: "#d1fae5", border: "1px solid #6ee7b7", color: "#065f46", padding: "12px 16px", borderRadius: 8, marginBottom: 24, fontSize: 14 },
  h1: { fontSize: 28, fontWeight: 700, margin: 0, marginBottom: 6, letterSpacing: "-0.03em" },
  subtitle: { fontSize: 14, color: "#64748b", margin: 0 },
  primaryBtn: { background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  disabledBtn: { background: "#93c5fd", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "not-allowed" },
  formCard: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, marginBottom: 32 },
  formTitle: { fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 20 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  formGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" },
  input: { padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, background: "#fff", color: "#1e293b", outline: "none" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 },
  statCard: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 20px 20px 24px", position: "relative", overflow: "hidden" },
  statAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, borderRadius: "12px 0 0 12px" },
  statLabel: { fontSize: 12, color: "#64748b", margin: 0, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" },
  statValue: { fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.03em" },
  tableCard: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 },
  tableTitle: { fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 20 },
  loadingText: { color: "#94a3b8", fontSize: 14 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "14px", verticalAlign: "middle" },
  statusBadge: { display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500, textTransform: "capitalize" },
  insuranceBadge: { display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "#eff6ff", color: "#1d4ed8" },
};