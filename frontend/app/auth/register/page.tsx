"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="44" height="44" rx="11" fill="#5B4FE8" />
      <circle cx="22" cy="22" r="6" fill="white" />
      <circle cx="22" cy="22" r="2.8" fill="#5B4FE8" />
      <line x1="22" y1="7"    x2="22" y2="14"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" />
      <line x1="22" y1="30"   x2="22" y2="37"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" />
      <line x1="7"  y1="22"   x2="14" y2="22"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" />
      <line x1="30" y1="22"   x2="37" y2="22"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" />
      <line x1="12"   y1="12"   x2="16.5" y2="16.5" stroke="#C7C2F7" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="27.5" y1="27.5" x2="32"   y2="32"   stroke="#C7C2F7" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="32"   y1="12"   x2="27.5" y2="16.5" stroke="#C7C2F7" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="16.5" y1="27.5" x2="12"   y2="32"   stroke="#C7C2F7" strokeWidth="1.6" strokeLinecap="round" />
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.hospital_email)) {
      setError("Adresse email invalide."); return;
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

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tweens: gsap.core.Tween[] = [];

    if (reduceMotion) {
      gsap.set([".reg-anim", ".reg-feature"], { opacity: 1, clearProps: "transform" });
      return () => { tweens.forEach(t => t.kill()); };
    }

    /* Left panel: staggered entrance */
    tweens.push(gsap.fromTo(".reg-anim",
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, stagger: 0.07, ease: "power2.out", delay: 0.15 }
    ));

    /* Right panel: feature cards slide in from the right */
    tweens.push(gsap.fromTo(".reg-feature",
      { x: 26, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.6, stagger: 0.12, ease: "power3.out", delay: 0.4 }
    ));

    return () => { tweens.forEach(t => t.kill()); };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

        @keyframes vz-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes err-shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-5px); } 40% { transform: translateX(5px); }
          60% { transform: translateX(-3px); } 80% { transform: translateX(3px); }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation: none !important; transition: none !important; }
        }

        .reg-anim, .reg-feature { opacity: 0; }
        @media (prefers-reduced-motion: reduce) { .reg-anim, .reg-feature { opacity: 1; } }

        .lg-error { animation: err-shake 0.4s ease; }

        /* Floating-label fields (placeholder revealed on focus only) */
        .ffield { position: relative; margin-bottom: 14px; }
        .finput {
          width: 100%; padding: 20px 14px 8px; border: 1.5px solid #E5E3DD; border-radius: 10px;
          font-size: 13px; color: #1A1814; outline: none; font-family: inherit; background: #FAFAF7;
          box-sizing: border-box; transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
        }
        .finput::placeholder { color: transparent; transition: color 0.18s; }
        .finput:focus::placeholder { color: #B8B4AC; }
        .finput:focus { border-color: #5B4FE8; background: #fff; box-shadow: 0 0 0 4px rgba(91,79,232,0.1); }
        .flabel {
          position: absolute; left: 14px; top: 15px; font-size: 13px; color: #9C9890;
          pointer-events: none; transition: all 0.16s ease; letter-spacing: 0.01em;
          white-space: nowrap; overflow: hidden; max-width: calc(100% - 28px); text-overflow: ellipsis;
        }
        .finput:focus + .flabel,
        .finput:not(:placeholder-shown) + .flabel {
          top: 6px; font-size: 10px; font-weight: 600; color: #5B4FE8;
          text-transform: uppercase; letter-spacing: 0.07em;
        }
        .finput:not(:focus):not(:placeholder-shown) + .flabel { color: #9C9890; }

        .lg-btn {
          width: 100%; padding: 13px; border-radius: 10px; font-size: 14px; font-weight: 600;
          cursor: pointer; border: none; background: #5B4FE8; color: #fff; font-family: inherit;
          margin-top: 4px; box-shadow: 0 2px 14px rgba(91,79,232,0.3);
          transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
        }
        .lg-btn:hover:not(:disabled) { background: #4A3FD4; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(91,79,232,0.4); }
        .lg-btn:active:not(:disabled) { transform: translateY(0) scale(0.985); }
        .lg-btn:disabled { opacity: 0.7; cursor: default; }

        /* Right panel */
        .vz-panel {
          width: 440px; background: #1A1814; display: flex; align-items: center; justify-content: center;
          padding: 40px 32px; position: relative; overflow: hidden;
        }
        .vz-panel::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse at 20% 15%, rgba(91,79,232,0.16) 0%, transparent 55%),
                      radial-gradient(ellipse at 85% 90%, rgba(242,113,28,0.1) 0%, transparent 55%);
        }
        .vz-grid {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.25;
          background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 44px 44px;
        }
        .vz-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #2FB47C; display: inline-block; animation: vz-pulse 1.8s ease infinite; }
        .reg-feature { transition: border-color 0.2s, background 0.2s; }
        .reg-feature:hover { border-color: rgba(91,79,232,0.45) !important; background: rgba(91,79,232,0.08) !important; }
        @media (max-width: 920px) { .vz-panel { display: none; } }
      `}</style>

      <div style={s.page}>
        {/* LEFT — registration form (logic unchanged) */}
        <div style={s.left}>
          <div style={s.leftInner}>
            <div style={s.brand} className="reg-anim">
              <LogoMark size={40} />
              <div>
                <div style={s.brandName}>Siha<span style={s.brandIQ}>IQ</span></div>
                <div style={s.brandSub}>RCM Platform</div>
              </div>
            </div>

            <h1 style={s.h1} className="reg-anim">Créer votre compte</h1>
            <p style={s.sub} className="reg-anim">
              Commencez gratuitement. Votre établissement aura accès à la plateforme complète.
            </p>

            {error && <div style={s.errorBox} className="lg-error">{error}</div>}

            <div className="ffield reg-anim">
              <input
                className="finput"
                id="reg-hospital"
                type="text"
                placeholder="Polyclinique Al Amal"
                value={form.hospital_name}
                onChange={e => update("hospital_name", e.target.value)}
                autoComplete="organization"
              />
              <label className="flabel" htmlFor="reg-hospital">Nom de l&apos;établissement</label>
            </div>

            <div className="ffield reg-anim">
              <input
                className="finput"
                id="reg-email"
                type="email"
                placeholder="direction@polyclinique.ma"
                value={form.hospital_email}
                onChange={e => update("hospital_email", e.target.value)}
                autoComplete="email"
              />
              <label className="flabel" htmlFor="reg-email">Email professionnel</label>
            </div>

            <div className="ffield reg-anim">
              <input
                className="finput"
                id="reg-name"
                type="text"
                placeholder="Dr. Ahmed Bennani"
                value={form.full_name}
                onChange={e => update("full_name", e.target.value)}
                autoComplete="name"
              />
              <label className="flabel" htmlFor="reg-name">Votre nom complet</label>
            </div>

            <div style={s.row} className="reg-anim">
              <div className="ffield" style={{ flex: 1, marginBottom: 0 }}>
                <input
                  className="finput"
                  id="reg-password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => update("password", e.target.value)}
                  autoComplete="new-password"
                />
                <label className="flabel" htmlFor="reg-password">Mot de passe</label>
              </div>
              <div className="ffield" style={{ flex: 1, marginBottom: 0 }}>
                <input
                  className="finput"
                  id="reg-confirm"
                  type="password"
                  placeholder="••••••••"
                  value={form.confirm_password}
                  onChange={e => update("confirm_password", e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleRegister()}
                  autoComplete="new-password"
                />
                <label className="flabel" htmlFor="reg-confirm">Confirmer</label>
              </div>
            </div>

            <div className="reg-anim" style={{ marginTop: 14 }}>
              <button className="lg-btn" onClick={handleRegister} disabled={loading}>
                {loading ? "Création en cours..." : "Créer mon compte"}
              </button>
            </div>

            <div style={s.terms} className="reg-anim">
              En créant un compte, vous acceptez nos{" "}
              <span style={s.link}>Conditions d&apos;utilisation</span>
              {" "}et notre{" "}
              <span style={s.link}>Politique de confidentialité</span>.
            </div>

            <div style={s.footer} className="reg-anim">
              Déjà un compte ?{" "}
              <Link href="/auth/login" style={s.linkBlue}>Se connecter</Link>
            </div>
            <div style={s.footerBack} className="reg-anim">
              <Link href="/" style={s.linkMuted}>← Retour à l&apos;accueil</Link>
            </div>
          </div>
        </div>

        {/* RIGHT — value proposition panel */}
        <div className="vz-panel">
          <div className="vz-grid" aria-hidden="true" />
          <div style={s.rightInner}>
            <div style={s.vzHeader}>
              <span className="vz-live-dot" />
              <span style={s.rightTitle}>Ce que vous obtenez</span>
            </div>
            {[
              { icon: "🧠", title: "Prédiction IA des rejets", desc: "XGBoost analyse 17 critères de vos dossiers BAF avant soumission." },
              { icon: "📊", title: "Tableau de bord financier", desc: "Encours A/R, taux de rejet, vieillissement — en temps réel." },
              { icon: "⚠️", title: "Alertes forclusion", desc: "Notifications automatiques J-15, J-7, J-1 avant le délai légal." },
              { icon: "🔒", title: "Conforme CNDP Loi 09-08", desc: "Aucune donnée patient réelle. Architecture souveraine." },
            ].map(f => (
              <div key={f.title} className="reg-feature" style={s.featureItem}>
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
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:      { display: "flex", minHeight: "100vh", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" },
  left:      { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", padding: "40px 24px" },
  leftInner: { width: "100%", maxWidth: 440 },
  brand:     { display: "flex", alignItems: "center", gap: 12, marginBottom: 32 },
  brandName: { fontSize: 22, fontWeight: 300, color: "#1A1814", letterSpacing: "-0.02em" },
  brandIQ:   { fontWeight: 800, color: "#5B4FE8" },
  brandSub:  { fontSize: 10, fontWeight: 600, color: "#9C9890", letterSpacing: "0.12em", textTransform: "uppercase" },
  h1:        { fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 32, fontWeight: 400, color: "#1A1814", letterSpacing: "-0.01em", marginBottom: 8 },
  sub:       { fontSize: 13, color: "#5C5852", lineHeight: 1.6, marginBottom: 24, fontWeight: 300 },
  errorBox:  { background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#991B1B", marginBottom: 16 },
  row:       { display: "flex", gap: 12, marginBottom: 14 },
  terms:     { fontSize: 11, color: "#9C9890", marginTop: 12, lineHeight: 1.5, textAlign: "center" },
  footer:    { fontSize: 13, color: "#5C5852", marginTop: 16, textAlign: "center" },
  footerBack:{ fontSize: 12, color: "#9C9890", marginTop: 8, textAlign: "center" },
  link:      { color: "#5B4FE8", cursor: "pointer" },
  linkBlue:  { color: "#5B4FE8", textDecoration: "none", fontWeight: 500 },
  linkMuted: { color: "#9C9890", textDecoration: "none" },

  rightInner: { position: "relative", width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 14 },
  vzHeader:   { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  rightTitle: { fontSize: 11, fontWeight: 600, color: "#A8A29B", textTransform: "uppercase", letterSpacing: "0.08em" },
  featureItem:{ display: "flex", alignItems: "flex-start", gap: 14, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "14px 16px" },
  featureIcon:{ fontSize: 20, flexShrink: 0, marginTop: 1 },
  featureTitle:{ fontSize: 13, fontWeight: 600, color: "#E8E5DF", marginBottom: 3 },
  featureDesc: { fontSize: 12, color: "#A8A29B", lineHeight: 1.5 },
  trialNote:  { fontSize: 11, color: "#71706C", textAlign: "center", marginTop: 8 },
};