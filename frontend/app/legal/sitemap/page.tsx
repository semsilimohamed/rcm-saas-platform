import Link from "next/link";

export default function SitemapPage() {
  const sections = [
    {
      title: "Pages publiques",
      links: [
        { label: "Accueil", href: "/", desc: "Page d'accueil SihaIQ RCM" },
        { label: "Fonctionnalités", href: "/#features", desc: "Présentation des modules IA" },
        { label: "Tarifs", href: "/#tarifs", desc: "Plans Starter, Clinique, Groupe" },
        { label: "Contact", href: "mailto:contact@sihaiq.ma", desc: "Nous contacter" },
      ]
    },
    {
      title: "Authentification",
      links: [
        { label: "Connexion", href: "/auth/login", desc: "Accès à votre compte" },
        { label: "Inscription", href: "/auth/register", desc: "Créer un compte établissement" },
        { label: "Mot de passe oublié", href: "/auth/forgot-password", desc: "Réinitialisation du mot de passe" },
      ]
    },
    {
      title: "Tableau de bord",
      links: [
        { label: "Vue d'ensemble", href: "/dashboard", desc: "KPIs, dossiers récents, alertes" },
        { label: "Dossiers BAF", href: "/dashboard/dossiers", desc: "Gestion des dossiers de remboursement" },
        { label: "Patients", href: "/dashboard/patients", desc: "Registre des patients" },
        { label: "Prédiction IA", href: "/dashboard/prediction", desc: "Analyse SihaIQ d'un dossier" },
        { label: "Performance", href: "/dashboard/performance", desc: "Analytics par caisse et service" },
        { label: "Forclusion", href: "/dashboard/forclusion", desc: "Alertes délai légal 60 jours" },
        { label: "Encours A/R", href: "/dashboard/encours", desc: "Vieillissement des créances" },
        { label: "Journal d'audit", href: "/dashboard/audit", desc: "Traçabilité CNDP des actions" },
        { label: "Paramètres", href: "/dashboard/settings", desc: "Configuration établissement" },
      ]
    },
    {
      title: "Informations légales",
      links: [
        { label: "Conditions d'utilisation", href: "/legal/conditions", desc: "Règles d'utilisation de la Plateforme" },
        { label: "Politique de confidentialité", href: "/legal/confidentialite", desc: "Traitement des données personnelles" },
        { label: "Conformité CNDP", href: "/legal/cndp", desc: "Loi 09-08 et protection des données" },
        { label: "Accessibilité", href: "/legal/accessibilite", desc: "Déclaration d'accessibilité WCAG 2.1" },
        { label: "Plan du site", href: "/legal/sitemap", desc: "Cette page" },
      ]
    },
  ];

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <Link href="/" style={s.navLogo}>Siha<span style={{color:"#6366F1"}}>IQ</span></Link>
        <Link href="/" style={s.navBack}>← Retour à l&apos;accueil</Link>
      </nav>
      <div style={s.inner}>
        <div style={s.header}>
          <div style={s.eyebrow}>Navigation</div>
          <h1 style={s.h1}>Plan du site</h1>
          <p style={s.meta}>Toutes les pages de la plateforme SihaIQ RCM</p>
        </div>
        <div style={s.grid}>
          {sections.map(section => (
            <div key={section.title} style={s.sectionBox}>
              <div style={s.sectionTitle}>{section.title}</div>
              {section.links.map(link => (
                <Link key={link.label} href={link.href} style={s.linkRow}>
                  <div style={s.linkLabel}>{link.label}</div>
                  <div style={s.linkDesc}>{link.desc}</div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
      <footer style={s.footer}>
        <div style={s.footerInner}>
          {["Conditions d'utilisation","Politique de confidentialité","Conformité CNDP","Accessibilité","Plan du site"].map((l,i) => (
            <Link key={l} href={["/legal/conditions","/legal/confidentialite","/legal/cndp","/legal/accessibilite","/legal/sitemap"][i]} style={s.footerLink}>{l}</Link>
          ))}
        </div>
        <div style={s.footerCopy}>© 2026 SihaIQ · Casablanca, Maroc · Tous droits réservés</div>
      </footer>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#FAFAF8", fontFamily: "'Plus Jakarta Sans',-apple-system,system-ui,sans-serif", color: "#1C1917" },
  nav: { background: "white", borderBottom: "1px solid #E8E6E1", padding: "0 28px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 },
  navLogo: { fontSize: 16, fontWeight: 700, color: "#1C1917", textDecoration: "none", letterSpacing: "-0.02em" },
  navBack: { fontSize: 13, color: "#57534E", textDecoration: "none" },
  inner: { maxWidth: 760, margin: "0 auto", padding: "64px 28px 80px" },
  header: { marginBottom: 48, paddingBottom: 32, borderBottom: "1px solid #E8E6E1" },
  eyebrow: { fontSize: 11, fontWeight: 700, color: "#6366F1", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 },
  h1: { fontSize: 36, fontWeight: 800, color: "#1C1917", letterSpacing: "-0.03em", marginBottom: 10 },
  meta: { fontSize: 13, color: "#A8A29E" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  sectionBox: { background: "white", border: "1px solid #E8E6E1", borderRadius: 12, padding: 24 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#6366F1", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #F4F3F0" },
  linkRow: { display: "block", padding: "10px 0", borderBottom: "1px solid #F4F3F0", textDecoration: "none", transition: "all 0.15s" },
  linkLabel: { fontSize: 13, fontWeight: 500, color: "#1C1917", marginBottom: 2 },
  linkDesc: { fontSize: 12, color: "#A8A29E" },
  footer: { background: "#1C1917", padding: "32px 28px 24px", marginTop: 40 },
  footerInner: { maxWidth: 720, margin: "0 auto 16px", display: "flex", gap: 24, flexWrap: "wrap" },
  footerLink: { fontSize: 12, color: "#71717A", textDecoration: "none" },
  footerCopy: { maxWidth: 720, margin: "0 auto", fontSize: 12, color: "#52525B" },
};