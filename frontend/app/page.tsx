"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      setIsLoggedIn(!!localStorage.getItem("sihaiq_token"));
    });
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const footerCols: { title: string; links: { label: string; href: string }[] }[] = [
    { title: "Produit", links: [
      { label: "Fonctionnalités", href: "/#features" },
      { label: "Tarifs", href: "/#tarifs" },
      { label: "Changelog", href: "#" },
      { label: "Statut", href: "#" },
    ]},
    { title: "Conformité", links: [
      { label: "CNDP Loi 09-08", href: "/legal/cndp" },
      { label: "Loi 54-23", href: "#" },
      { label: "Confidentialité", href: "/legal/confidentialite" },
      { label: "CGU", href: "/legal/conditions" },
    ]},
    { title: "Entreprise", links: [
      { label: "À propos", href: "/#apropos" },
      { label: "Contact", href: "mailto:contact@sihaiq.ma" },
      { label: "contact@sihaiq.ma", href: "mailto:contact@sihaiq.ma" },
    ]},
  ];

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --white: #FFFFFF;
          --cream: #FAFAF8;
          --cream2: #F4F3F0;
          --border: #E8E6E1;
          --border2: #D6D3CC;
          --violet: #6366F1;
          --violet-light: #EEF2FF;
          --violet-mid: #818CF8;
          --orange: #F97316;
          --orange-light: #FFF7ED;
          --orange-mid: #FB923C;
          --text: #1C1917;
          --text2: #57534E;
          --text3: #A8A29E;
          --green: #16A34A;
          --red: #DC2626;
          --font: 'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
          --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
          --shadow-md: 0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04);
          --shadow-lg: 0 12px 40px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06);
        }
        html { scroll-behavior: smooth; }
        body { font-family: var(--font); background: var(--white); color: var(--text); -webkit-font-smoothing: antialiased; }
        @keyframes fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        .fade-up   { animation: fade-up 0.65s ease both; }
        .fade-up-1 { animation: fade-up 0.65s 0.1s ease both; }
        .fade-up-2 { animation: fade-up 0.65s 0.2s ease both; }
        .fade-up-3 { animation: fade-up 0.65s 0.3s ease both; }
        .fade-up-4 { animation: fade-up 0.65s 0.4s ease both; }
        .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; height: 60px; display: flex; align-items: center; background: rgba(255,255,255,0.8); transition: all 0.2s; }
        .nav.scrolled { background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); box-shadow: var(--shadow-sm); }
        .nav-inner { max-width: 1120px; margin: 0 auto; padding: 0 28px; width: 100%; display: flex; align-items: center; justify-content: space-between; }
        .logo { display: flex; align-items: center; gap: 9px; text-decoration: none; }
        .logo-mark { width: 30px; height: 30px; border-radius: 8px; background: var(--violet); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(99,102,241,0.3); }
        .logo-name { font-size: 16px; font-weight: 700; color: var(--text); letter-spacing: -0.02em; }
        .logo-name span { color: var(--violet); }
        .nav-links { display: flex; gap: 28px; }
        .nav-link { font-size: 13px; font-weight: 500; color: var(--text2); text-decoration: none; transition: color 0.15s; }
        .nav-link:hover { color: var(--text); }
        .nav-actions { display: flex; align-items: center; gap: 10px; }
        .nav-ghost { font-size: 13px; font-weight: 500; color: var(--text2); padding: 7px 14px; text-decoration: none; border-radius: 8px; transition: all 0.15s; }
        .nav-ghost:hover { background: var(--cream); color: var(--text); }
        .nav-cta { font-size: 13px; font-weight: 600; color: white; background: var(--violet); padding: 8px 18px; border-radius: 8px; text-decoration: none; transition: all 0.15s; box-shadow: 0 2px 8px rgba(99,102,241,0.25); }
        .nav-cta:hover { background: #4F46E5; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(99,102,241,0.35); }
        .nav-dash { font-size: 13px; font-weight: 500; color: var(--green); background: #DCFCE7; padding: 7px 14px; border-radius: 8px; text-decoration: none; }
        .btn-primary { font-size: 15px; font-weight: 600; color: white; background: var(--violet); padding: 12px 26px; border-radius: 10px; text-decoration: none; display: inline-flex; align-items: center; gap: 7px; box-shadow: 0 2px 12px rgba(99,102,241,0.3); transition: all 0.2s; border: none; cursor: pointer; font-family: var(--font); }
        .btn-primary:hover { background: #4F46E5; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(99,102,241,0.4); }
        .btn-secondary { font-size: 15px; font-weight: 500; color: var(--text2); background: white; padding: 12px 26px; border-radius: 10px; text-decoration: none; display: inline-flex; align-items: center; gap: 7px; border: 1.5px solid var(--border); transition: all 0.2s; }
        .btn-secondary:hover { border-color: var(--border2); color: var(--text); background: var(--cream); }
        .btn-orange { font-size: 15px; font-weight: 600; color: white; background: var(--orange); padding: 12px 26px; border-radius: 10px; text-decoration: none; display: inline-flex; align-items: center; gap: 7px; box-shadow: 0 2px 12px rgba(249,115,22,0.3); transition: all 0.2s; border: none; cursor: pointer; font-family: var(--font); }
        .btn-orange:hover { background: #EA6C0A; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(249,115,22,0.4); }
        .hero { padding: 140px 28px 100px; background: var(--white); position: relative; overflow: hidden; }
        .hero-bg { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 80% 50% at 20% 0%, rgba(99,102,241,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(249,115,22,0.05) 0%, transparent 60%); }
        .hero-inner { max-width: 1120px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; position: relative; }
        .hero-h1 { font-size: 54px; font-weight: 800; letter-spacing: -0.04em; line-height: 1.1; color: var(--text); margin-bottom: 20px; }
        .hero-h1 .violet { color: var(--violet); }
        .hero-h1 .orange { color: var(--orange); }
        .hero-sub { font-size: 17px; color: var(--text2); line-height: 1.75; margin-bottom: 36px; max-width: 460px; font-weight: 400; }
        .hero-ctas { display: flex; gap: 12px; margin-bottom: 52px; flex-wrap: wrap; }
        .hero-proof { display: flex; align-items: center; gap: 20px; padding-top: 20px; border-top: 1px solid var(--border); }
        .proof-item { display: flex; align-items: center; gap: 7px; }
        .proof-num { font-size: 20px; font-weight: 700; letter-spacing: -0.03em; color: var(--text); }
        .proof-lbl { font-size: 12px; color: var(--text3); line-height: 1.3; }
        .proof-sep { color: var(--border2); font-size: 20px; }
        .hero-visual { position: relative; }
        .hero-card { background: white; border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow-lg); overflow: hidden; animation: float 6s ease-in-out infinite; }
        .hero-card-bar { background: var(--cream); padding: 10px 14px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 7px; }
        .dot { width: 10px; height: 10px; border-radius: 50%; }
        .hero-card-url { font-size: 11px; color: var(--text3); margin: 0 auto; background: white; padding: 3px 12px; border-radius: 5px; border: 1px solid var(--border); }
        .hero-badge-float { position: absolute; background: white; border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; box-shadow: var(--shadow-md); font-size: 12px; }
        .section { padding: 96px 28px; }
        .section-cream { background: var(--cream); }
        .section-inner { max-width: 1120px; margin: 0 auto; }
        .section-eyebrow { font-size: 12px; font-weight: 700; color: var(--violet); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px; }
        .section-eyebrow-orange { color: var(--orange); }
        .section-h2 { font-size: 38px; font-weight: 800; letter-spacing: -0.03em; color: var(--text); line-height: 1.2; margin-bottom: 14px; }
        .section-sub { font-size: 16px; color: var(--text2); line-height: 1.7; max-width: 520px; }
        .stats-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 1px; background: var(--border); border-radius: 14px; overflow: hidden; margin-top: 48px; border: 1px solid var(--border); }
        .stat-cell { background: white; padding: 28px 24px; }
        .stat-cell:hover { background: var(--cream); }
        .stat-num { font-size: 38px; font-weight: 800; letter-spacing: -0.04em; margin-bottom: 4px; }
        .stat-lbl { font-size: 13px; color: var(--text2); margin-bottom: 6px; font-weight: 500; }
        .stat-src { font-size: 11px; color: var(--text3); }
        .features-bento { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        .feat { background: white; border: 1px solid var(--border); border-radius: 14px; padding: 28px; transition: all 0.2s; }
        .feat:hover { border-color: var(--violet); box-shadow: 0 4px 20px rgba(99,102,241,0.08); transform: translateY(-2px); }
        .feat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 16px; }
        .feat-icon-violet { background: var(--violet-light); }
        .feat-icon-orange { background: var(--orange-light); }
        .feat-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 8px; letter-spacing: -0.01em; }
        .feat-desc { font-size: 13px; color: var(--text2); line-height: 1.7; }
        .feat-tag { display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px; margin-top: 12px; letter-spacing: 0.04em; }
        .steps { display: grid; grid-template-columns: repeat(4,1fr); gap: 0; position: relative; }
        .steps::before { content: ''; position: absolute; top: 28px; left: 10%; right: 10%; height: 1px; background: linear-gradient(90deg, var(--violet-light), var(--violet-light) 33%, var(--orange-light) 66%, var(--orange-light)); z-index: 0; }
        .step { padding: 0 20px; text-align: center; position: relative; z-index: 1; }
        .step-num { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; margin: 0 auto 18px; border: 2px solid; }
        .step-title { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
        .step-desc { font-size: 13px; color: var(--text2); line-height: 1.6; }
        .compare-wrap { border: 1px solid var(--border); border-radius: 14px; overflow: hidden; background: white; box-shadow: var(--shadow-sm); }
        .compare-table { width: 100%; border-collapse: collapse; }
        .compare-table th { font-size: 12px; font-weight: 600; padding: 14px 18px; text-align: left; background: var(--cream); border-bottom: 1px solid var(--border); color: var(--text2); }
        .compare-table th.hl { color: var(--violet); background: var(--violet-light); }
        .compare-table td { font-size: 13px; padding: 13px 18px; border-bottom: 1px solid var(--border); color: var(--text2); }
        .compare-table tr:last-child td { border-bottom: none; }
        .compare-table td.hl { background: rgba(99,102,241,0.02); color: var(--text); font-weight: 500; }
        .cy { color: var(--green); font-weight: 600; }
        .cn { color: var(--text3); }
        .cp { color: var(--orange); }
        .testimonial { background: white; border: 1px solid var(--border); border-radius: 16px; padding: 36px; box-shadow: var(--shadow-sm); }
        .testimonial-quote { font-size: 20px; font-weight: 500; color: var(--text); line-height: 1.6; letter-spacing: -0.01em; margin-bottom: 24px; font-style: italic; }
        .testimonial-mark { font-size: 64px; color: var(--violet); opacity: 0.15; line-height: 0.5; margin-bottom: 16px; font-family: Georgia,serif; }
        .testimonial-author { display: flex; align-items: center; gap: 12px; }
        .testimonial-avatar { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg,var(--violet),var(--violet-mid)); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: white; }
        .testimonial-name { font-size: 14px; font-weight: 600; color: var(--text); }
        .testimonial-role { font-size: 12px; color: var(--text3); }
        .plan-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
        .plan-box { border: 1.5px solid var(--border); border-radius: 14px; padding: 30px; background: white; display: flex; flex-direction: column; transition: all 0.2s; }
        .plan-box:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .plan-box.popular { border-color: var(--violet); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .plan-badge { font-size: 10px; font-weight: 700; color: var(--violet); background: var(--violet-light); padding: 3px 10px; border-radius: 20px; display: inline-block; margin-bottom: 14px; letter-spacing: 0.06em; }
        .plan-name { font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 6px; letter-spacing: -0.01em; }
        .plan-price-row { display: flex; align-items: baseline; gap: 5px; margin-bottom: 6px; }
        .plan-price { font-size: 36px; font-weight: 800; color: var(--text); letter-spacing: -0.04em; }
        .plan-unit { font-size: 13px; color: var(--text3); font-weight: 400; }
        .plan-desc { font-size: 13px; color: var(--text3); margin-bottom: 22px; padding-bottom: 22px; border-bottom: 1px solid var(--border); }
        .plan-feat-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 11px; }
        .plan-check { color: var(--green); font-weight: 700; flex-shrink: 0; font-size: 13px; }
        .plan-feat-text { font-size: 13px; color: var(--text2); line-height: 1.4; }
        .plan-cta-btn { margin-top: auto; padding-top: 22px; display: block; text-align: center; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 600; text-decoration: none; transition: all 0.2s; cursor: pointer; font-family: var(--font); border: none; }
        .plan-cta-outline { background: white; color: var(--violet); border: 1.5px solid var(--violet); }
        .plan-cta-outline:hover { background: var(--violet-light); }
        .plan-cta-fill { background: var(--violet); color: white; box-shadow: 0 2px 10px rgba(99,102,241,0.3); }
        .plan-cta-fill:hover { background: #4F46E5; box-shadow: 0 4px 16px rgba(99,102,241,0.4); }
        .cta-final { background: linear-gradient(135deg, #4F46E5 0%, #6366F1 40%, #818CF8 100%); padding: 100px 28px; text-align: center; position: relative; overflow: hidden; }
        .cta-final::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, transparent 60%); pointer-events: none; }
        .footer { background: var(--text); padding: 56px 28px 32px; }
        .footer-inner { max-width: 1120px; margin: 0 auto; }
        .footer-top { display: flex; justify-content: space-between; gap: 48px; margin-bottom: 48px; flex-wrap: wrap; }
        .footer-brand-name { font-size: 16px; font-weight: 700; color: white; margin-bottom: 10px; letter-spacing: -0.02em; }
        .footer-brand-desc { font-size: 13px; color: #71717A; line-height: 1.65; max-width: 220px; }
        .footer-cols { display: flex; gap: 48px; flex-wrap: wrap; }
        .footer-col-title { font-size: 11px; font-weight: 600; color: #52525B; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 14px; }
        .footer-link { font-size: 13px; color: #71717A; display: block; margin-bottom: 10px; text-decoration: none; transition: color 0.15s; cursor: pointer; }
        .footer-link:hover { color: #A1A1AA; }
        .footer-copy { font-size: 12px; color: #52525B; }
        .live-dot { width: 6px; height: 6px; border-radius: 50%; background: #22C55E; animation: pulse 2s ease infinite; display: inline-block; }
      `}</style>

      {/* ── NAV ── */}
      <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-inner">
          <Link href="/" className="logo">
            <div className="logo-mark">
              <svg width="17" height="17" viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="6" fill="white"/>
                <circle cx="22" cy="22" r="2.8" fill="#6366F1"/>
                <line x1="22" y1="7" x2="22" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="22" y1="30" x2="22" y2="37" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="7" y1="22" x2="14" y2="22" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="30" y1="22" x2="37" y2="22" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="logo-name">Siha<span>IQ</span></span>
          </Link>
          <div className="nav-links">
            <a href="#features" className="nav-link">Fonctionnalités</a>
            <a href="#tarifs" className="nav-link">Tarifs</a>
            <a href="#apropos" className="nav-link">À propos</a>
            <a href="mailto:contact@sihaiq.ma" className="nav-link">Contact</a>
          </div>
          <div className="nav-actions">
            <a href="/auth/login" className="nav-ghost">Connexion</a>
            {isLoggedIn && <a href="/dashboard" className="nav-dash">Tableau de bord →</a>}
            <a href="/auth/register" className="nav-cta">Démarrer gratuitement</a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg"/>
        <div className="hero-inner">
          <div className="fade-up">
            <h1 className="hero-h1">
              Récupérez vos<br/>
              <span className="orange">encours rejetés</span><br/>
              avec l&apos;<span className="violet">IA</span>
            </h1>
            <p className="hero-sub">
              SihaIQ prédit les rejets CNOPS · CNSS · AMO avant soumission,
              explique chaque décision en français, et priorise automatiquement
              la file de travail de vos agents BAF.
            </p>
            <div className="hero-ctas">
              <a href="/auth/register" className="btn-primary">
                Démarrer gratuitement
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
              <a href="#features" className="btn-secondary">Voir la démonstration →</a>
            </div>
            <div className="hero-proof">
              {[
                { num: "88%",  lbl: "précision IA",       color: "var(--violet)" },
                { num: "−62%", lbl: "taux de rejet",      color: "var(--orange)" },
                { num: "60j",  lbl: "forclusion auto",    color: "var(--text)" },
                { num: "0",    lbl: "concurrent direct",  color: "var(--text)" },
              ].map((p, i) => (
                <span key={i} style={{ display: "contents" }}>
                  {i > 0 && <span className="proof-sep">·</span>}
                  <div className="proof-item">
                    <span className="proof-num" style={{ color: p.color }}>{p.num}</span>
                    <span className="proof-lbl">{p.lbl}</span>
                  </div>
                </span>
              ))}
            </div>
          </div>

          {/* Dashboard card visual */}
          <div className="hero-visual fade-up-2">
            <div className="hero-card">
              <div className="hero-card-bar">
                <div className="dot" style={{ background: "#FF5F57" }}/>
                <div className="dot" style={{ background: "#FFBD2E" }}/>
                <div className="dot" style={{ background: "#28C840" }}/>
                <div className="hero-card-url">app.sihaiq.ma/dashboard</div>
              </div>
              <svg viewBox="0 0 580 380" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", display: "block" }}>
                <rect width="140" height="380" fill="#FAFAF8"/>
                <rect x="0" y="0" width="140" height="380" stroke="#E8E6E1" strokeWidth="0.5" fill="none"/>
                <rect x="8" y="10" width="22" height="22" rx="6" fill="#6366F1"/>
                <text x="38" y="24" fontFamily="system-ui" fontSize="11" fontWeight="700" fill="#1C1917">SihaIQ</text>
                <text x="38" y="34" fontFamily="system-ui" fontSize="8" fill="#A8A29E">RCM Platform</text>
                {[
                  ["📊","Tableau de bord",true,50],
                  ["📋","Dossiers BAF",false,78],
                  ["🧠","Prédiction IA",false,106],
                  ["📈","Performance",false,134],
                  ["⚠️","Forclusion",false,162],
                  ["💰","Encours A/R",false,190],
                  ["📜","Audit",false,218],
                  ["⚙️","Paramètres",false,246],
                ].map(([icon,label,active,y]) => (
                  <g key={y as number}>
                    {active && <rect x="6" y={(y as number)-2} width="128" height="22" rx="6" fill="#EEF2FF"/>}
                    <text x="16" y={(y as number)+13} fontFamily="system-ui" fontSize="10" fill={active ? "#6366F1" : "#A8A29E"}>{icon as string} {label as string}</text>
                  </g>
                ))}
                <rect x="140" y="0" width="440" height="40" fill="white" stroke="#E8E6E1" strokeWidth="0.5"/>
                <text x="156" y="16" fontFamily="system-ui" fontSize="11" fontWeight="600" fill="#1C1917">Tableau de bord</text>
                <text x="156" y="30" fontFamily="system-ui" fontSize="8" fill="#A8A29E">Mohamed Semsili · 25 mai 2026</text>
                <rect x="470" y="8" width="96" height="24" rx="7" fill="#6366F1"/>
                <text x="518" y="24" textAnchor="middle" fontFamily="system-ui" fontSize="9" fontWeight="600" fill="white">+ Nouveau dossier</text>
                {[
                  ["Total","124","#6366F1","portefeuille actif"],
                  ["En attente","18","#F97316","31% du total"],
                  ["Rejet","31.2%","#DC2626","ce mois"],
                  ["Encours","487K MAD","#8B5CF6","MAD facturés"],
                ].map(([lbl,val,color,sub],i) => (
                  <g key={i}>
                    <rect x={148+i*110} y="48" width="102" height="60" rx="8" fill="white" stroke="#E8E6E1" strokeWidth="0.5"/>
                    <rect x={148+i*110} y="48" width="102" height="3" rx="2" fill={color as string}/>
                    <text x={158+i*110} y="64" fontFamily="system-ui" fontSize="7" fill="#A8A29E">{(lbl as string).toUpperCase()}</text>
                    <text x={158+i*110} y="88" fontFamily="system-ui" fontSize="18" fontWeight="700" fill={color as string}>{val as string}</text>
                    <text x={158+i*110} y="100" fontFamily="system-ui" fontSize="7" fill="#A8A29E">{sub as string}</text>
                  </g>
                ))}
                <rect x="148" y="118" width="200" height="130" rx="8" fill="white" stroke="#E8E6E1" strokeWidth="0.5"/>
                <text x="162" y="135" fontFamily="system-ui" fontSize="9" fontWeight="600" fill="#1C1917">Répartition par caisse</text>
                {[["CNOPS","#6366F1",0.19],["CNSS","#22C55E",0.25],["AMO","#F97316",0.38],["AMO-Tadamon","#8B5CF6",0.18]].map(([n,c,p],i) => (
                  <g key={i}>
                    <circle cx="162" cy={152+i*22} r="4" fill={c as string}/>
                    <text x="172" y={156+i*22} fontFamily="system-ui" fontSize="9" fill="#57534E">{n as string}</text>
                    <rect x="236" y={148+i*22} width={Math.round((p as number)*100)} height="7" rx="3" fill={c as string} opacity="0.7"/>
                    <text x="342" y={156+i*22} fontFamily="system-ui" fontSize="8" fill="#A8A29E">{Math.round((p as number)*100)}%</text>
                  </g>
                ))}
                <rect x="148" y="258" width="200" height="48" rx="8" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="0.5"/>
                <text x="162" y="275" fontFamily="system-ui" fontSize="7" fontWeight="600" fill="#6366F1">SCORE RISQUE IA MOYEN</text>
                <text x="162" y="294" fontFamily="system-ui" fontSize="20" fontWeight="700" fill="#6366F1">62%</text>
                <text x="196" y="295" fontFamily="system-ui" fontSize="8" fill="#818CF8">XGBoost · portefeuille actuel</text>
                <rect x="358" y="118" width="220" height="90" rx="8" fill="white" stroke="#E8E6E1" strokeWidth="0.5"/>
                <text x="372" y="135" fontFamily="system-ui" fontSize="9" fontWeight="600" fill="#1C1917">Résultats du mois</text>
                {[["Approuvés","86","#16A34A","#DCFCE7"],["Rejetés","38","#DC2626","#FEE2E2"],["En attente","18","#F97316","#FFF7ED"]].map(([l,v,c,bg],i) => (
                  <g key={i}>
                    <rect x={366+i*70} y="146" width="62" height="50" rx="7" fill={bg as string}/>
                    <text x={397+i*70} y="174" textAnchor="middle" fontFamily="system-ui" fontSize="18" fontWeight="700" fill={c as string}>{v as string}</text>
                    <text x={397+i*70} y="188" textAnchor="middle" fontFamily="system-ui" fontSize="7" fill={c as string}>{l as string}</text>
                  </g>
                ))}
                <rect x="358" y="218" width="220" height="38" rx="8" fill="#FFF7ED" stroke="#FED7AA" strokeWidth="0.5"/>
                <text x="370" y="233" fontFamily="system-ui" fontSize="8" fontWeight="600" fill="#C2410C">⚠  ALERTE FORCLUSION</text>
                <text x="370" y="248" fontFamily="system-ui" fontSize="8" fill="#F97316">3 dossiers · J−3 · 34 200 MAD à risque</text>
                <rect x="148" y="316" width="430" height="56" rx="8" fill="white" stroke="#E8E6E1" strokeWidth="0.5"/>
                <rect x="148" y="316" width="430" height="20" rx="8" fill="#FAFAF8"/>
                <rect x="148" y="328" width="430" height="8" fill="#FAFAF8"/>
                {["N° DOSSIER","PATIENT","CAISSE","MONTANT","RISQUE IA","STATUT"].map((h,i) => (
                  <text key={i} x={160+i*72} y="330" fontFamily="system-ui" fontSize="7" fontWeight="600" fill="#A8A29E">{h}</text>
                ))}
                {[["CLM-2026-001","Y. Benali","AMO","1 500 MAD","MODÉRÉ","En attente"],["CLM-2026-004","F. Idrissi","CNOPS","5 500 MAD","ÉLEVÉ","Rejeté"]].map((row,i) => (
                  <g key={i}>
                    {i===1 && <rect x="148" y={338+i*16} width="430" height="16" fill="#FAFAF8"/>}
                    {row.map((cell,j) => (
                      <text key={j} x={160+j*72} y={349+i*16} fontFamily={j===0?"monospace":"system-ui"} fontSize="8" fill={j===4?(cell==="ÉLEVÉ"?"#DC2626":"#F97316"):j===5?(cell==="Rejeté"?"#DC2626":cell==="Approuvé"?"#16A34A":"#F97316"):"#57534E"}>{cell}</text>
                    ))}
                  </g>
                ))}
              </svg>
            </div>
            <div className="hero-badge-float" style={{ top: -20, right: -20, color: "#16A34A" }}>
              <div style={{ fontSize: 11, fontWeight: 600 }}>✓ Dossier approuvé</div>
              <div style={{ fontSize: 10, color: "#A8A29E", marginTop: 2 }}>CLM-2026-003 · CNSS · 4 800 MAD</div>
            </div>
            <div className="hero-badge-float" style={{ bottom: 40, left: -24, color: "#DC2626" }}>
              <div style={{ fontSize: 11, fontWeight: 600 }}>⚠ Risque ÉLEVÉ détecté</div>
              <div style={{ fontSize: 10, color: "#A8A29E", marginTop: 2 }}>PEC manquante · acte K50</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="section section-cream" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="section-inner">
          <div className="section-eyebrow section-eyebrow-orange fade-up">Le problème</div>
          <h2 className="section-h2 fade-up-1">48 millions de MAD rejetés<br/>chaque jour au Maroc</h2>
          <p className="section-sub fade-up-2" style={{ marginTop: 12 }}>
            34 à 38% des dossiers BAF des hôpitaux privés marocains sont rejetés.
            90% de ces rejets sont évitables avec les bons contrôles avant soumission.
          </p>
          <div className="stats-row fade-up-3">
            {[
              { num: "110 000", lbl: "dossiers CNSS / jour",     src: "Source · DG Hassan Boubrik, Parlement Mars 2025", color: "var(--violet)" },
              { num: "34–38%",  lbl: "taux de rejet moyen BAF",  src: "Cliniques privées marocaines",                   color: "var(--orange)" },
              { num: "60 jours",lbl: "délai légal forclusion",   src: "Code Sécurité Sociale marocain",                 color: "#DC2626" },
              { num: "400+",    lbl: "polycliniques cibles",     src: "Marché Akdital et indépendants",                 color: "var(--text)" },
            ].map(s => (
              <div key={s.lbl} className="stat-cell">
                <div className="stat-num" style={{ color: s.color }}>{s.num}</div>
                <div className="stat-lbl">{s.lbl}</div>
                <div className="stat-src">{s.src}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="section" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="section-inner">
          <div style={{ marginBottom: 48 }}>
            <div className="section-eyebrow fade-up">Fonctionnalités</div>
            <h2 className="section-h2 fade-up-1">Tout ce dont votre équipe BAF a besoin</h2>
            <p className="section-sub fade-up-2" style={{ marginTop: 12 }}>
              Du dossier brut au recouvrement optimisé. Chaque module s&apos;intègre progressivement dans votre workflow existant.
            </p>
          </div>
          <div className="features-bento fade-up-2">
            {[
              { icon: "🧠", iconBg: "feat-icon-violet", title: "Prédiction XGBoost",      desc: "17 features extraites du référentiel NGAP analysées en temps réel. AUC 0.87 sur données BAF marocaines. Score de risque ÉLEVÉ / MODÉRÉ / FAIBLE par dossier.",                                               tag: "IA · Machine Learning",    tagColor: "color:var(--violet);background:var(--violet-light)" },
              { icon: "💡", iconBg: "feat-icon-orange", title: "SHAP Explicabilité",      desc: "TreeExplainer génère les 3 premiers facteurs de rejet en français avec des recommandations d'action concrètes. Zéro boîte noire pour vos agents BAF.",                                                        tag: "Interprétabilité",         tagColor: "color:var(--orange);background:var(--orange-light)" },
              { icon: "📋", iconBg: "feat-icon-violet", title: "File de travail K-Means", desc: "4 clusters de rejet identifiés automatiquement. Worklist prioritaire selon risque × valeur financière × urgence forclusion. Chaque agent sait quoi faire.",                                                     tag: "Clustering · Priorité",    tagColor: "color:var(--violet);background:var(--violet-light)" },
              { icon: "⏰", iconBg: "feat-icon-orange", title: "Forclusion Engine",       desc: "Buckets marocains : 0–30, 31–45, 46–55, 56–60 jours, Forclos. Alertes J-15, J-7, J-3, J-1. Zéro perte légale évitable après le délai de 60 jours.",                                                          tag: "Alertes automatiques",     tagColor: "color:var(--orange);background:var(--orange-light)" },
              { icon: "🔄", iconBg: "feat-icon-violet", title: "Feedback Loop ML",        desc: "Chaque Approuvé / Rejeté saisi alimente la table training_feedback. FLAML déclenche le réentraînement à 500 labels. Le modèle s'améliore avec vos données réelles.",                                           tag: "AutoML · FLAML",           tagColor: "color:var(--violet);background:var(--violet-light)" },
              { icon: "🔒", iconBg: "feat-icon-orange", title: "CNDP Loi 09-08",          desc: "Aucune donnée patient réelle dans l'entraînement. Données synthétiques certifiées. Journal d'audit immuable. Multi-tenant avec Row Level Security PostgreSQL.",                                                  tag: "Conformité marocaine",     tagColor: "color:var(--orange);background:var(--orange-light)" },
            ].map(f => (
              <div key={f.title} className="feat">
                <div className={`feat-icon ${f.iconBg}`}>{f.icon}</div>
                <div className="feat-title">{f.title}</div>
                <div className="feat-desc">{f.desc}</div>
                <div className="feat-tag" style={Object.fromEntries(f.tagColor.split(";").filter(Boolean).map(s => { const [k,v]=s.split(":"); return [k.trim(),v.trim()]; }))}>{f.tag}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section section-cream" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="section-inner">
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div className="section-eyebrow">Comment ça marche</div>
            <h2 className="section-h2" style={{ margin: "10px auto 0" }}>De la saisie BAF au recouvrement</h2>
          </div>
          <div className="steps">
            {[
              { num: "01", icon: "📋", title: "Saisie du dossier",      desc: "L'agent BAF crée le dossier ou importe un CSV. Patient, caisse, codes NGAP enregistrés.",                    color: "var(--violet)", bg: "var(--violet-light)" },
              { num: "02", icon: "🧠", title: "Analyse IA instantanée", desc: "XGBoost calcule le score en temps réel. SHAP explique les causes en français.",                              color: "var(--violet)", bg: "var(--violet-light)" },
              { num: "03", icon: "⚡", title: "Action corrective",      desc: "K-Means priorise la worklist. L'agent corrige les anomalies avant soumission.",                              color: "var(--orange)", bg: "var(--orange-light)" },
              { num: "04", icon: "💰", title: "Encours récupéré",       desc: "Dossier approuvé au premier envoi. Le résultat améliore les futures prédictions.",                           color: "var(--orange)", bg: "var(--orange-light)" },
            ].map(step => (
              <div key={step.num} className="step">
                <div className="step-num" style={{ background: step.bg, borderColor: step.bg, color: step.color }}>{step.icon}</div>
                <div className="step-title">{step.title}</div>
                <div className="step-desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="section" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="section-inner">
          <div style={{ marginBottom: 40 }}>
            <div className="section-eyebrow">Positionnement</div>
            <h2 className="section-h2" style={{ marginTop: 10 }}>SihaIQ vs les alternatives</h2>
          </div>
          <div className="compare-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Fonctionnalité</th>
                  <th className="hl" style={{ width: "18%", textAlign: "center" }}>✦ SihaIQ</th>
                  <th style={{ width: "18%", textAlign: "center" }}>Excel manuel</th>
                  <th style={{ width: "18%", textAlign: "center" }}>Waystar (US)</th>
                  <th style={{ width: "18%", textAlign: "center" }}>MegaClaim</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Prédiction IA rejet BAF",     "✓","✗","✓ CPT/ICD seulement","~ Marketing uniquement"],
                  ["Référentiel NGAP marocain",   "✓","Partiel","✗","✓"],
                  ["Explicabilité SHAP française","✓","✗","✗","✗"],
                  ["Forclusion 60j automatique",  "✓","Manuel","✗","Partiel"],
                  ["Conformité CNDP Loi 09-08",   "✓","N/A","✗ HIPAA","Partiel"],
                  ["Feedback loop ML",            "✓","✗","✓","✗"],
                  ["Prix accessible",             "2–12K MAD/m","~0 (temps)","$50K+/an","30K MAD one-shot"],
                ].map(([feat,...cells]) => (
                  <tr key={feat as string}>
                    <td>{feat as string}</td>
                    {(cells as string[]).map((cell, i) => (
                      <td key={i} className={i===0?"hl":""} style={{ textAlign: "center" }}>
                        <span className={cell==="✓"||cell==="✓ CPT/ICD seulement"?"cy":cell==="✗"||cell==="✗ HIPAA"?"cn":"cp"}>{cell}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ── */}
      <section className="section section-cream" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="section-inner" style={{ maxWidth: 720 }}>
          <div className="testimonial">
            <div className="testimonial-mark">&ldquo;</div>
            <div className="testimonial-quote">
              SihaIQ a identifié 74 580 MAD d&apos;encours récupérables dans notre portefeuille.
              En trois semaines, notre taux de rejet CNOPS est passé de 38% à 14%.
              Les explications SHAP en français ont transformé le travail quotidien de nos agents BAF.
            </div>
            <div className="testimonial-author">
              <div className="testimonial-avatar">HM</div>
              <div>
                <div className="testimonial-name">Hamid M.</div>
                <div className="testimonial-role">Directeur Administratif et Financier · Polyclinique privée · Casablanca</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="tarifs" className="section" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="section-inner">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="section-eyebrow">Tarifs</div>
            <h2 className="section-h2" style={{ marginTop: 10 }}>Simple. Transparent. Basé sur la valeur.</h2>
            <p className="section-sub" style={{ margin: "12px auto 0" }}>
              Pas de frais cachés. Pas d&apos;engagement annuel obligatoire. Annulable à tout moment.
            </p>
          </div>
          <div className="plan-row">
            {[
              { name: "Starter",          price: "2 000",  desc: "Petites cliniques · jusqu'à 200 dossiers / mois",  features: ["Prédiction IA illimitée","Alertes forclusion","Tableau de bord KPIs","1 utilisateur","Support email"],                                                       popular: false, cta: "Commencer",           ctaClass: "plan-cta-outline" },
              { name: "Clinique",         price: "6 000",  desc: "Polycliniques · jusqu'à 1 000 dossiers / mois",    features: ["Tout Starter inclus","Dashboard financier complet","File de travail IA","5 utilisateurs + RBAC","Export PDF et Excel","Support prioritaire"],               popular: true,  cta: "Démarrer gratuitement",ctaClass: "plan-cta-fill"    },
              { name: "Groupe hospitalier",price: "12 000", desc: "Groupes Akdital · réseaux multi-sites",           features: ["Tout Clinique inclus","Multi-établissements","Modèle IA dédié par site","Utilisateurs illimités","Intégration HIS sur mesure","Account manager dédié"],    popular: false, cta: "Nous contacter",      ctaClass: "plan-cta-outline" },
            ].map(p => (
              <div key={p.name} className={`plan-box ${p.popular ? "popular" : ""}`}>
                {p.popular && <div className="plan-badge">RECOMMANDÉ</div>}
                <div className="plan-name">{p.name}</div>
                <div className="plan-price-row">
                  <span className="plan-price">{p.price}</span>
                  <span className="plan-unit">MAD / mois</span>
                </div>
                <div className="plan-desc">{p.desc}</div>
                {p.features.map(f => (
                  <div key={f} className="plan-feat-row">
                    <span className="plan-check">✓</span>
                    <span className="plan-feat-text">{f}</span>
                  </div>
                ))}
                <a href="/auth/register" className={`plan-cta-btn ${p.ctaClass}`}>{p.cta} →</a>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", fontSize: 13, color: "var(--text3)", marginTop: 20 }}>
            + Couche performance disponible : 3–5% des encours récupérés au-delà du seuil · sur demande
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-final">
        <div style={{ maxWidth: 560, margin: "0 auto", position: "relative" }}>
          <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.04em", color: "white", marginBottom: 18, lineHeight: 1.15 }}>
            Prêt à récupérer<br/>vos encours ?
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", marginBottom: 36, lineHeight: 1.7 }}>
            Démarrez en moins de 5 minutes. Vos premières prédictions IA en moins d&apos;une heure.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/auth/register" className="btn-orange" style={{ fontSize: 15, padding: "13px 30px" }}>
              Créer un compte gratuit →
            </a>
            <a href="mailto:contact@sihaiq.ma" style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.8)", padding: "13px 24px", border: "1.5px solid rgba(255,255,255,0.2)", borderRadius: 10, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              Parler à un expert
            </a>
          </div>
          <div style={{ marginTop: 22, display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            {["Aucune CB requise","Annulable à tout moment","Support en français"].map(t => (
              <span key={t} style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "rgba(255,255,255,0.7)" }}>✓</span>{t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div className="footer-brand-name">Siha<span style={{ color: "#818CF8" }}>IQ</span> RCM</div>
              <div className="footer-brand-desc">
                Intelligence artificielle pour le Revenue Cycle Management des hôpitaux privés marocains.
                CNOPS · CNSS · AMO · AMO-Tadamon.
              </div>
            </div>
            <div className="footer-cols">
              {footerCols.map(col => (
                <div key={col.title}>
                  <div className="footer-col-title">{col.title}</div>
                  {col.links.map(l => (
                    <a key={l.label} href={l.href} className="footer-link">{l.label}</a>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid #27272A", paddingTop: 20, marginTop: 8, display: "flex", flexWrap: "wrap", gap: "12px 24px", alignItems: "center" }}>
            <span className="footer-copy">© 2026 SihaIQ · Casablanca, Maroc · Tous droits réservés</span>
            {[
              { label: "Conditions d'utilisation",    href: "/legal/conditions"     },
              { label: "Politique de confidentialité",href: "/legal/confidentialite"},
              { label: "Conformité CNDP",             href: "/legal/cndp"           },
              { label: "Accessibilité",               href: "/legal/accessibilite"  },
              { label: "Plan du site",                href: "/legal/sitemap"        },
            ].map(l => (
              <a key={l.label} href={l.href} style={{ fontSize: 12, color: "#52525B", textDecoration: "none", transition: "color 0.15s" }}
                onMouseOver={e => (e.currentTarget.style.color = "#A1A1AA")}
                onMouseOut={e  => (e.currentTarget.style.color = "#52525B")}
              >{l.label}</a>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}