"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeModule, setActiveModule] = useState<"baf"|"compta">("baf");

  useEffect(() => {
    Promise.resolve().then(() => setIsLoggedIn(!!localStorage.getItem("sihaiq_token")));
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const footerCols: { title: string; links: { label: string; href: string }[] }[] = [
    { title: "Produit", links: [
      { label: "Gestion BAF & RCM", href: "/#baf" },
      { label: "Comptabilité hospitalière", href: "/#compta" },
      { label: "Tarifs", href: "/#tarifs" },
      { label: "Changelog", href: "#" },
    ]},
    { title: "Conformité", links: [
      { label: "CNDP Loi 09-08", href: "/legal/cndp" },
      { label: "Loi 54-23", href: "#" },
      { label: "Confidentialité", href: "/legal/confidentialite" },
      { label: "CGU", href: "/legal/conditions" },
    ]},
    { title: "Entreprise", links: [
      { label: "À propos", href: "#" },
      { label: "Contact", href: "mailto:contact@sihaiq.ma" },
      { label: "contact@sihaiq.ma", href: "mailto:contact@sihaiq.ma" },
    ]},
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --white: #FFFFFF;
          --cream: #FAFAF7;
          --stone: #F2F1EE;
          --border: #E5E3DD;
          --border2: #D1CEC6;
          --violet: #5B4FE8;
          --violet2: #7B72F0;
          --violet-light: #EEEDFB;
          --orange: #F2711C;
          --orange2: #F58B4C;
          --orange-light: #FEF2EA;
          --text: #1A1814;
          --text2: #5C5852;
          --text3: #9C9890;
          --green: #1A7F4B;
          --red: #C8352A;
          --serif: 'DM Serif Display', Georgia, serif;
          --sans: 'DM Sans', -apple-system, system-ui, sans-serif;
          --shadow-sm: 0 1px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03);
          --shadow-md: 0 4px 20px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04);
          --shadow-lg: 0 16px 48px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.05);
        }
        html { scroll-behavior: smooth; }
        body { font-family: var(--sans); background: var(--white); color: var(--text); -webkit-font-smoothing: antialiased; }

        @keyframes fade-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

        .fade-up-0 { animation: fade-up 0.7s ease both; }
        .fade-up-1 { animation: fade-up 0.7s 0.1s ease both; }
        .fade-up-2 { animation: fade-up 0.7s 0.2s ease both; }
        .fade-up-3 { animation: fade-up 0.7s 0.3s ease both; }

        /* NAV */
        .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; height: 62px; display: flex; align-items: center; transition: all 0.2s; }
        .nav.scrolled { background: rgba(255,255,255,0.94); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); box-shadow: var(--shadow-sm); }
        .nav-inner { max-width: 1160px; margin: 0 auto; padding: 0 28px; width: 100%; display: flex; align-items: center; justify-content: space-between; }
        .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .logo-mark { width: 32px; height: 32px; border-radius: 9px; background: var(--violet); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(91,79,232,0.35); }
        .logo-text { font-family: var(--sans); font-size: 17px; font-weight: 700; color: var(--text); letter-spacing: -0.03em; }
        .logo-text span { color: var(--violet); }
        .nav-links { display: flex; gap: 28px; }
        .nav-link { font-size: 13px; font-weight: 500; color: var(--text2); text-decoration: none; transition: color 0.15s; }
        .nav-link:hover { color: var(--text); }
        .nav-actions { display: flex; align-items: center; gap: 10px; }
        .nav-ghost { font-size: 13px; font-weight: 500; color: var(--text2); padding: 7px 14px; text-decoration: none; border-radius: 8px; transition: all 0.15s; }
        .nav-ghost:hover { background: var(--stone); color: var(--text); }
        .nav-cta { font-size: 13px; font-weight: 600; color: white; background: var(--violet); padding: 8px 18px; border-radius: 8px; text-decoration: none; transition: all 0.15s; box-shadow: 0 2px 10px rgba(91,79,232,0.3); }
        .nav-cta:hover { background: #4A3FD4; transform: translateY(-1px); }
        .nav-dash { font-size: 13px; font-weight: 500; color: var(--green); background: #DCFCE7; padding: 7px 14px; border-radius: 8px; text-decoration: none; }

        /* HERO */
        .hero { min-height: 100vh; padding: 130px 28px 100px; background: var(--white); position: relative; overflow: hidden; display: flex; align-items: center; }
        .hero-grid-bg { position: absolute; inset: 0; background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px); background-size: 56px 56px; opacity: 0.4; pointer-events: none; }
        .hero-glow-left { position: absolute; top: -20%; left: -10%; width: 600px; height: 600px; background: radial-gradient(ellipse, rgba(91,79,232,0.07) 0%, transparent 70%); pointer-events: none; }
        .hero-glow-right { position: absolute; bottom: -10%; right: -5%; width: 500px; height: 500px; background: radial-gradient(ellipse, rgba(242,113,28,0.06) 0%, transparent 70%); pointer-events: none; }
        .hero-inner { max-width: 1160px; margin: 0 auto; width: 100%; position: relative; }
        .hero-label { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; color: var(--violet); background: var(--violet-light); padding: 5px 12px; border-radius: 20px; margin-bottom: 28px; letter-spacing: 0.06em; text-transform: uppercase; }
        .hero-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--violet); animation: pulse 2s ease infinite; }
        .hero-h1 { font-family: var(--serif); font-size: 72px; font-weight: 400; line-height: 1.05; letter-spacing: -0.02em; color: var(--text); margin-bottom: 12px; max-width: 720px; }
        .hero-h1 .italic { font-style: italic; color: var(--violet); }
        .hero-h1 .orange { color: var(--orange); }
        .hero-sub { font-size: 18px; color: var(--text2); line-height: 1.75; margin-bottom: 40px; max-width: 560px; font-weight: 300; }
        .hero-sub strong { color: var(--text); font-weight: 600; }
        .hero-ctas { display: flex; gap: 12px; margin-bottom: 64px; flex-wrap: wrap; }
        .btn-primary { font-size: 14px; font-weight: 600; color: white; background: var(--violet); padding: 13px 28px; border-radius: 10px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 16px rgba(91,79,232,0.35); transition: all 0.2s; border: none; cursor: pointer; font-family: var(--sans); }
        .btn-primary:hover { background: #4A3FD4; transform: translateY(-2px); box-shadow: 0 6px 24px rgba(91,79,232,0.45); }
        .btn-secondary { font-size: 14px; font-weight: 500; color: var(--text2); background: white; padding: 13px 28px; border-radius: 10px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; border: 1.5px solid var(--border); transition: all 0.2s; }
        .btn-secondary:hover { border-color: var(--border2); color: var(--text); background: var(--cream); }
        .btn-orange { font-size: 14px; font-weight: 600; color: white; background: var(--orange); padding: 13px 28px; border-radius: 10px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 16px rgba(242,113,28,0.35); transition: all 0.2s; border: none; cursor: pointer; font-family: var(--sans); }
        .btn-orange:hover { background: #D9630E; transform: translateY(-2px); }

        /* HERO PROOF STRIP */
        .proof-strip { display: flex; gap: 36px; flex-wrap: wrap; padding-top: 28px; border-top: 1px solid var(--border); }
        .proof-item { display: flex; align-items: center; gap: 8px; }
        .proof-num { font-family: var(--serif); font-size: 26px; color: var(--text); }
        .proof-lbl { font-size: 12px; color: var(--text3); line-height: 1.3; }
        .proof-sep { color: var(--border2); }

        /* TWO MODULES SECTION */
        .modules-section { padding: 96px 28px; background: var(--cream); border-top: 1px solid var(--border); }
        .modules-inner { max-width: 1160px; margin: 0 auto; }
        .modules-header { text-align: center; margin-bottom: 52px; }
        .eyebrow { font-size: 11px; font-weight: 700; color: var(--violet); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 12px; }
        .section-h2 { font-family: var(--serif); font-size: 44px; font-weight: 400; letter-spacing: -0.02em; color: var(--text); line-height: 1.2; margin-bottom: 14px; }
        .section-sub { font-size: 16px; color: var(--text2); line-height: 1.7; max-width: 540px; margin: 0 auto; font-weight: 300; }

        /* MODULE TABS */
        .module-tabs { display: flex; gap: 0; background: var(--stone); border-radius: 12px; padding: 4px; margin-bottom: 32px; max-width: 460px; }
        .module-tab { flex: 1; padding: 10px 16px; border-radius: 9px; border: none; cursor: pointer; font-family: var(--sans); font-size: 13px; font-weight: 500; color: var(--text2); background: none; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 7px; }
        .module-tab.active { background: white; color: var(--text); font-weight: 600; box-shadow: var(--shadow-sm); }
        .module-tab.active.baf { color: var(--violet); }
        .module-tab.active.compta { color: var(--orange); }

        /* MODULE CARDS */
        .modules-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .module-card { border-radius: 16px; padding: 32px; border: 1.5px solid var(--border); background: white; transition: all 0.2s; cursor: pointer; position: relative; overflow: hidden; }
        .module-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-3px); }
        .module-card.baf { border-color: var(--violet); }
        .module-card.baf::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: var(--violet); border-radius: 16px 16px 0 0; }
        .module-card.compta { border-color: var(--orange); }
        .module-card.compta::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: var(--orange); border-radius: 16px 16px 0 0; }
        .module-icon { width: 52px; height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 18px; }
        .module-icon.baf { background: var(--violet-light); }
        .module-icon.compta { background: var(--orange-light); }
        .module-name { font-family: var(--serif); font-size: 24px; color: var(--text); margin-bottom: 8px; }
        .module-desc { font-size: 14px; color: var(--text2); line-height: 1.7; margin-bottom: 22px; font-weight: 300; }
        .module-features { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
        .module-feat { display: flex; align-items: flex-start; gap: 9px; font-size: 13px; color: var(--text2); }
        .module-feat-check { font-size: 11px; margin-top: 2px; flex-shrink: 0; }
        .module-feat-check.baf { color: var(--violet); }
        .module-feat-check.compta { color: var(--orange); }
        .module-cta { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 8px; transition: all 0.15s; }
        .module-cta.baf { color: var(--violet); background: var(--violet-light); }
        .module-cta.baf:hover { background: #DDD9F8; }
        .module-cta.compta { color: var(--orange); background: var(--orange-light); }
        .module-cta.compta:hover { background: #FDE4D0; }
        .module-badge { position: absolute; top: 20px; right: 20px; font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 20px; letter-spacing: 0.06em; text-transform: uppercase; }
        .module-badge.new { background: var(--violet-light); color: var(--violet); }
        .module-badge.soon { background: var(--orange-light); color: var(--orange); }

        /* PROBLEM SECTION */
        .problem-section { padding: 96px 28px; background: var(--white); border-top: 1px solid var(--border); }
        .problem-inner { max-width: 1160px; margin: 0 auto; }
        .stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 1px; background: var(--border); border-radius: 16px; overflow: hidden; border: 1px solid var(--border); margin-top: 48px; }
        .stat-cell { background: var(--white); padding: 32px 24px; transition: background 0.15s; }
        .stat-cell:hover { background: var(--cream); }
        .stat-num { font-family: var(--serif); font-size: 44px; margin-bottom: 6px; }
        .stat-lbl { font-size: 13px; color: var(--text2); margin-bottom: 6px; font-weight: 500; }
        .stat-src { font-size: 11px; color: var(--text3); }

        /* FEATURES */
        .features-section { padding: 96px 28px; background: var(--cream); border-top: 1px solid var(--border); }
        .features-inner { max-width: 1160px; margin: 0 auto; }
        .features-toggle { display: flex; gap: 0; background: var(--stone); border-radius: 10px; padding: 4px; margin-bottom: 40px; max-width: 400px; }
        .ftab { flex: 1; padding: 9px; border-radius: 8px; border: none; cursor: pointer; font-family: var(--sans); font-size: 12px; font-weight: 500; color: var(--text2); background: none; transition: all 0.2s; }
        .ftab.active { background: white; color: var(--text); font-weight: 600; box-shadow: var(--shadow-sm); }
        .features-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        .feat { background: white; border: 1px solid var(--border); border-radius: 14px; padding: 28px; transition: all 0.2s; }
        .feat:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .feat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 16px; }
        .feat-icon-v { background: var(--violet-light); }
        .feat-icon-o { background: var(--orange-light); }
        .feat-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 8px; }
        .feat-desc { font-size: 13px; color: var(--text2); line-height: 1.7; font-weight: 300; }

        /* TESTIMONIAL */
        .testimonial-section { padding: 80px 28px; background: var(--white); border-top: 1px solid var(--border); }
        .testimonial-inner { max-width: 760px; margin: 0 auto; }
        .testimonial { background: var(--cream); border: 1px solid var(--border); border-radius: 20px; padding: 44px; }
        .quote-mark { font-family: var(--serif); font-size: 80px; color: var(--violet); opacity: 0.12; line-height: 0.5; margin-bottom: 20px; }
        .quote-text { font-family: var(--serif); font-size: 22px; color: var(--text); line-height: 1.65; margin-bottom: 28px; font-style: italic; }
        .quote-author { display: flex; align-items: center; gap: 14px; }
        .quote-avatar { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, var(--violet), var(--violet2)); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: white; }
        .quote-name { font-size: 14px; font-weight: 600; color: var(--text); }
        .quote-role { font-size: 12px; color: var(--text3); margin-top: 2px; }

        /* PRICING */
        .pricing-section { padding: 96px 28px; background: var(--cream); border-top: 1px solid var(--border); }
        .pricing-inner { max-width: 1160px; margin: 0 auto; }
        .plan-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; margin-top: 48px; }
        .plan { background: white; border: 1.5px solid var(--border); border-radius: 16px; padding: 32px; display: flex; flex-direction: column; transition: all 0.2s; }
        .plan:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .plan.popular { border-color: var(--violet); box-shadow: 0 0 0 4px rgba(91,79,232,0.07); }
        .plan-badge { font-size: 9px; font-weight: 700; color: var(--violet); background: var(--violet-light); padding: 3px 10px; border-radius: 20px; display: inline-block; margin-bottom: 14px; letter-spacing: 0.06em; text-transform: uppercase; }
        .plan-name { font-family: var(--serif); font-size: 22px; color: var(--text); margin-bottom: 6px; }
        .plan-price { font-family: var(--serif); font-size: 40px; color: var(--text); margin-bottom: 4px; }
        .plan-unit { font-size: 13px; color: var(--text3); font-weight: 300; }
        .plan-desc { font-size: 13px; color: var(--text3); margin-bottom: 22px; padding-bottom: 22px; border-bottom: 1px solid var(--border); font-weight: 300; }
        .plan-feat-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
        .plan-check { color: var(--green); font-size: 12px; flex-shrink: 0; margin-top: 2px; }
        .plan-feat-text { font-size: 13px; color: var(--text2); line-height: 1.4; font-weight: 300; }
        .plan-cta { margin-top: auto; padding-top: 22px; display: block; text-align: center; padding: 12px; border-radius: 10px; font-size: 13px; font-weight: 600; text-decoration: none; transition: all 0.2s; cursor: pointer; font-family: var(--sans); border: none; }
        .plan-cta-outline { background: white; color: var(--violet); border: 1.5px solid var(--violet); }
        .plan-cta-outline:hover { background: var(--violet-light); }
        .plan-cta-fill { background: var(--violet); color: white; box-shadow: 0 2px 12px rgba(91,79,232,0.3); }
        .plan-cta-fill:hover { background: #4A3FD4; }

        /* CTA */
        .cta-section { background: var(--text); padding: 100px 28px; text-align: center; position: relative; overflow: hidden; }
        .cta-bg { position: absolute; inset: 0; background: radial-gradient(ellipse at 30% 50%, rgba(91,79,232,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(242,113,28,0.1) 0%, transparent 60%); pointer-events: none; }

        /* FOOTER */
        .footer { background: var(--text); border-top: 1px solid #2A2825; padding: 56px 28px 32px; }
        .footer-inner { max-width: 1160px; margin: 0 auto; }
        .footer-top { display: flex; justify-content: space-between; gap: 48px; margin-bottom: 48px; flex-wrap: wrap; }
        .footer-brand-name { font-family: var(--serif); font-size: 22px; color: white; margin-bottom: 10px; }
        .footer-brand-desc { font-size: 13px; color: #71706C; line-height: 1.65; max-width: 240px; font-weight: 300; }
        .footer-cols { display: flex; gap: 52px; flex-wrap: wrap; }
        .footer-col-title { font-size: 10px; font-weight: 700; color: #52514D; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 16px; }
        .footer-link { font-size: 13px; color: #71706C; display: block; margin-bottom: 10px; text-decoration: none; transition: color 0.15s; cursor: pointer; font-weight: 300; }
        .footer-link:hover { color: #A1A09C; }
        .footer-bottom { border-top: 1px solid #2A2825; padding-top: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
        .footer-copy { font-size: 12px; color: #52514D; font-weight: 300; }
        .live-dot { width: 6px; height: 6px; border-radius: 50%; background: #22C55E; animation: pulse 2s ease infinite; display: inline-block; }
      `}</style>

      {/* NAV */}
      <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-inner">
          <Link href="/" className="logo">
            <div className="logo-mark">
              <svg width="17" height="17" viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="6" fill="white"/>
                <circle cx="22" cy="22" r="2.8" fill="#5B4FE8"/>
                <line x1="22" y1="7" x2="22" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="22" y1="30" x2="22" y2="37" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="7" y1="22" x2="14" y2="22" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="30" y1="22" x2="37" y2="22" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="logo-text">Siha<span>IQ</span></span>
          </Link>
          <div className="nav-links">
            <a href="#modules" className="nav-link">Nos modules</a>
            <a href="#features" className="nav-link">Fonctionnalités</a>
            <a href="#tarifs" className="nav-link">Tarifs</a>
            <a href="mailto:contact@sihaiq.ma" className="nav-link">Contact</a>
          </div>
          <div className="nav-actions">
            <a href="/auth/login" className="nav-ghost">Connexion</a>
            {isLoggedIn && <a href="/dashboard" className="nav-dash">Dashboard →</a>}
            <a href="/auth/register" className="nav-cta">Démarrer gratuitement</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-grid-bg"/>
        <div className="hero-glow-left"/>
        <div className="hero-glow-right"/>
        <div className="hero-inner">
          <div className="fade-up-0">
            
          </div>
          <h1 className="hero-h1 fade-up-1">
            Transformez votre activité<br/>
            hospitalière en <span className="italic">intelligence</span><br/>
            <span className="orange">financière.</span>
          </h1>
          <p className="hero-sub fade-up-2">
            <strong>Contrôlez vos recettes BAF et maîtrisez vos dépenses.</strong><br/>
            Une intelligence financière complète pour votre hôpital.
          </p>
          <div className="hero-ctas fade-up-3">
            <a href="/auth/register" className="btn-primary">
              Démarrer gratuitement
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <a href="#modules" className="btn-secondary">Découvrir nos modules →</a>
          </div>
          <div className="proof-strip fade-up-3">
            {[
              { num: "88%", lbl: "précision IA" },
              { num: "−62%", lbl: "taux de rejet BAF" },
              { num: "2", lbl: "modules intégrés" },
              { num: "0", lbl: "concurrent direct" },
            ].map((p, i) => (
              <span key={i} style={{ display: "contents" }}>
                {i > 0 && <span className="proof-sep">·</span>}
                <div className="proof-item">
                  <span className="proof-num">{p.num}</span>
                  <span className="proof-lbl">{p.lbl}</span>
                </div>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* TWO MODULES */}
      <section id="modules" className="modules-section">
        <div className="modules-inner">
          <div className="modules-header">
            <div className="eyebrow">Nos modules</div>
            <h2 className="section-h2">Une suite. Deux intelligences.</h2>
            <p className="section-sub">
              SihaIQ couvre l&apos;intégralité du cycle financier hospitalier — des remboursements caisses à la comptabilité générale.
            </p>
          </div>
          <div className="modules-grid">
            {/* BAF Module */}
            <div className="module-card baf">
              <div className="module-badge new">Disponible</div>
              <div className="module-icon baf">🏥</div>
              <div className="module-name">Gestion BAF & RCM</div>
              <div className="module-desc">
                Contrôlez vos recettes. Prédisez les rejets CNOPS · CNSS · AMO avant soumission.
                Récupérez chaque dirham avant forclusion.
              </div>
              <div className="module-features">
                {[
                  "Prédiction IA des rejets XGBoost (AUC 0.87)",
                  "Explicabilité SHAP en français — zéro boîte noire",
                  "File de travail K-Means priorisée",
                  "Forclusion engine — alertes J-15 à J-1",
                  "Bordereau PDF de soumission automatique",
                  "Disposition codes : contestation → recouvrement",
                ].map(f => (
                  <div key={f} className="module-feat">
                    <span className="module-feat-check baf">✦</span>
                    {f}
                  </div>
                ))}
              </div>
              <a href="/auth/register" className="module-cta baf">
                Accéder au module BAF →
              </a>
            </div>
            {/* Comptabilité Module */}
            <div className="module-card compta">
              <div className="module-badge soon">Nouveau</div>
              <div className="module-icon compta">📊</div>
              <div className="module-name">Comptabilité hospitalière</div>
              <div className="module-desc">
                Maîtrisez vos dépenses. CPC, trésorerie, budget prévisionnel et tableau de bord DAF
                conformes au Plan Comptable Marocain.
              </div>
              <div className="module-features">
                {[
                  "Tableau de bord DAF — CPC complet",
                  "Trésorerie & BFR — cycles de 60 jours",
                  "Charges d'exploitation par centre de coût",
                  "Budget prévisionnel vs réalisé",
                  "Indicateurs MSPS et ratios financiers",
                  "Conformité Plan Comptable Marocain",
                ].map(f => (
                  <div key={f} className="module-feat">
                    <span className="module-feat-check compta">✦</span>
                    {f}
                  </div>
                ))}
              </div>
              <a href="/auth/register" className="module-cta compta">
                Accéder au module Comptabilité →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="problem-section">
        <div className="problem-inner">
          <div className="eyebrow" style={{ color: "var(--orange)" }}>Le problème</div>
          <h2 className="section-h2" style={{ marginTop: 10 }}>48 millions de MAD rejetés<br/>chaque jour au Maroc</h2>
          <p className="section-sub" style={{ marginTop: 12, margin: "12px 0 0" }}>
            34 à 38% des dossiers BAF sont rejetés. 90% de ces rejets sont évitables.
            Pendant ce temps, les charges d&apos;exploitation restent invisibles pour la direction.
          </p>
          <div className="stats-grid">
            {[
              { num: "110 000", lbl: "dossiers CNSS / jour", src: "DG Hassan Boubrik · Parlement Mars 2025", color: "var(--violet)" },
              { num: "34–38%", lbl: "taux de rejet moyen BAF", src: "Cliniques privées marocaines", color: "var(--orange)" },
              { num: "60 jours", lbl: "délai légal forclusion", src: "Code Sécurité Sociale marocain", color: "var(--red)" },
              { num: "400+", lbl: "polycliniques cibles", src: "Marché Akdital et indépendants", color: "var(--text)" },
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

      {/* FEATURES */}
      <section id="features" className="features-section">
        <div className="features-inner">
          <div style={{ marginBottom: 40 }}>
            <div className="eyebrow">Fonctionnalités</div>
            <h2 className="section-h2" style={{ marginTop: 10 }}>Tout ce dont votre équipe a besoin</h2>
          </div>
          <div className="features-toggle">
            <button className={`ftab ${activeModule === "baf" ? "active" : ""}`} onClick={() => setActiveModule("baf")}>
              🏥 Module BAF
            </button>
            <button className={`ftab ${activeModule === "compta" ? "active" : ""}`} onClick={() => setActiveModule("compta")}>
              📊 Module Comptabilité
            </button>
          </div>
          {activeModule === "baf" ? (
            <div className="features-grid">
              {[
                { icon: "🧠", cls: "feat-icon-v", title: "Prédiction XGBoost", desc: "17 features NGAP analysées en temps réel. AUC 0.87. Score ÉLEVÉ / MODÉRÉ / FAIBLE par dossier." },
                { icon: "💡", cls: "feat-icon-o", title: "SHAP Explicabilité", desc: "Top 3 facteurs de rejet en français avec recommandations d'action concrètes. Zéro boîte noire." },
                { icon: "📋", cls: "feat-icon-v", title: "File de travail K-Means", desc: "4 clusters priorisés : risque × valeur × forclusion. Chaque agent sait quoi faire." },
                { icon: "⏰", cls: "feat-icon-o", title: "Forclusion Engine", desc: "Buckets 0–60j. Alertes J-15, J-7, J-3, J-1. Zéro perte légale évitable." },
                { icon: "🔄", cls: "feat-icon-v", title: "Feedback Loop ML", desc: "Chaque résultat alimente training_feedback. FLAML réentraîne à 500 labels." },
                { icon: "🔒", cls: "feat-icon-o", title: "CNDP Loi 09-08", desc: "Données synthétiques certifiées. Audit immuable. RLS PostgreSQL multi-tenant." },
              ].map(f => (
                <div key={f.title} className="feat">
                  <div className={`feat-icon ${f.cls}`}>{f.icon}</div>
                  <div className="feat-title">{f.title}</div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="features-grid">
              {[
                { icon: "📈", cls: "feat-icon-o", title: "Tableau de bord DAF", desc: "CPC complet, indicateurs MSPS, ratios financiers standards pour hôpitaux marocains." },
                { icon: "💰", cls: "feat-icon-v", title: "Trésorerie & BFR", desc: "Suivi du Besoin en Fonds de Roulement intégrant les cycles de remboursement de 60 jours." },
                { icon: "📉", cls: "feat-icon-o", title: "Charges d'exploitation", desc: "Personnel, médicaments, consommables, amortissements — par centre de coût." },
                { icon: "🎯", cls: "feat-icon-v", title: "Budget prévisionnel", desc: "Écart budget/réalisé en temps réel. Alertes automatiques sur dépassements." },
                { icon: "🏦", cls: "feat-icon-o", title: "Comptes PCM", desc: "Plan Comptable Marocain intégré. Compte 411 caisses, Compte 7 produits, Compte 5 trésorerie." },
                { icon: "📊", cls: "feat-icon-v", title: "Rapports MSPS", desc: "Indicateurs réglementaires pour le Ministère de la Santé et de la Protection Sociale." },
              ].map(f => (
                <div key={f.title} className="feat">
                  <div className={`feat-icon ${f.cls}`}>{f.icon}</div>
                  <div className="feat-title">{f.title}</div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="testimonial-section">
        <div className="testimonial-inner">
          <div className="testimonial">
            <div className="quote-mark">&ldquo;</div>
            <div className="quote-text">
              SihaIQ a identifié 74 580 MAD d&apos;encours récupérables dans notre portefeuille.
              En trois semaines, notre taux de rejet CNOPS est passé de 38% à 14%.
              Les explications SHAP en français ont transformé le travail de nos agents BAF.
            </div>
            <div className="quote-author">
              <div className="quote-avatar">HM</div>
              <div>
                <div className="quote-name">Hamid M.</div>
                <div className="quote-role">Directeur Administratif et Financier · Polyclinique privée · Casablanca</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="tarifs" className="pricing-section">
        <div className="pricing-inner">
          <div style={{ textAlign: "center" }}>
            <div className="eyebrow">Tarifs</div>
            <h2 className="section-h2" style={{ marginTop: 10 }}>Simple. Transparent. Basé sur la valeur.</h2>
            <p className="section-sub" style={{ marginTop: 12 }}>
              Pas de frais cachés. Annulable à tout moment.
            </p>
          </div>
          <div className="plan-grid">
            {[
              { name: "Starter", price: "2 000", unit: "MAD / mois", desc: "Petites cliniques · jusqu'à 200 dossiers / mois", features: ["Module BAF complet", "Prédiction IA illimitée", "Alertes forclusion", "1 utilisateur", "Support email"], popular: false, cta: "Commencer", ctaCls: "plan-cta-outline" },
              { name: "Clinique", price: "6 000", unit: "MAD / mois", desc: "Polycliniques · jusqu'à 1 000 dossiers / mois", features: ["Tout Starter inclus", "Module Comptabilité", "Dashboard financier DAF", "5 utilisateurs + RBAC", "Export PDF et Excel", "Support prioritaire"], popular: true, cta: "Démarrer gratuitement", ctaCls: "plan-cta-fill" },
              { name: "Groupe hospitalier", price: "12 000", unit: "MAD / mois", desc: "Groupes Akdital · réseaux multi-sites", features: ["Tout Clinique inclus", "Multi-établissements", "Modèle IA dédié", "Utilisateurs illimités", "Intégration HIS", "Account manager dédié"], popular: false, cta: "Nous contacter", ctaCls: "plan-cta-outline" },
            ].map(p => (
              <div key={p.name} className={`plan ${p.popular ? "popular" : ""}`}>
                {p.popular && <div className="plan-badge">Recommandé</div>}
                <div className="plan-name">{p.name}</div>
                <div className="plan-price">{p.price} <span className="plan-unit">{p.unit}</span></div>
                <div className="plan-desc">{p.desc}</div>
                {p.features.map(f => (
                  <div key={f} className="plan-feat-row">
                    <span className="plan-check">✓</span>
                    <span className="plan-feat-text">{f}</span>
                  </div>
                ))}
                <a href="/auth/register" className={`plan-cta ${p.ctaCls}`}>{p.cta} →</a>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", fontSize: 13, color: "var(--text3)", marginTop: 20, fontWeight: 300 }}>
            + Couche performance : 3–5% des encours récupérés au-delà du seuil · sur demande
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-bg"/>
        <div style={{ maxWidth: 580, margin: "0 auto", position: "relative" }}>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 48, color: "white", marginBottom: 18, lineHeight: 1.15 }}>
            Prêt à transformer votre activité financière ?
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", marginBottom: 36, lineHeight: 1.7, fontWeight: 300 }}>
            Démarrez en moins de 5 minutes. Vos premières prédictions IA en moins d&apos;une heure.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/auth/register" className="btn-orange" style={{ fontSize: 15, padding: "14px 32px" }}>
              Créer un compte gratuit →
            </a>
            <a href="mailto:contact@sihaiq.ma" style={{ fontSize: 15, fontWeight: 400, color: "rgba(255,255,255,0.7)", padding: "14px 24px", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: 10, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              Parler à un expert
            </a>
          </div>
          <div style={{ marginTop: 24, display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
            {["Aucune CB requise", "Annulable à tout moment", "Support en français"].map(t => (
              <span key={t} style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>✓</span>{t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div className="footer-brand-name">SihaIQ</div>
              <div className="footer-brand-desc">
                Intelligence financière pour les hôpitaux privés marocains.
                Gestion BAF · Comptabilité · CNOPS · CNSS · AMO.
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
          <div style={{ borderTop: "1px solid #2A2825", paddingTop: 24, display: "flex", flexWrap: "wrap", gap: "12px 28px", alignItems: "center" }}>
            <span className="footer-copy">© 2026 SihaIQ · Casablanca, Maroc · Tous droits réservés</span>
            {[
              { label: "Conditions d'utilisation", href: "/legal/conditions" },
              { label: "Confidentialité", href: "/legal/confidentialite" },
              { label: "CNDP", href: "/legal/cndp" },
              { label: "Accessibilité", href: "/legal/accessibilite" },
              { label: "Plan du site", href: "/legal/sitemap" },
            ].map(l => (
              <a key={l.label} href={l.href} style={{ fontSize: 12, color: "#52514D", textDecoration: "none" }}>{l.label}</a>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#52514D", display: "flex", alignItems: "center", gap: 6 }}>
              <span className="live-dot"/> Tous les systèmes opérationnels
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}