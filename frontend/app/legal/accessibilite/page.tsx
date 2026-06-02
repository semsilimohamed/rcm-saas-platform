import Link from "next/link";

export default function AccessibilitePage() {
  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <Link href="/" style={s.navLogo}>Siha<span style={{color:"#6366F1"}}>IQ</span></Link>
        <Link href="/" style={s.navBack}>← Retour à l&apos;accueil</Link>
      </nav>
      <div style={s.inner}>
        <div style={s.header}>
          <div style={s.eyebrow}>Accessibilité</div>
          <h1 style={s.h1}>Déclaration d&apos;accessibilité</h1>
          <p style={s.meta}>Dernière mise à jour : 1er juin 2026 · SihaIQ · Casablanca, Maroc</p>
        </div>
        {[
          { title: "Notre engagement", body: "SihaIQ s'engage à rendre sa plateforme accessible à tous les professionnels de santé et agents administratifs, quelles que soient leurs capacités. Nous travaillons à améliorer continuellement l'accessibilité de notre interface conformément aux recommandations WCAG 2.1 niveau AA." },
          { title: "Mesures d'accessibilité mises en place", body: "La Plateforme SihaIQ intègre les fonctionnalités d'accessibilité suivantes : contrastes de couleurs conformes aux ratios WCAG 2.1 (4.5:1 minimum pour le texte courant), navigation au clavier complète sur toutes les pages, attributs ARIA sur les composants interactifs, textes alternatifs sur les éléments visuels, taille de police ajustable sans perte de fonctionnalité, compatibilité avec les lecteurs d'écran courants (NVDA, VoiceOver)." },
          { title: "Contenu non accessible", body: "Certaines fonctionnalités de la Plateforme peuvent présenter des limitations d'accessibilité que nous travaillons à corriger : les graphiques SVG complexes du tableau de bord peuvent manquer de descriptions alternatives détaillées ; certains composants de formulaire avancés peuvent nécessiter une amélioration des libellés ARIA. Ces points sont en cours de traitement dans notre roadmap d'accessibilité." },
          { title: "Technologies de support testées", body: "SihaIQ a été testé avec les technologies d'assistance suivantes : lecteur d'écran NVDA avec Firefox sur Windows, VoiceOver avec Safari sur macOS et iOS, navigation au clavier seul sur Chrome et Firefox, zoom navigateur jusqu'à 200% sans perte de fonctionnalité." },
          { title: "Signaler un problème d'accessibilité", body: "Si vous rencontrez un obstacle d'accessibilité sur la Plateforme SihaIQ, nous vous invitons à nous contacter par email à : accessibilite@sihaiq.ma. Décrivez la page concernée, le problème rencontré, et la technologie d'assistance utilisée. Nous nous engageons à répondre dans un délai de 5 jours ouvrables et à apporter les corrections nécessaires dans un délai raisonnable." },
          { title: "Amélioration continue", body: "SihaIQ conduit des audits d'accessibilité réguliers et intègre les retours de ses utilisateurs dans ses cycles de développement. L'accessibilité est une priorité de notre roadmap produit et fait partie intégrante de nos critères de validation lors de chaque nouvelle fonctionnalité." },
        ].map(section => (
          <div key={section.title} style={s.section}>
            <h2 style={s.h2}>{section.title}</h2>
            <p style={s.body}>{section.body}</p>
          </div>
        ))}
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
  inner: { maxWidth: 720, margin: "0 auto", padding: "64px 28px 80px" },
  header: { marginBottom: 56, paddingBottom: 40, borderBottom: "1px solid #E8E6E1" },
  eyebrow: { fontSize: 11, fontWeight: 700, color: "#6366F1", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 },
  h1: { fontSize: 36, fontWeight: 800, color: "#1C1917", letterSpacing: "-0.03em", marginBottom: 10 },
  meta: { fontSize: 13, color: "#A8A29E" },
  section: { marginBottom: 36, paddingBottom: 36, borderBottom: "1px solid #F4F3F0" },
  h2: { fontSize: 16, fontWeight: 700, color: "#1C1917", marginBottom: 10 },
  body: { fontSize: 14, color: "#57534E", lineHeight: 1.8 },
  footer: { background: "#1C1917", padding: "32px 28px 24px", marginTop: 40 },
  footerInner: { maxWidth: 720, margin: "0 auto 16px", display: "flex", gap: 24, flexWrap: "wrap" },
  footerLink: { fontSize: 12, color: "#71717A", textDecoration: "none" },
  footerCopy: { maxWidth: 720, margin: "0 auto", fontSize: 12, color: "#52525B" },
};