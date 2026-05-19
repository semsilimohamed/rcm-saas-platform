"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function ResetForm() {
  const searchParams  = useSearchParams();
  const token         = searchParams.get("token") || "";
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState("");

  async function handleReset() {
    if (!password || !confirm) { setError("Veuillez remplir tous les champs."); return; }
    if (password !== confirm)  { setError("Les mots de passe ne correspondent pas."); return; }
    if (password.length < 8)   { setError("Minimum 8 caractères."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Erreur lors de la réinitialisation.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>Siha<span style={s.iq}>IQ</span></div>
        <h1 style={s.h1}>Nouveau mot de passe</h1>

        {success ? (
          <div style={s.success}>
            <div style={s.successTitle}>Mot de passe réinitialisé avec succès</div>
            <Link href="/auth/login" style={s.btn}>Se connecter</Link>
          </div>
        ) : (
          <>
            {error && <div style={s.error}>{error}</div>}
            <div style={s.field}>
              <label style={s.label}>Nouveau mot de passe</label>
              <input style={s.input} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Confirmer</label>
              <input style={s.input} type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === "Enter" && handleReset()} />
            </div>
            <button style={loading ? { ...s.btn, opacity: 0.7 } : s.btn} onClick={handleReset} disabled={loading}>
              {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
            </button>
          </>
        )}
        <div style={s.footer}>
          <Link href="/auth/login" style={s.link}>← Retour à la connexion</Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}

const s: Record<string, React.CSSProperties> = {
  page:        { minHeight: "100vh", background: "#F8FBFF", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" },
  card:        { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 420 },
  logo:        { fontSize: 22, fontWeight: 300, color: "#0C1B33", marginBottom: 28, letterSpacing: "-0.02em" },
  iq:          { fontWeight: 800, color: "#0F62FE" },
  h1:          { fontSize: 22, fontWeight: 700, color: "#0C1B33", marginBottom: 20, letterSpacing: "-0.02em" },
  error:       { background: "#FEE2E2", border: "0.5px solid #FCA5A5", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#991B1B", marginBottom: 16 },
  field:       { marginBottom: 16 },
  label:       { display: "block", fontSize: 11, fontWeight: 500, color: "#374151", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" },
  input:       { width: "100%", padding: "10px 14px", border: "0.5px solid #D1D5DB", borderRadius: 8, fontSize: 13, color: "#1A1D23", outline: "none", fontFamily: "inherit", background: "#FAFAFA", boxSizing: "border-box" },
  btn:         { display: "block", width: "100%", padding: "12px", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none", background: "#0F62FE", color: "#fff", fontFamily: "inherit", textDecoration: "none", textAlign: "center", marginTop: 8 },
  success:     { background: "#F0FDF4", border: "0.5px solid #86EFAC", borderRadius: 8, padding: "16px", display: "flex", flexDirection: "column", gap: 12 },
  successTitle:{ fontSize: 13, fontWeight: 600, color: "#166534" },
  footer:      { marginTop: 20, textAlign: "center" },
  link:        { fontSize: 13, color: "#6B7280", textDecoration: "none" },
};
