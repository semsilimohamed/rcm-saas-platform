"use client";
import { useEffect, useState } from "react";
export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
  const checkAuth = () => {
    const token = localStorage.getItem("sihaiq_token");
    setIsLoggedIn(!!token);
  };
  checkAuth();
}, []);
  return (
    <div style={s.page}>

      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <div style={s.navLogo}>
            <div style={s.navMark}>
              <svg width="20" height="20" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"> 
                 <circle cx="22" cy="22" r="6" fill="white" /> <circle cx="22" cy="22" r="2.8" fill="#0F62FE" /> 
                 <line x1="22" y1="7"    x2="22" y2="14"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" /> 
                 <line x1="22" y1="30"   x2="22" y2="37"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" /> 
                 <line x1="7"  y1="22"   x2="14" y2="22"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" /> 
                 <line x1="30" y1="22"   x2="37" y2="22"   stroke="white"   strokeWidth="2.2" strokeLinecap="round" /> 
                 <line x1="12"   y1="12"   x2="16.5" y2="16.5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" /> 
                 <line x1="27.5" y1="27.5" x2="32"   y2="32"   stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" /> 
                 <line x1="32"   y1="12"   x2="27.5" y2="16.5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" /> 
                 <line x1="16.5" y1="27.5" x2="12"   y2="32"   stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" /> 
              </svg> 
            </div>
            <div>
              <div style={s.navName}>SihaIQ</div>
              <div style={s.navSub}>RCM</div>
            </div>
          </div>
          <div style={s.navLinks}>
            {["Fonctionnalités","Tarifs","À propos","Contact"].map(l => (
              <span key={l} style={s.navLink}>{l}</span>
            ))}
          </div>
          <div style={s.navCtas}>
            <a href="/auth/login" style={s.navLogin}>Connexion</a>
            {isLoggedIn && (
              <a href="/dashboard" style={s.navDash}>Tableau de bord</a>
            )}
            <a href="/auth/register" style={s.navDemo}>Demander une démo</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={s.hero}>
        <div style={s.heroTag}>
          <span style={s.heroTagDot}/>
          Conçu pour les hôpitaux  marocains · CNOPS · CNSS · AMO · AMO TADAMON
        </div>
        <h1 style={s.heroH1}>
          Business intelligence<br/>
          <span style={s.heroBlue}>pour le RCM</span> de votre<br/>
          établissement de santé
        </h1>
        <p style={s.heroSub}>
          SihaIQ centralise la gestion de votre cycle de revenus — prédiction IA des rejets,
          tableau de bord financier temps réel, file de travail intelligente — en une seule plateforme
          souveraine et conforme CNDP.
        </p>
        <div style={s.heroCtas}>
          <a href="/auth/register" style={s.btnPrimary}>Démarrer gratuitement</a>
          <a href="/dashboard" style={{...s.btnSecondary, background:"#DCFCE7", color:"#16A34A"}}>Accéder au tableau de bord →</a>
          <a href="#solutions" style={s.btnSecondary}>Découvrir les solutions →</a>
        </div>
        <div style={s.heroStats}>
          {[
            {val:"88%", lbl:"Précision de prédiction IA"},
            {val:"-62%", lbl:"Réduction du taux de rejet"},
            {val:"6:1", lbl:"ROI moyen par clinique"},
            {val:"0", lbl:"Concurrent IA direct au Maroc"},
          ].map((s2,i) => (
            <div key={i} style={s.heroStat}>
              <div style={s.heroStatVal}>{s2.val}</div>
              <div style={s.heroStatLbl}>{s2.lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SOLUTIONS */}
      <section id="solutions" style={s.solutions}>
        <div style={s.sectionHead}>
          <div style={s.sectionTag}>Nos solutions</div>
          <h2 style={s.sectionH2}>Trois piliers pour votre performance financière</h2>
          <p style={s.sectionSub}>Chaque module est indépendant et s&apos;intègre progressivement dans votre flux de travail existant.</p>
        </div>
        <div style={s.solGrid}>

          <div style={{...s.solCard, ...s.solCardFeatured}}>
            <div style={{...s.solIcon, background:"#E6F1FB", color:"#0F62FE"}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-8"/>
              </svg>
            </div>
            <div style={s.solFeatBadge}>Pilier 1</div>
            <h3 style={s.solTitle}>Tableau de bord financier temps réel</h3>
            <p style={s.solDesc}>
              Visualisez l&apos;intégralité de votre cycle de revenus en un seul écran — encours A/R par caisse,
              taux de rejet par prestataire, vieillissement des créances, et performance mensuelle comparée.
              Prenez des décisions basées sur des données, pas sur des intuitions.
            </p>
            <div style={s.solFeatures}>
              {["Encours A/R par caisse (CNOPS, CNSS, AMO)","Vieillissement 0–30, 31–60, 61–90, 90+ jours","KPIs financiers en temps réel","Export PDF et Excel automatique"].map(f => (
                <div key={f} style={s.solFeat}>
                  <span style={s.solCheck}>✓</span>{f}
                </div>
              ))}
            </div>
          </div>

          <div style={s.solCard}>
            <div style={{...s.solIcon, background:"#FEE2E2", color:"#DC2626"}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 8v4l3 3"/>
              </svg>
            </div>
            <div style={{...s.solFeatBadge, background:"#FEE2E2", color:"#991B1B"}}>Pilier 2</div>
            <h3 style={s.solTitle}>Prédiction IA des rejets CNOPS · CNSS · AMO</h3>
            <p style={s.solDesc}>
              Notre moteur XGBoost analyse 17 critères du dossier BAF avant soumission et calcule
              un score de risque de rejet. SHAP explique chaque décision en français avec des
              recommandations d&apos;action concrètes pour le personnel de facturation.
            </p>
            <div style={s.solFeatures}>
              {["Score de risque 0–100% par dossier","Top 3 causes de rejet expliquées en français","Alertes forclusion J-15, J-7, J-1","Modèle calibré sur données BAF marocaines"].map(f => (
                <div key={f} style={s.solFeat}>
                  <span style={{...s.solCheck, color:"#DC2626"}}>✓</span>{f}
                </div>
              ))}
            </div>
          </div>

          <div style={s.solCard}>
            <div style={{...s.solIcon, background:"#F0FDF4", color:"#16A34A"}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <div style={{...s.solFeatBadge, background:"#DCFCE7", color:"#166534"}}>Pilier 3</div>
            <h3 style={s.solTitle}>Optimisation de la file de travail (Worklist)</h3>
            <p style={s.solDesc}>
              Fini les dossiers traités dans le désordre. Le moteur K-Means priorise automatiquement
              votre file de travail selon le score de risque × valeur financière × urgence forclusion.
              Chaque agent sait exactement quel dossier traiter en premier.
            </p>
            <div style={s.solFeatures}>
              {["Priorisation automatique risk × valeur × délai","File de travail individuelle par agent","Segmentation par cluster de rejet","Suivi de progression en temps réel"].map(f => (
                <div key={f} style={s.solFeat}>
                  <span style={{...s.solCheck, color:"#16A34A"}}>✓</span>{f}
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* MARKET NUMBERS */}
      <section style={s.market}>
        <div style={s.marketInner}>
          <div style={s.sectionTag}>Le problème que nous résolvons</div>
          <h2 style={{...s.sectionH2, color:"#fff", marginBottom:32}}>
            48 millions de MAD rejetés chaque jour au Maroc
          </h2>
          <div style={s.marketGrid}>
            {[
              {val:"110 000", lbl:"Dossiers CNSS traités par jour", sub:"Source : CNSS 2024"},
              {val:"34–38%", lbl:"Taux de rejet moyen BAF", sub:"Cliniques privées marocaines"},
              {val:"60 jours", lbl:"Délai légal de forclusion", sub:"Après la date de soin"},
              {val:"400+", lbl:"Polycliniques privées cibles", sub:"Marché Akdital et indépendants"},
            ].map((m,i) => (
              <div key={i} style={s.marketStat}>
                <div style={s.marketVal}>{m.val}</div>
                <div style={s.marketLbl}>{m.lbl}</div>
                <div style={s.marketSub}>{m.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPLIANCE */}
      <section style={s.compliance}>
        <div style={s.compInner}>
          <div style={s.compLeft}>
            <div style={s.sectionTag}>Conformité & souveraineté</div>
            <h2 style={s.sectionH2}>Conçu pour le cadre réglementaire marocain</h2>
            <p style={s.sectionSub}>
              SihaIQ est architecturé dès la conception pour respecter la Loi 09-08 (CNDP) et
              s&apos;adapter aux mutations de Loi 54-23 (fusion CNOPS → CNSS).
            </p>
            <div style={s.compList}>
              {[
                {icon:"🔒", title:"CNDP Loi 09-08", desc:"Aucune donnée patient réelle dans l'entraînement. Modèle entraîné sur données synthétiques BAF certifiées."},
                {icon:"🏥", title:"Un modèle par établissement", desc:"Isolation totale des données entre hôpitaux. Architecture multi-tenant avec Row Level Security PostgreSQL."},
                {icon:"🔄", title:"Adaptation Loi 54-23", desc:"Détection automatique de dérive du modèle lors de la migration CNOPS → CNSS. Réentraînement autonome."},
              ].map(c => (
                <div key={c.title} style={s.compItem}>
                  <span style={s.compItemIcon}>{c.icon}</span>
                  <div>
                    <div style={s.compItemTitle}>{c.title}</div>
                    <div style={s.compItemDesc}>{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={s.compRight}>
            <div style={s.compCard}>
              <div style={s.compCardTitle}>Retour sur investissement estimé</div>
              <div style={s.roiGrid}>
                <div style={s.roiRow}>
                  <span style={s.roiLbl}>Encours moyen</span>
                  <span style={s.roiVal}>340 000 MAD</span>
                </div>
                <div style={s.roiRow}>
                  <span style={s.roiLbl}>Taux de rejet actuel</span>
                  <span style={s.roiVal}>36.5%</span>
                </div>
                <div style={s.roiRow}>
                  <span style={s.roiLbl}>Taux de récupération IA</span>
                  <span style={s.roiVal}>60%</span>
                </div>
                <div style={s.roiDivider}/>
                <div style={s.roiRow}>
                  <span style={s.roiLbl}>Récupération mensuelle</span>
                  <span style={{...s.roiVal, color:"#0F62FE", fontWeight:700}}>74 580 MAD</span>
                </div>
                <div style={s.roiRow}>
                  <span style={s.roiLbl}>Abonnement Clinique</span>
                  <span style={s.roiVal}>6 000 MAD</span>
                </div>
                <div style={s.roiDivider}/>
                <div style={s.roiRow}>
                  <span style={{...s.roiLbl, fontWeight:600, color:"#1A1D23"}}>ROI net mensuel</span>
                  <span style={{...s.roiVal, color:"#16A34A", fontWeight:700, fontSize:18}}>68 580 MAD</span>
                </div>
              </div>
              <div style={s.roiFooter}>Ratio 12:1 · Basé sur données secteur privé marocain</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="tarifs" style={s.pricing}>
        <div style={s.sectionHead}>
          <div style={s.sectionTag}>Tarifs</div>
          <h2 style={s.sectionH2}>Simple, transparent, basé sur la valeur</h2>
          <p style={s.sectionSub}>Tous les plans incluent l&apos;accès complet à la plateforme. Pas de frais cachés.</p>
        </div>
        <div style={s.planGrid}>
          {[
            {
              name:"Starter", price:"2 000", unit:"MAD/mois",
              desc:"Pour les petites cliniques jusqu'à 200 dossiers par mois",
              features:["Prédiction IA illimitée","Alertes forclusion","Tableau de bord KPIs","1 utilisateur","Support email"],
              featured:false, cta:"Commencer"
            },
            {
              name:"Clinique", price:"6 000", unit:"MAD/mois",
              desc:"Pour les polycliniques jusqu'à 1 000 dossiers par mois",
              features:["Tout Starter inclus","Tableau de bord financier complet","File de travail IA (worklist)","5 utilisateurs + rôles RBAC","Export PDF et Excel","Support prioritaire"],
              featured:false, cta:"Démarrer l'accès gratuit"
            },
            {
              name:"Groupe hospitalier", price:"12 000", unit:"MAD/mois",
              desc:"Pour les groupes Akdital et réseaux multi-sites",
              features:["Tout Clinique inclus","Multi-établissements","Modèle IA dédié par site","Utilisateurs illimités","Intégration HIS sur mesure","Account manager dédié"],
              featured:false, cta:"Nous contacter"
            },
          ].map(p => (
            <div key={p.name} style={p.featured ? {...s.plan, ...s.planFeatured} : s.plan}>
              {p.featured && <div style={s.planBadge}>Le plus populaire</div>}
              <div style={s.planName}>{p.name}</div>
              <div style={s.planPrice}>{p.price} <span style={s.planUnit}>{p.unit}</span></div>
              <div style={s.planDesc}>{p.desc}</div>
              <div style={s.planDivider}/>
              {p.features.map(f => (
                <div key={f} style={s.planFeat}>
                  <span style={{...s.solCheck, color: p.featured ? "#0F62FE" : "#16A34A"}}>✓</span>{f}
                </div>
              ))}
              <button style={p.featured ? {...s.planBtn, ...s.planBtnPrimary} : s.planBtn}>
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FOOTER */}
      <section style={s.ctaSection}>
        <h2 style={s.ctaH2}>Prêt à reprendre le contrôle de votre cycle de revenus ?</h2>
        <p style={s.ctaSub}>Rejoignez les établissements marocains qui récupèrent leurs encours avec SihaIQ.</p>
        <div style={s.heroCtas}>
          <a href="/auth/register" style={s.btnPrimary}>Créer un compte gratuit</a>
          <a href="mailto:contact@sihaiq.ma" style={s.btnSecondary}>Parler à un expert →</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.footerLogo}>
            <div style={{...s.navMark, width:22, height:22}}>
              <svg width="14" height="14" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
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
            </div>
            <span style={{...s.navName, color:"#9EA3AE"}}>SihaIQ RCM</span>
          </div>
          <div style={s.footerLinks}>
            {["Fonctionnalités","Tarifs","Conformité CNDP","Contact","Politique de confidentialité"].map(l => (
              <span key={l} style={s.footerLink}>{l}</span>
            ))}
          </div>
          <div style={s.footerCopy}>© 2026 SihaIQ · Tous droits réservés</div>
        </div>
      </footer>

    </div>
  );
}

const BLUE = "#0F62FE";
const BLUE_LIGHT = "#E6F1FB";
const BLUE_MID = "#378ADD";

const s: Record<string, React.CSSProperties> = {
  page: { minHeight:"100vh", background:"#fff", fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif", color:"#1A1D23" },

  // NAV
  nav: { background:"#fff", borderBottom:"0.5px solid #E6F1FB", position:"sticky", top:0, zIndex:100 },
  navInner: { maxWidth:1160, margin:"0 auto", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px" },
  navLogo: { display:"flex", alignItems:"center", gap:10 },
  navMark: { width:30, height:30, background:BLUE, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  navName: { fontSize:16, fontWeight:700, color:"#1A1D23", letterSpacing:"-0.02em" },
  navSub: { fontSize:10, fontWeight:600, color:BLUE, letterSpacing:"0.12em", textTransform:"uppercase" as const, marginTop:1 },
  navLinks: { display:"flex", alignItems:"center", gap:24 },
  navLink: { fontSize:13, color:"#6B7280", cursor:"pointer", textDecoration:"none" },
  navCtas: { display:"flex", alignItems:"center", gap:10 },
  navLogin: { fontSize:13, fontWeight:500, color:BLUE_MID, cursor:"pointer", padding:"7px 14px", textDecoration:"none" },
  navDemo: { fontSize:13, fontWeight:600, color:"#fff", background:BLUE, padding:"8px 18px", borderRadius:8, cursor:"pointer", textDecoration:"none" },
  navDash: { fontSize:13, fontWeight:500, color:"#16A34A", cursor:"pointer", padding:"7px 14px", textDecoration:"none", background:"#DCFCE7", borderRadius:7 },
  // HERO
  hero: { background:"#F8FBFF", padding:"64px 24px 56px", textAlign:"center" as const, borderBottom:"0.5px solid #E6F1FB" },
  heroTag: { display:"inline-flex", alignItems:"center", gap:8, fontSize:12, fontWeight:500, color:"#185FA5", background:BLUE_LIGHT, padding:"5px 14px", borderRadius:20, marginBottom:20 },
  heroTagDot: { width:7, height:7, borderRadius:"50%", background:BLUE, display:"inline-block" },
  heroH1: { fontSize:40, fontWeight:800, color:"#0C1B33", lineHeight:1.15, letterSpacing:"-0.03em", marginBottom:16, maxWidth:640, margin:"0 auto 16px" },
  heroBlue: { color:BLUE },
  heroSub: { fontSize:15, color:"#6B7280", lineHeight:1.7, maxWidth:560, margin:"0 auto 28px" },
  heroCtas: { display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginBottom:40 },
  btnPrimary: { fontSize:14, fontWeight:600, color:"#fff", background:BLUE, padding:"12px 24px", borderRadius:9, cursor:"pointer", textDecoration:"none", display:"inline-block" },
  btnSecondary: { fontSize:14, fontWeight:500, color:BLUE, background:BLUE_LIGHT, padding:"12px 24px", borderRadius:9, cursor:"pointer", textDecoration:"none", display:"inline-block" },
  heroStats: { display:"flex", alignItems:"center", justifyContent:"center", gap:0, maxWidth:700, margin:"0 auto", background:"#fff", borderRadius:12, border:"0.5px solid #E6F1FB", overflow:"hidden" },
  heroStat: { flex:1, padding:"16px 20px", borderRight:"0.5px solid #E6F1FB", textAlign:"center" as const },
  heroStatVal: { fontSize:22, fontWeight:800, color:"#0C1B33", letterSpacing:"-0.02em" },
  heroStatLbl: { fontSize:11, color:"#9EA3AE", marginTop:4, lineHeight:1.3 },

  // SOLUTIONS
  solutions: { padding:"72px 24px", maxWidth:1160, margin:"0 auto" },
  sectionHead: { textAlign:"center" as const, marginBottom:48 },
  sectionTag: { display:"inline-block", fontSize:11, fontWeight:600, color:BLUE, background:BLUE_LIGHT, padding:"4px 12px", borderRadius:20, marginBottom:12, letterSpacing:"0.06em", textTransform:"uppercase" as const },
  sectionH2: { fontSize:28, fontWeight:700, color:"#0C1B33", letterSpacing:"-0.02em", marginBottom:12 },
  sectionSub: { fontSize:14, color:"#6B7280", lineHeight:1.6, maxWidth:520, margin:"0 auto" },
  solGrid: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 },
  solCard: { border:"0.5px solid #E2E4E9", borderRadius:14, padding:24, background:"#fff" },
  solCardFeatured: { border:`1.5px solid ${BLUE}`, background:"#F8FBFF" },
  solIcon: { width:44, height:44, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 },
  solFeatBadge: { fontSize:10, fontWeight:600, color:"#185FA5", background:BLUE_LIGHT, padding:"3px 9px", borderRadius:20, display:"inline-block", marginBottom:10, letterSpacing:"0.06em" },
  solTitle: { fontSize:15, fontWeight:700, color:"#1A1D23", marginBottom:10, letterSpacing:"-0.01em" },
  solDesc: { fontSize:13, color:"#6B7280", lineHeight:1.6, marginBottom:16 },
  solFeatures: { display:"flex", flexDirection:"column" as const, gap:7 },
  solFeat: { fontSize:12, color:"#4B5060", display:"flex", alignItems:"flex-start", gap:7 },
  solCheck: { color:BLUE, fontWeight:700, flexShrink:0, marginTop:1 },

  // MARKET
  market: { background:"#0C1B33", padding:"64px 24px" },
  marketInner: { maxWidth:1160, margin:"0 auto", textAlign:"center" as const },
  marketGrid: { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:0, background:"rgba(255,255,255,0.05)", borderRadius:12, overflow:"hidden", border:"0.5px solid rgba(255,255,255,0.1)" },
  marketStat: { padding:"24px 20px", borderRight:"0.5px solid rgba(255,255,255,0.1)", textAlign:"center" as const },
  marketVal: { fontSize:28, fontWeight:800, color:"#60A5FA", letterSpacing:"-0.02em", marginBottom:6 },
  marketLbl: { fontSize:13, color:"#E2E8F0", fontWeight:500, marginBottom:4 },
  marketSub: { fontSize:11, color:"#64748B" },

  // COMPLIANCE
  compliance: { padding:"72px 24px", background:"#F8FBFF", borderTop:"0.5px solid #E6F1FB", borderBottom:"0.5px solid #E6F1FB" },
  compInner: { maxWidth:1160, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 400px", gap:48, alignItems:"start" },
  compLeft: {},
  compList: { display:"flex", flexDirection:"column" as const, gap:20, marginTop:24 },
  compItem: { display:"flex", alignItems:"flex-start", gap:14 },
  compItemIcon: { fontSize:20, flexShrink:0, marginTop:2 },
  compItemTitle: { fontSize:13, fontWeight:600, color:"#1A1D23", marginBottom:4 },
  compItemDesc: { fontSize:12, color:"#6B7280", lineHeight:1.6 },
  compRight: {},
  compCard: { background:"#fff", border:"0.5px solid #E2E4E9", borderRadius:14, padding:24 },
  compCardTitle: { fontSize:13, fontWeight:600, color:"#1A1D23", marginBottom:16 },
  roiGrid: { display:"flex", flexDirection:"column" as const, gap:10 },
  roiRow: { display:"flex", justifyContent:"space-between", alignItems:"center" },
  roiLbl: { fontSize:12, color:"#6B7280" },
  roiVal: { fontSize:13, fontWeight:500, color:"#1A1D23" },
  roiDivider: { height:"0.5px", background:"#E6F1FB", margin:"4px 0" },
  roiFooter: { fontSize:11, color:"#9EA3AE", marginTop:12, textAlign:"center" as const },

  // PRICING
  pricing: { padding:"72px 24px", maxWidth:1160, margin:"0 auto" },
  planGrid: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 },
  plan: { border:"0.5px solid #E2E4E9", borderRadius:14, padding:24, background:"#fff", display:"flex", flexDirection:"column" as const },
  planFeatured: { border:`1.5px solid ${BLUE}`, background:"#F8FBFF" },
  planBadge: { fontSize:10, fontWeight:600, color:"#185FA5", background:BLUE_LIGHT, padding:"3px 10px", borderRadius:20, display:"inline-block", marginBottom:10, width:"fit-content" },
  planName: { fontSize:15, fontWeight:700, color:"#1A1D23", marginBottom:6 },
  planPrice: { fontSize:26, fontWeight:800, color:"#0C1B33", letterSpacing:"-0.02em", marginBottom:6 },
  planUnit: { fontSize:12, fontWeight:400, color:"#9EA3AE" },
  planDesc: { fontSize:12, color:"#6B7280", lineHeight:1.5, marginBottom:16 },
  planDivider: { height:"0.5px", background:"#E6F1FB", marginBottom:14 },
  planFeat: { fontSize:12, color:"#4B5060", display:"flex", alignItems:"flex-start", gap:7, marginBottom:8 },
  planBtn: { marginTop:"auto", paddingTop:16, width:"100%", padding:"11px", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer", border:"0.5px solid #B5D4F4", background:"#fff", color:BLUE, fontFamily:"inherit" },
  planBtnPrimary: { background:BLUE, color:"#fff", border:`1px solid ${BLUE}` },

  // CTA
  ctaSection: { background:BLUE_LIGHT, padding:"64px 24px", textAlign:"center" as const, borderTop:"0.5px solid #B5D4F4" },
  ctaH2: { fontSize:28, fontWeight:700, color:"#0C1B33", letterSpacing:"-0.02em", marginBottom:12 },
  ctaSub: { fontSize:14, color:"#6B7280", marginBottom:28 },

  // FOOTER
  footer: { background:"#0C1B33", padding:"32px 24px" },
  footerInner: { maxWidth:1160, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap" as const, gap:16 },
  footerLogo: { display:"flex", alignItems:"center", gap:10 },
  footerLinks: { display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" as const },
  footerLink: { fontSize:12, color:"#64748B", cursor:"pointer" },
  footerCopy: { fontSize:12, color:"#475569" },
};