 "use client";

import { useEffect, useState } from "react";

// ============================================================
// TYPES — these match your exact database field names
// ============================================================
interface Claim {
  id: string;
  claim_number: string;
  amount: number;
  insurance_type: string;
  service_type: string;
  service_date: string;
  status: string;
  denial_probability: number | null;
  risk_level: string | null;
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

// ============================================================
// MAIN PAGE
// ============================================================
export default function Home() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [claimsRes, statsRes] = await Promise.all([
          fetch("http://127.0.0.1:8000/claims"),
          fetch("http://127.0.0.1:8000/claims/stats/summary"),
        ]);

        if (!claimsRes.ok) throw new Error("Failed to fetch claims");
        if (!statsRes.ok) throw new Error("Failed to fetch stats");

        const claimsData = await claimsRes.json();
        const statsData = await statsRes.json();

        setClaims(claimsData);
        setStats(statsData);
      } catch (err) {
        setError("Cannot reach backend. Make sure FastAPI is running on port 8000.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // ── Status badge color ──────────────────────────────────
  function statusStyle(status: string) {
    switch (status) {
      case "approved":
        return { background: "#d1fae5", color: "#065f46" };
      case "rejected":
        return { background: "#fee2e2", color: "#991b1b" };
      default:
        return { background: "#fef9c3", color: "#854d0e" };
    }
  }

  // ── Format date ─────────────────────────────────────────
  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-MA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // ── Format money ────────────────────────────────────────
  function formatMAD(amount: number) {
    return amount.toLocaleString("fr-MA") + " MAD";
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={styles.page}>

      {/* ── HEADER ── */}
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

        {/* ── ERROR BANNER ── */}
        {error && (
          <div style={styles.errorBanner}>
            ⚠ {error}
          </div>
        )}

        {/* ── PAGE TITLE ── */}
        <div style={styles.pageTitle}>
          <h1 style={styles.h1}>Revenue Cycle Dashboard</h1>
          <p style={styles.subtitle}>
            Real-time claims data · AMO · CNOPS · CNSS · RAMED
          </p>
        </div>

        {/* ── STAT CARDS ── */}
        <div style={styles.statsGrid}>
          <StatCard
            label="Total Claims"
            value={loading ? "—" : String(stats?.total_claims ?? 0)}
            color="#3b82f6"
          />
          <StatCard
            label="Pending"
            value={loading ? "—" : String(stats?.pending ?? 0)}
            color="#f59e0b"
          />
          <StatCard
            label="Approved"
            value={loading ? "—" : String(stats?.approved ?? 0)}
            color="#10b981"
          />
          <StatCard
            label="Rejected"
            value={loading ? "—" : String(stats?.rejected ?? 0)}
            color="#ef4444"
          />
          <StatCard
            label="Total Billed"
            value={loading ? "—" : formatMAD(stats?.total_amount_mad ?? 0)}
            color="#8b5cf6"
          />
          <StatCard
            label="Rejection Rate"
            value={loading ? "—" : `${stats?.rejection_rate ?? 0}%`}
            color={
              (stats?.rejection_rate ?? 0) > 20 ? "#ef4444" : "#10b981"
            }
          />
        </div>

        {/* ── CLAIMS TABLE ── */}
        <div style={styles.tableCard}>
          <h2 style={styles.tableTitle}>Recent Claims</h2>

          {loading ? (
            <p style={styles.loadingText}>Loading claims from Supabase...</p>
          ) : claims.length === 0 ? (
            <p style={styles.loadingText}>No claims found in the database.</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {[
                      "Claim #",
                      "Insurance",
                      "Service",
                      "Amount",
                      "Service Date",
                      "Status",
                      "Submitted",
                    ].map((h) => (
                      <th key={h} style={styles.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim) => (
                    <tr key={claim.id} style={styles.tr}>
                      <td style={styles.td}>
                        <strong>{claim.claim_number}</strong>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.insuranceBadge}>
                          {claim.insurance_type}
                        </span>
                      </td>
                      <td style={styles.td}>{claim.service_type}</td>
                      <td style={styles.td}>{formatMAD(claim.amount)}</td>
                      <td style={styles.td}>{formatDate(claim.service_date)}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            ...statusStyle(claim.status),
                          }}
                        >
                          {claim.status}
                        </span>
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

// ============================================================
// STAT CARD COMPONENT
// ============================================================
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statAccent, background: color }} />
      <p style={styles.statLabel}>{label}</p>
      <p style={{ ...styles.statValue, color }}>{value}</p>
    </div>
  );
}

// ============================================================
// STYLES — plain CSS-in-JS, no Tailwind needed
// ============================================================
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#1e293b",
  },
  header: {
    background: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    padding: "0 2rem",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    height: 64,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 20,
  },
  logoIcon: {
    fontSize: 24,
  },
  logoText: {
    fontWeight: 400,
    letterSpacing: "-0.02em",
  },
  headerTag: {
    fontSize: 13,
    color: "#64748b",
    background: "#f1f5f9",
    padding: "4px 12px",
    borderRadius: 20,
  },
  main: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "2rem",
  },
  errorBanner: {
    background: "#fee2e2",
    border: "1px solid #fca5a5",
    color: "#991b1b",
    padding: "12px 16px",
    borderRadius: 8,
    marginBottom: 24,
    fontSize: 14,
  },
  pageTitle: {
    marginBottom: 32,
  },
  h1: {
    fontSize: 28,
    fontWeight: 700,
    margin: 0,
    marginBottom: 6,
    letterSpacing: "-0.03em",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    margin: 0,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "20px 20px 20px 24px",
    position: "relative",
    overflow: "hidden",
  },
  statAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: "12px 0 0 12px",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    margin: 0,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  statValue: {
    fontSize: 26,
    fontWeight: 700,
    margin: 0,
    letterSpacing: "-0.03em",
  },
  tableCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 24,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
    marginBottom: 20,
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  },
  th: {
    textAlign: "left",
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: "14px",
    verticalAlign: "middle",
  },
  statusBadge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    textTransform: "capitalize",
  },
  insuranceBadge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    background: "#eff6ff",
    color: "#1d4ed8",
  },
};
