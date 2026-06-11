"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/* Synthetic BAF dossiers cycled by the right-panel AI visualization (CNDP: no real data) */
const DOSSIERS = [
  {
    id: "BAF-2026-0182", caisse: "CNOPS", montant: "12 400 MAD", acte: "C2 + NFS",
    score: 0.86, niveau: "RISQUE ÉLEVÉ", color: "#E24B4A", verdict: "Corriger avant soumission", jours: 9,
    shap: [
      { lbl: "Immatriculation invalide", w: 82 },
      { lbl: "PEC absente", w: 54 },
      { lbl: "Dossier incomplet", w: 38 },
    ],
  },
  {
    id: "BAF-2026-0197", caisse: "CNSS", montant: "3 850 MAD", acte: "K20",
    score: 0.18, niveau: "RISQUE FAIBLE", color: "#2FB47C", verdict: "Prêt à soumettre", jours: 44,
    shap: [
      { lbl: "Droits AMO actifs", w: 71 },
      { lbl: "Codage NGAP valide", w: 58 },
      { lbl: "Dossier complet", w: 46 },
    ],
  },
  {
    id: "BAF-2026-0203", caisse: "AMO-Tadamon", montant: "7 120 MAD", acte: "B40",
    score: 0.57, niveau: "RISQUE MODÉRÉ", color: "#E8A33D", verdict: "Vérifier codage NGAP", jours: 17,
    shap: [
      { lbl: "Codage NGAP incertain", w: 66 },
      { lbl: "Prescription illisible", w: 43 },
      { lbl: "Jours depuis prestation", w: 31 },
    ],
  },
];

