"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="44" height="44" rx="11" fill="#0F62FE" />
      <circle cx="22" cy="22" r="6" fill="white" />
      <circle cx="22" cy="22" r="2.8" fill="#0F62FE" />
      <line x1="22" y1="7"    x2="22" y2="14"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" />
      <line x1="22" y1="30"   x2="22" y2="37"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" />
      <line x1="7"  y1="22"   x2="14" y2="22"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" />
      <line x1="30" y1="22"   x2="37" y2="22"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" />
      <line x1="12"   y1="12"   x2="16.5" y2="16.5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="27.5" y1="27.5" x2="32"   y2="32"   stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="32"   y1="12"   x2="27.5" y2="16.5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="16.5" y1="27.5" x2="12"   y2="32"   stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleLogin() {
    if (!email || !password) { setError("Veuillez remplir tous les champs."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
      });
      if (!res.ok) { setError("Email ou mot de passe incorrect."); return; }
      const data = await res.json();
      localStorage.setItem("sihaiq_token", data.access_token);
      localStorage.setItem("sihaiq_tenant_id", data.tenant_id);
      localStorage.setItem("sihaiq_user", JSON.stringify({ name: data.full_name, role: data.role }));
      router.push("/dashboard");
    } catch {
      setError("Impossible de contacter le serveur. Vérifiez que le backend est actif.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.left}>
        <div style={s.leftInner}>
          <div style={s.brand}>
            <LogoMark size={40} />
            <div>
              <div style={s.brandName}>Siha<span style={s.brandIQ}>IQ</span></div>
              <div style={s.brandSub}>RCM Platform</div>
            </div>
          </div>
          <h1 style={s.h1}>Bon retour</h1>
          <p style={s.sub}>Connectez-vous pour accéder à votre tableau de bord RCM.</p>

          {error && <div style={s.errorBox}>{error}</div>}

          <div style={s.field}>
            <label style={s.label}>Adresse email</label>
            <input
              style={s.input}
              type="email"
              placeholder="votre@email.ma"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Mot de passe</label>
            <input
              style={s.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
          </div>

          <button
            style={loading ? { ...s.btn, opacity: 0.7 } : s.btn}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>

          <div style={s.footer}>
            Pas encore de compte ?{" "}
            <Link href="/auth/register" style={s.link}>Créer un compte</Link>
          </div>
          <div style={s.footerBack}>
            <Link href="/" style={s.linkMuted}>← Retour à l&apos;accueil</Link>
          </div>
        </div>
      </div>

      <div style={s.right}>
        <div style={s.rightInner}>
          <div style={s.statCard}>
            <div style={s.statVal}>88%</div>
            <div style={s.statLbl}>Précision de prédiction IA</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statVal}>-62%</div>
            <div style={s.statLbl}>Réduction du taux de rejet</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statVal}>12:1</div>
            <div style={s.statLbl}>ROI moyen par clinique</div>
          </div>
          <div style={s.quote}>
            &ldquo;SihaIQ a transformé notre gestion des dossiers BAF. Nous récupérons 74 000 MAD de plus chaque mois.&rdquo;
          </div>
          <div style={s.quoteAuthor}>Direction financière, Polyclinique privée · Maroc</div>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:  { display: "flex", minHeight: "100vh", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" },
  left:  { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", padding: "40px 24px" },
  leftInner: { width: "100%", maxWidth: 400 },
  brand: { display: "flex", alignItems: "center", gap: 12, marginBottom: 40 },
  brandName: { fontSize: 22, fontWeight: 300, color: "#0C1B33", letterSpacing: "-0.02em" },
  brandIQ:   { fontWeight: 800, color: "#0F62FE" },
  brandSub:  { fontSize: 10, fontWeight: 600, color: "#9EA3AE", letterSpacing: "0.12em", textTransform: "uppercase" },
  h1:   { fontSize: 28, fontWeight: 700, color: "#0C1B33", letterSpacing: "-0.02em", marginBottom: 8 },
  sub:  { fontSize: 14, color: "#6B7280", lineHeight: 1.6, marginBottom: 28 },
  errorBox: { background: "#FEE2E2", border: "0.5px solid #FCA5A5", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#991B1B", marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" },
  input: { width: "100%", padding: "10px 14px", border: "0.5px solid #D1D5DB", borderRadius: 8, fontSize: 14, color: "#1A1D23", outline: "none", fontFamily: "inherit", background: "#FAFAFA" },
  btn:   { width: "100%", padding: "12px", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none", background: "#0F62FE", color: "#fff", fontFamily: "inherit", marginTop: 8 },
  footer:     { fontSize: 13, color: "#6B7280", marginTop: 20, textAlign: "center" },
  footerBack: { fontSize: 12, color: "#9EA3AE", marginTop: 10, textAlign: "center" },
  link:       { color: "#0F62FE", textDecoration: "none", fontWeight: 500 },
  linkMuted:  { color: "#9EA3AE", textDecoration: "none" },
  right: { width: 420, background: "#0C1B33", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 32px" },
  rightInner: { display: "flex", flexDirection: "column", gap: 16 },
  statCard: { background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "18px 20px" },
  statVal:  { fontSize: 28, fontWeight: 800, color: "#60A5FA", letterSpacing: "-0.02em", marginBottom: 4 },
  statLbl:  { fontSize: 13, color: "#94A3B8" },
  quote:       { background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 20px", fontSize: 13, color: "#CBD5E1", lineHeight: 1.6, fontStyle: "italic" },
  quoteAuthor: { fontSize: 11, color: "#475569", textAlign: "center" },
};