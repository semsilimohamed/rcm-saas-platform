"use client";
import { useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [error, setError]     = useState("");

  async function handleSubmit() {
    if (!email) { setError("Veuillez entrer votre email."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.reset_url) setResetUrl(data.reset_url);
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          Siha<span style={s.iq}>IQ</span>
        </div>
        <h1 style={s.h1}>Mot de passe oublié</h1>
        <p style={s.sub}>Entrez votre email pour recevoir un lien de réinitialisation.</p>

        {error && <div style={s.error}>{error}</div>}

        {resetUrl ? (
          <div style={s.success}>
            <div style={s.successTitle}>Lien généré avec succès</div>
            <div style={s.successDesc}>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</div>
            <a href={resetUrl} style={s.resetLink}>{resetUrl}</a>
          </div>
        ) : (
          <>
            <div style={s.field}>
              <label style={s.label}>Adresse email</label>
              <input
                style={s.input}
                type="email"
                placeholder="votre@email.ma"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
            </div>
            <button
              style={loading ? { ...s.btn, opacity: 0.7 } : s.btn}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Envoi en cours..." : "Envoyer le lien"}
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

const s: Record<string, React.CSSProperties> = {
  page:   { minHeight: "100vh", background: "#F8FBFF", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" },
  card:   { background: "#fff", border: "0.5px solid #E2E4E9", borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 420 },
  logo:   { fontSize: 22, fontWeight: 300, color: "#0C1B33", marginBottom: 28, letterSpacing: "-0.02em" },
  iq:     { fontWeight: 800, color: "#0F62FE" },
  h1:     { fontSize: 22, fontWeight: 700, color: "#0C1B33", marginBottom: 8, letterSpacing: "-0.02em" },
  sub:    { fontSize: 13, color: "#6B7280", lineHeight: 1.6, marginBottom: 24 },
  error:  { background: "#FEE2E2", border: "0.5px solid #FCA5A5", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#991B1B", marginBottom: 16 },
  field:  { marginBottom: 16 },
  label:  { display: "block", fontSize: 11, fontWeight: 500, color: "#374151", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" },
  input:  { width: "100%", padding: "10px 14px", border: "0.5px solid #D1D5DB", borderRadius: 8, fontSize: 13, color: "#1A1D23", outline: "none", fontFamily: "inherit", background: "#FAFAFA", boxSizing: "border-box" },
  btn:    { width: "100%", padding: "12px", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none", background: "#0F62FE", color: "#fff", fontFamily: "inherit" },
  success:     { background: "#F0FDF4", border: "0.5px solid #86EFAC", borderRadius: 8, padding: "16px", marginBottom: 16 },
  successTitle:{ fontSize: 13, fontWeight: 600, color: "#166534", marginBottom: 6 },
  successDesc: { fontSize: 12, color: "#166534", marginBottom: 10 },
  resetLink:   { fontSize: 11, color: "#0F62FE", wordBreak: "break-all" },
  footer: { marginTop: 20, textAlign: "center" },
  link:   { fontSize: 13, color: "#6B7280", textDecoration: "none" },
};