const RING_C = 2 * Math.PI * 26; // circumference, r=26

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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  /* Refs into the right-panel visualization (mutated by GSAP, not React state) */
  const vizRef = useRef<HTMLDivElement>(null);

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
      localStorage.setItem("sihaiq_user", JSON.stringify({ name: data.full_name, role: data.role, email: email }));
      const redirect = localStorage.getItem("sihaiq_redirect") || "/dashboard";
      localStorage.removeItem("sihaiq_redirect");
      router.push(redirect);
    } catch {
      setError("Impossible de contacter le serveur. Vérifiez que le backend est actif.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = vizRef.current;
    const tweens: gsap.core.Tween[] = [];
    const timelines: gsap.core.Timeline[] = [];

    /* ---------- Left panel entrance ---------- */
    if (reduceMotion) {
      gsap.set(".login-anim", { opacity: 1, clearProps: "transform" });
    } else {
      tweens.push(gsap.fromTo(".login-anim",
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, stagger: 0.08, ease: "power2.out", delay: 0.15 }
      ));
    }

    if (!root) return () => { tweens.forEach(t => t.kill()); };

    /* ---------- Right panel: helpers to write a dossier into the DOM ---------- */
    const q = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel);
    const qa = (sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));

    const elDossierCard = q(".vz-dossier");
    const elId      = q(".vz-id");
    const elCaisse  = q(".vz-caisse");
    const elMontant = q(".vz-montant");
    const elActe    = q(".vz-acte");
    const elRingFg  = root.querySelector<SVGCircleElement>(".vz-ring-fg");
    const elScore   = q(".vz-score");
    const elVerdict = q(".vz-verdict");
    const elVerdictTxt = q(".vz-verdict-txt");
    const elNiveau  = q(".vz-niveau");
    const shapRows  = qa(".vz-shap-row");
    const lines     = qa(".vz-line-fill");
    const elJours   = q(".vz-jours");
    const elJoursWrap = q(".vz-forclusion");
    const elRejet   = q(".vz-rejet");
    const elRejetBar = q(".vz-rejet-bar");
    const elRecouv  = q(".vz-recouv");
    const elRecouvBar = q(".vz-recouv-bar");

    const applyDossier = (d: typeof DOSSIERS[number]) => {
      if (elId) elId.textContent = d.id;
      if (elCaisse) elCaisse.textContent = d.caisse;
      if (elMontant) elMontant.textContent = d.montant;
      if (elActe) elActe.textContent = "NGAP " + d.acte;
      if (elNiveau) { elNiveau.textContent = d.niveau; elNiveau.style.color = d.color; }
      if (elVerdict) { elVerdict.style.borderColor = d.color; }
      if (elVerdictTxt) { elVerdictTxt.textContent = d.verdict; }
      if (elRingFg) elRingFg.style.stroke = d.color;
      if (elScore) elScore.style.color = d.color;
      shapRows.forEach((row, i) => {
        const f = d.shap[i];
        if (!f) return;
        const lbl = row.querySelector<HTMLElement>(".vz-shap-lbl");
        const pct = row.querySelector<HTMLElement>(".vz-shap-pct");
        const fill = row.querySelector<HTMLElement>(".vz-shap-fill");
        if (lbl) lbl.textContent = f.lbl;
        if (pct) pct.textContent = f.w + "%";
        if (fill) { fill.style.width = f.w + "%"; fill.style.background = d.color; }
      });
    };

    const setRing = (v: number) => {
      if (elRingFg) elRingFg.style.strokeDashoffset = String(RING_C * (1 - v));
      if (elScore) elScore.textContent = Math.round(v * 100) + "%";
    };

    if (reduceMotion) {
      /* Static final state: first dossier fully processed, metrics at target */
      const d = DOSSIERS[0];
      applyDossier(d);
      setRing(d.score);
      gsap.set([elDossierCard, elVerdict], { opacity: 1 });
      gsap.set(lines, { scaleX: 1 });
      gsap.set(qa(".vz-shap-fill"), { scaleX: 1 });
      if (elJours) elJours.textContent = "J\u2212" + d.jours;
      if (elRejet) elRejet.textContent = "8%";
      if (elRejetBar) elRejetBar.style.width = "8%";
      if (elRecouv) elRecouv.textContent = "75.3%";
      if (elRecouvBar) elRecouvBar.style.width = "75.3%";
      return () => { tweens.forEach(t => t.kill()); };
    }

    /* ---------- One-shot metric animations (38% → 8%, 0 → 75.3%) ---------- */
    const mRejet = { v: 38 };
    tweens.push(gsap.to(mRejet, {
      v: 8, duration: 2.4, delay: 0.8, ease: "power2.inOut",
      onUpdate: () => {
        if (elRejet) elRejet.textContent = Math.round(mRejet.v) + "%";
        if (elRejetBar) elRejetBar.style.width = mRejet.v + "%";
      },
    }));
    const mRecouv = { v: 0 };
    tweens.push(gsap.to(mRecouv, {
      v: 75.3, duration: 2.4, delay: 0.8, ease: "power2.inOut",
      onUpdate: () => {
        if (elRecouv) elRecouv.textContent = mRecouv.v.toFixed(1) + "%";
        if (elRecouvBar) elRecouvBar.style.width = mRecouv.v + "%";
      },
    }));

    /* ---------- Main pipeline loop: dossier → XGBoost → SHAP → verdict ---------- */
    const scoreState = { v: 0 };
    const joursState = { v: 60 };
    const masterTl = gsap.timeline({ repeat: -1, delay: 0.5 });
    timelines.push(masterTl);

    DOSSIERS.forEach(d => {
      masterTl
        /* reset + inject data */
        .set([elDossierCard, elVerdict], { opacity: 0 })
        .set(lines, { scaleX: 0, transformOrigin: "left center" })
        .set(qa(".vz-shap-fill"), { scaleX: 0, transformOrigin: "left center" })
        .set(scoreState, { v: 0 })
        .call(() => { applyDossier(d); setRing(0); })
        /* 1 — dossier enters */
        .fromTo(elDossierCard, { x: -28, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" })
        /* 2 — flow to XGBoost, score ring fills */
        .to(lines[0], { scaleX: 1, duration: 0.35, ease: "power1.inOut" }, "+=0.15")
        .to(scoreState, {
          v: d.score, duration: 0.9, ease: "power2.out",
          onUpdate: () => setRing(scoreState.v),
        })
        /* 3 — flow to SHAP, factor bars fill */
        .to(lines[1], { scaleX: 1, duration: 0.35, ease: "power1.inOut" }, "+=0.1")
        .to(qa(".vz-shap-fill"), { scaleX: 1, duration: 0.55, stagger: 0.13, ease: "power2.out" })
        /* 4 — verdict pops, forclusion ticker counts to this dossier */
        .fromTo(elVerdict, { opacity: 0, scale: 0.85, y: 8 }, { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: "back.out(1.6)" }, "+=0.1")
        .to(joursState, {
          v: d.jours, duration: 0.7, ease: "power2.out",
          onUpdate: () => {
            if (elJours) elJours.textContent = "J\u2212" + Math.round(joursState.v);
            if (elJoursWrap) elJoursWrap.style.color = joursState.v <= 15 ? "#F2711C" : "#A8A29B";
          },
        }, "<")
        /* hold, then clear */
        .to({}, { duration: 1.6 })
        .to([elDossierCard, elVerdict], { opacity: 0, duration: 0.35, ease: "power1.in" });
    });

    return () => {
      tweens.forEach(t => t.kill());
      timelines.forEach(t => t.kill());
    };
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

        .login-anim { opacity: 0; }
        @media (prefers-reduced-motion: reduce) { .login-anim { opacity: 1; } }

        .lg-error { animation: err-shake 0.4s ease; }

        /* Floating-label fields */
        .ffield { position: relative; margin-bottom: 18px; }
        .finput {
          width: 100%; padding: 20px 14px 8px; border: 1.5px solid #E5E3DD; border-radius: 10px;
          font-size: 14px; color: #1A1814; outline: none; font-family: inherit; background: #FAFAF7;
          transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
        }
        .finput:focus { border-color: #5B4FE8; background: #fff; box-shadow: 0 0 0 4px rgba(91,79,232,0.1); }
        .flabel {
          position: absolute; left: 14px; top: 15px; font-size: 13px; color: #9C9890;
          pointer-events: none; transition: all 0.16s ease; letter-spacing: 0.01em;
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
          margin-top: 6px; box-shadow: 0 2px 14px rgba(91,79,232,0.3);
          transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
        }
        .lg-btn:hover:not(:disabled) { background: #4A3FD4; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(91,79,232,0.4); }
        .lg-btn:active:not(:disabled) { transform: translateY(0) scale(0.985); }
        .lg-btn:disabled { opacity: 0.7; cursor: default; }

        /* Right panel visualization */
        .vz-panel {
          width: 480px; background: #1A1814; display: flex; align-items: center; justify-content: center;
          padding: 40px 32px; position: relative; overflow: hidden;
        }
        .vz-panel::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse at 20% 15%, rgba(91,79,232,0.16) 0%, transparent 55%),
                      radial-gradient(ellipse at 85% 90%, rgba(242,113,28,0.1) 0%, transparent 55%);
        }
        .vz-grid {
          content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0.25;
          background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 44px 44px;
        }
        .vz-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #2FB47C; display: inline-block; animation: vz-pulse 1.8s ease infinite; }
        .vz-line-fill { transform: scaleX(0); transform-origin: left center; }
        .vz-shap-fill { transform: scaleX(0); transform-origin: left center; }
        @media (prefers-reduced-motion: reduce) {
          .vz-line-fill, .vz-shap-fill { transform: scaleX(1); }
        }
        @media (max-width: 920px) { .vz-panel { display: none; } }
      `}</style>

      <div style={s.page}>
        {/* LEFT — login form (logic unchanged) */}
        <div style={s.left}>
          <div style={s.leftInner}>
            <div style={s.brand} className="login-anim">
              <LogoMark size={40} />
              <div>
                <div style={s.brandName}>Siha<span style={s.brandIQ}>IQ</span></div>
                <div style={s.brandSub}>RCM Platform</div>
              </div>
            </div>
            <h1 style={s.h1} className="login-anim">Bon retour</h1>
            <p style={s.sub} className="login-anim">Connectez-vous pour accéder à votre tableau de bord RCM.</p>

            {error && <div style={s.errorBox} className="lg-error">{error}</div>}

            <div className="ffield login-anim">
              <input
                className="finput"
                id="login-email"
                type="email"
                placeholder=" "
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                autoComplete="email"
              />
              <label className="flabel" htmlFor="login-email">Adresse email</label>
            </div>

            <div className="ffield login-anim">
              <input
                className="finput"
                id="login-password"
                type="password"
                placeholder=" "
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                autoComplete="current-password"
              />
              <label className="flabel" htmlFor="login-password">Mot de passe</label>
            </div>

            <div className="login-anim">
              <button className="lg-btn" onClick={handleLogin} disabled={loading}>
                {loading ? "Connexion en cours..." : "Se connecter"}
              </button>
            </div>
            <div style={{ textAlign: "center", marginTop: 12 }} className="login-anim">
              <Link href="/auth/forgot-password" style={s.linkMuted}>
                Mot de passe oublié ?
              </Link>
            </div>
            <div style={s.footer} className="login-anim">
              Pas encore de compte ?{" "}
              <Link href="/auth/register" style={s.link}>Créer un compte</Link>
            </div>
            <div style={s.footerBack} className="login-anim">
              <Link href="/" style={s.linkMuted}>← Retour à l&apos;accueil</Link>
            </div>
          </div>
        </div>

        {/* RIGHT — live AI pipeline visualization */}
        <div className="vz-panel" ref={vizRef}>
          <div className="vz-grid" aria-hidden="true" />
          <div style={s.vzInner}>

            {/* Header */}
            <div style={s.vzHeader}>
              <span className="vz-live-dot" />
              <span style={s.vzHeaderTxt}>Moteur SihaIQ · analyse en temps réel</span>
            </div>

            {/* Pipeline card */}
            <div style={s.vzCard}>
              {/* Stage 1 — dossier */}
              <div className="vz-dossier" style={s.vzDossier}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span className="vz-id" style={s.vzId}>BAF-2026-0182</span>
                  <span className="vz-caisse" style={s.vzCaisse}>CNOPS</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="vz-montant" style={s.vzMontant}>12 400 MAD</span>
                  <span className="vz-acte" style={s.vzActe}>NGAP C2 + NFS</span>
                </div>
              </div>

              {/* Connector 1 */}
              <div style={s.vzLineTrack}><div className="vz-line-fill" style={{ ...s.vzLineFill, background: "#5B4FE8" }} /></div>

              {/* Stage 2 — XGBoost score */}
              <div style={s.vzStageRow}>
                <svg width="64" height="64" viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
                  <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                  <circle className="vz-ring-fg" cx="32" cy="32" r="26" fill="none" stroke="#E24B4A" strokeWidth="4"
                    strokeDasharray={RING_C} strokeDashoffset={RING_C} strokeLinecap="round"
                    transform="rotate(-90 32 32)" style={{ transition: "none" }} />
                </svg>
                <div style={{ marginLeft: -52, width: 40, textAlign: "center", pointerEvents: "none" }}>
                  <span className="vz-score" style={s.vzScore}>0%</span>
                </div>
                <div style={{ marginLeft: 24 }}>
                  <div style={s.vzStageTitle}>Score XGBoost</div>
                  <div className="vz-niveau" style={s.vzNiveau}>RISQUE ÉLEVÉ</div>
                  <div style={s.vzStageSub}>17 features · AUC 0.87</div>
                </div>
              </div>

              {/* Connector 2 */}
              <div style={s.vzLineTrack}><div className="vz-line-fill" style={{ ...s.vzLineFill, background: "#F2711C" }} /></div>

              {/* Stage 3 — SHAP */}
              <div>
                <div style={{ ...s.vzStageTitle, marginBottom: 8 }}>Explication SHAP</div>
                {[0, 1, 2].map(i => (
                  <div key={i} className="vz-shap-row" style={{ marginBottom: 7 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#A8A29B", marginBottom: 3 }}>
                      <span className="vz-shap-lbl">—</span>
                      <span className="vz-shap-pct" style={{ fontWeight: 600, color: "#D6D2CB" }}>—</span>
                    </div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
                      <div className="vz-shap-fill" style={{ width: "60%", height: "100%", background: "#E24B4A", borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Stage 4 — verdict */}
              <div className="vz-verdict" style={s.vzVerdict}>
                <span style={{ fontSize: 13 }}>→</span>
                <span className="vz-verdict-txt" style={s.vzVerdictTxt}>Corriger avant soumission</span>
              </div>
            </div>

            {/* Metrics row */}
            <div style={s.vzMetrics}>
              <div style={s.vzMetricCard}>
                <div style={s.vzMetricLbl}>Taux de rejet</div>
                <div className="vz-rejet" style={{ ...s.vzMetricVal, color: "#2FB47C" }}>38%</div>
                <div style={s.vzMetricTrack}>
                  <div className="vz-rejet-bar" style={{ ...s.vzMetricBar, width: "38%", background: "#2FB47C" }} />
                </div>
                <div style={s.vzMetricSub}>38% → 8% avec SihaIQ</div>
              </div>
              <div style={s.vzMetricCard}>
                <div style={s.vzMetricLbl}>Recouvrement</div>
                <div className="vz-recouv" style={{ ...s.vzMetricVal, color: "#7B72F0" }}>0%</div>
                <div style={s.vzMetricTrack}>
                  <div className="vz-recouv-bar" style={{ ...s.vzMetricBar, width: "0%", background: "#7B72F0" }} />
                </div>
                <div style={s.vzMetricSub}>encours récupérés</div>
              </div>
            </div>

            {/* Forclusion ticker */}
            <div className="vz-forclusion" style={s.vzForclusion}>
              <span style={{ fontSize: 12 }}>⏱</span>
              <span style={{ fontSize: 11, letterSpacing: "0.04em" }}>
                Forclusion <span className="vz-jours" style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>J−60</span> · délai légal 60 jours
              </span>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:  { display: "flex", minHeight: "100vh", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" },
  left:  { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", padding: "40px 24px" },
  leftInner: { width: "100%", maxWidth: 400 },
  brand: { display: "flex", alignItems: "center", gap: 12, marginBottom: 40 },
  brandName: { fontSize: 22, fontWeight: 300, color: "#1A1814", letterSpacing: "-0.02em" },
  brandIQ:   { fontWeight: 800, color: "#5B4FE8" },
  brandSub:  { fontSize: 10, fontWeight: 600, color: "#9C9890", letterSpacing: "0.12em", textTransform: "uppercase" },
  h1:   { fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 34, fontWeight: 400, color: "#1A1814", letterSpacing: "-0.01em", marginBottom: 8 },
  sub:  { fontSize: 14, color: "#5C5852", lineHeight: 1.6, marginBottom: 28, fontWeight: 300 },
  errorBox: { background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#991B1B", marginBottom: 16 },
  footer:     { fontSize: 13, color: "#5C5852", marginTop: 20, textAlign: "center" },
  footerBack: { fontSize: 12, color: "#9C9890", marginTop: 10, textAlign: "center" },
  link:       { color: "#5B4FE8", textDecoration: "none", fontWeight: 500 },
  linkMuted:  { color: "#9C9890", textDecoration: "none" },

  /* Right panel */
  vzInner:    { position: "relative", width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 14 },
  vzHeader:   { display: "flex", alignItems: "center", gap: 8 },
  vzHeaderTxt:{ fontSize: 11, fontWeight: 600, color: "#A8A29B", letterSpacing: "0.08em", textTransform: "uppercase" },
  vzCard:     { background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: "18px 18px 16px", backdropFilter: "blur(8px)" },
  vzDossier:  { background: "rgba(91,79,232,0.1)", border: "1px solid rgba(91,79,232,0.35)", borderRadius: 10, padding: "10px 12px" },
  vzId:       { fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: "monospace", letterSpacing: "0.02em" },
  vzCaisse:   { fontSize: 9, fontWeight: 700, color: "#7B72F0", background: "rgba(91,79,232,0.18)", padding: "2px 8px", borderRadius: 20, letterSpacing: "0.06em" },
  vzMontant:  { fontSize: 16, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" },
  vzActe:     { fontSize: 10, color: "#A8A29B", fontFamily: "monospace" },
  vzLineTrack:{ width: 2, height: 16, marginLeft: 31, background: "rgba(255,255,255,0.08)", borderRadius: 1, overflow: "hidden" },
  vzLineFill: { width: "100%", height: "100%" },
  vzStageRow: { display: "flex", alignItems: "center" },
  vzScore:    { fontSize: 13, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums" },
  vzStageTitle:{ fontSize: 11, fontWeight: 700, color: "#D6D2CB", letterSpacing: "0.05em", textTransform: "uppercase" },
  vzNiveau:   { fontSize: 12, fontWeight: 800, marginTop: 2, letterSpacing: "0.03em" },
  vzStageSub: { fontSize: 10, color: "#71706C", marginTop: 2 },
  vzVerdict:  { display: "flex", alignItems: "center", gap: 8, marginTop: 14, padding: "9px 12px", borderRadius: 9, border: "1px solid #E24B4A", background: "rgba(255,255,255,0.03)", opacity: 0 },
  vzVerdictTxt:{ fontSize: 12, fontWeight: 600, color: "#fff" },
  vzMetrics:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  vzMetricCard:{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "12px 14px" },
  vzMetricLbl:{ fontSize: 9, fontWeight: 700, color: "#71706C", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 },
  vzMetricVal:{ fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 },
  vzMetricTrack:{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, margin: "8px 0 6px", overflow: "hidden" },
  vzMetricBar:{ height: "100%", borderRadius: 2 },
  vzMetricSub:{ fontSize: 9, color: "#71706C" },
  vzForclusion:{ display: "flex", alignItems: "center", gap: 8, color: "#A8A29B", padding: "0 4px" },
};