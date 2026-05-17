"use client";

import { useState } from "react";
import Link from "next/link";
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

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    hospital_name: "",
    hospital_email: "",
    full_name: "",
    password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  function update(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleRegister() {
    if (!form.hospital_name || !form.hospital_email || !form.full_name || !form.password) {
      setError("Veuillez remplir tous les champs."); return;
    }
    if (form.password !== form.confirm_password) {
      setError("Les mots de passe ne correspondent pas."); return;
    }
    if (form.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères."); return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospital_name: form.hospital_name,
          hospital_email: form.hospital_email,
          full_name: form.full_name,
          password: form.password,
          role: "admin",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Erreur lors de la création du compte.");
        return;
      }
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

          <h1 style={s.h1}>Créer votre compte</h1>
          <p style={s.sub}>
            Commencez gratuitement. Votre établissement aura accès à la plateforme complète.
          </p>

          {error && <div style={s.errorBox}>{error}</div>}

          <div style={s.field}>
            <label style={s.label}>Nom de l&apos;établissement</label>
            <input
              style={s.input}
              type="text"
              placeholder="Polyclinique Al Amal"
              value={form.hospital_name}
              onChange={e => update("hospital_name", e.target.value)}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Email professionnel</label>
            <input
              style={s.input}
              type="email"
              placeholder="direction@polyclinique.ma"
              value={form.hospital_email}
              onChange={e => update("hospital_email", e.target.value)}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Votre nom complet</label>
            <input
              style={s.input}
              type="text"
              placeholder="Dr. Ahmed Bennani"
              value={form.full_name}
              onChange={e => update("full_name", e.target.value)}
            />
          </div>

          <div style={s.row}>
            <div style={{ ...s.field, flex: 1 }}>
              <label style={s.label}>Mot de passe</label>
              <input
                style={s.input}
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => update("password", e.target.value)}
              />
            </div>
            <div style={{ ...s.field, flex: 1 }}>
              <label style={s.label}>Confirmer</label>
              <input
                style={s.input}
                type="password"
                placeholder="••••••••"
                value={form.confirm_password}
                onChange={e => update("confirm_password", e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRegister()}
              />
            </div>
          </div>

          <button
            style={loading ? { ...s.btn, opacity: 0.7 } : s.btn}
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? "Création en cours..." : "Créer mon compte"}
          </button>

          <div style={s.terms}>
            En créant un compte, vous acceptez nos{" "}
            <span style={s.link}>Conditions d&apos;utilisation</span>
            {" "}et notre{" "}
            <span style={s.link}>Politique de confidentialité</span>.
          </div>

          <div style={s.footer}>
            Déjà un compte ?{" "}
            <Link href="/auth/login" style={s.linkBlue}>Se connecter</Link>
          </div>
          <div style={s.footerBack}>
            <Link href="/" style={s.linkMuted}>← Retour à l&apos;accueil</Link>
          </div>
        </div>
      </div>

      <div style={s.right}>
        <div style={s.rightInner}>
          <div style={s.rightTitle}>Ce que vous obtenez</div>
          {[
            { icon: "🧠", title: "Prédiction IA des rejets", desc: "XGBoost analyse 17 critères de vos dossiers BAF avant soumission." },
            { icon: "📊", title: "Tableau de bord financier", desc: "Encours A/R, taux de rejet, vieillissement — en temps réel." },
            { icon: "⚠️", title: "Alertes forclusion", desc: "Notifications automatiques J-15, J-7, J-1 avant le délai légal." },
            { icon: "🔒", title: "Conforme CNDP Loi 09-08", desc: "Aucune donnée patient réelle. Architecture souveraine." },
          ].map(f => (
            <div key={f.title} style={s.featureItem}>
              <span style={s.featureIcon}>{f.icon}</span>
              <div>
                <div style={s.featureTitle}>{f.title}</div>
                <div style={s.featureDesc}>{f.desc}</div>
              </div>
            </div>
          ))}
          <div style={s.trialNote}>
            Essai gratuit · Sans carte bancaire · Résiliation à tout moment
          </div>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:      { display: "flex", minHeight: "100vh", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" },
  left:      { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", padding: "40px 24px" },
  leftInner: { width: "100%", maxWidth: 440 },
  brand:     { display: "flex", alignItems: "center", gap: 12, marginBottom: 32 },
  brandName: { fontSize: 22, fontWeight: 300, color: "#0C1B33", letterSpacing: "-0.02em" },
  brandIQ:   { fontWeight: 800, color: "#0F62FE" },
  brandSub:  { fontSize: 10, fontWeight: 600, color: "#9EA3AE", letterSpacing: "0.12em", textTransform: "uppercase" },
  h1:        { fontSize: 26, fontWeight: 700, color: "#0C1B33", letterSpacing: "-0.02em", marginBottom: 8 },
  sub:       { fontSize: 13, color: "#6B7280", lineHeight: 1.6, marginBottom: 24 },
  errorBox:  { background: "#FEE2E2", border: "0.5px solid #FCA5A5", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#991B1B", marginBottom: 16 },
  field:     { marginBottom: 14 },
  row:       { display: "flex", gap: 12 },
  label:     { display: "block", fontSize: 11, fontWeight: 500, color: "#374151", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" },
  input:     { width: "100%", padding: "10px 14px", border: "0.5px solid #D1D5DB", borderRadius: 8, fontSize: 13, color: "#1A1D23", outline: "none", fontFamily: "inherit", background: "#FAFAFA", boxSizing: "border-box" },
  btn:       { width: "100%", padding: "12px", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none", background: "#0F62FE", color: "#fff", fontFamily: "inherit", marginTop: 4 },
  terms:     { fontSize: 11, color: "#9EA3AE", marginTop: 12, lineHeight: 1.5, textAlign: "center" },
  footer:    { fontSize: 13, color: "#6B7280", marginTop: 16, textAlign: "center" },
  footerBack:{ fontSize: 12, color: "#9EA3AE", marginTop: 8, textAlign: "center" },
  link:      { color: "#0F62FE", cursor: "pointer" },
  linkBlue:  { color: "#0F62FE", textDecoration: "none", fontWeight: 500 },
  linkMuted: { color: "#9EA3AE", textDecoration: "none" },

  right:      { width: 400, background: "#0C1B33", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 32px" },
  rightInner: { display: "flex", flexDirection: "column", gap: 14 },
  rightTitle: { fontSize: 13, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 },
  featureItem:{ display: "flex", alignItems: "flex-start", gap: 14, background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 16px" },
  featureIcon:{ fontSize: 20, flexShrink: 0, marginTop: 1 },
  featureTitle:{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", marginBottom: 3 },
  featureDesc: { fontSize: 12, color: "#94A3B8", lineHeight: 1.5 },
  trialNote:  { fontSize: 11, color: "#475569", textAlign: "center", marginTop: 8 },
};