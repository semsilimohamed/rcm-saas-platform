import Link from "next/link";

export default function ConfidentialitePage() {
  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <Link href="/" style={s.navLogo}>Siha<span style={{color:"#6366F1"}}>IQ</span></Link>
        <Link href="/" style={s.navBack}>← Retour à l&apos;accueil</Link>
      </nav>
      <div style={s.inner}>
        <div style={s.header}>
          <div style={s.eyebrow}>Légal</div>
          <h1 style={s.h1}>Politique de confidentialité</h1>
          <p style={s.meta}>Dernière mise à jour : 1er juin 2026 · SihaIQ · Casablanca, Maroc</p>
          <div style={s.infoBox}>
            Cette politique est conforme à la <strong>Loi 09-08</strong> relative à la protection des personnes physiques à l&apos;égard du traitement des données à caractère personnel (CNDP, Maroc) et au <strong>Règlement Général sur la Protection des Données (RGPD)</strong> de l&apos;Union Européenne.
          </div>
        </div>
        {[
          { title: "1. Responsable du traitement", body: "SihaIQ est le responsable du traitement des données à caractère personnel collectées via la Plateforme. Contact DPO : dpo@sihaiq.ma · SihaIQ, Casablanca, Maroc." },
          { title: "2. Données collectées", body: "SihaIQ collecte uniquement les données nécessaires au fonctionnement de la Plateforme : (a) données d'identification de l'établissement de santé (nom, adresse, email de contact) ; (b) données de compte utilisateur (nom, prénom, email, rôle) ; (c) données de facturation (adresse de facturation, référence abonnement) ; (d) données d'utilisation anonymisées (logs d'audit, métriques de performance). SihaIQ ne collecte aucune donnée patient réelle. Les modèles d'intelligence artificielle sont entraînés exclusivement sur des données synthétiques BAF certifiées." },
          { title: "3. Finalités du traitement", body: "Les données collectées sont utilisées pour : (a) la fourniture et l'amélioration du service SihaIQ ; (b) la gestion des comptes et des abonnements ; (c) la communication relative au service (mises à jour, alertes de sécurité) ; (d) la conformité légale et réglementaire ; (e) la détection et la prévention des fraudes. Aucune donnée n'est utilisée à des fins de profilage commercial ou de publicité ciblée." },
          { title: "4. Base légale du traitement", body: "Le traitement des données est fondé sur : (a) l'exécution du contrat d'abonnement SihaIQ ; (b) les obligations légales applicables (Loi 09-08, réglementations sectorielles de santé) ; (c) l'intérêt légitime de SihaIQ pour la sécurité et l'amélioration du service ; (d) le consentement explicite de l'utilisateur pour les communications marketing optionnelles." },
          { title: "5. Conservation des données", body: "Les données de compte sont conservées pendant toute la durée de l'abonnement et supprimées dans un délai de 30 jours suivant la résiliation, sauf obligation légale de conservation plus longue. Les logs d'audit sont conservés 5 ans conformément aux obligations CNDP. Les données de facturation sont conservées 10 ans conformément au droit marocain des obligations commerciales." },
          { title: "6. Sécurité et souveraineté des données", body: "SihaIQ met en œuvre des mesures techniques et organisationnelles appropriées pour protéger les données : chiffrement en transit (TLS 1.3) et au repos (AES-256), architecture multi-tenant avec isolation Row Level Security PostgreSQL, journalisation immuable de toutes les actions, contrôle d'accès basé sur les rôles (RBAC). Les données des établissements marocains sont hébergées en conformité avec les exigences de souveraineté numérique marocaine." },
          { title: "7. Droits des personnes concernées", body: "Conformément à la Loi 09-08, chaque utilisateur dispose des droits suivants : droit d'accès, droit de rectification, droit d'opposition, droit à l'effacement, droit à la limitation du traitement. Ces droits peuvent être exercés par email à : dpo@sihaiq.ma. Toute demande sera traitée dans un délai de 30 jours. En cas de litige, vous pouvez saisir la CNDP (Commission Nationale de contrôle de la protection des Données à caractère Personnel) : www.cndp.ma." },
          { title: "8. Transferts internationaux", body: "SihaIQ n'effectue pas de transferts de données à caractère personnel vers des pays tiers en dehors du Maroc et de l'Espace Économique Européen sans les garanties appropriées requises par la Loi 09-08. Tout sous-traitant traitant des données pour le compte de SihaIQ est contractuellement tenu au respect des mêmes obligations de protection." },
          { title: "9. Cookies et traceurs", body: "La Plateforme utilise uniquement des cookies strictement nécessaires au fonctionnement du service (authentification JWT, préférences de session). Aucun cookie publicitaire ou de suivi comportemental n'est utilisé. Vous pouvez configurer votre navigateur pour refuser les cookies, ce qui peut affecter certaines fonctionnalités de la Plateforme." },
          { title: "10. Modifications de la politique", body: "SihaIQ se réserve le droit de modifier la présente politique. Les utilisateurs seront informés par email de toute modification substantielle au moins 30 jours avant son entrée en vigueur. La poursuite de l'utilisation de la Plateforme après notification vaut acceptation des modifications." },
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
  meta: { fontSize: 13, color: "#A8A29E", marginBottom: 16 },
  infoBox: { background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "#4338CA", lineHeight: 1.7 },
  section: { marginBottom: 36, paddingBottom: 36, borderBottom: "1px solid #F4F3F0" },
  h2: { fontSize: 16, fontWeight: 700, color: "#1C1917", marginBottom: 10, letterSpacing: "-0.01em" },
  body: { fontSize: 14, color: "#57534E", lineHeight: 1.8 },
  footer: { background: "#1C1917", padding: "32px 28px 24px", marginTop: 40 },
  footerInner: { maxWidth: 720, margin: "0 auto 16px", display: "flex", gap: 24, flexWrap: "wrap" },
  footerLink: { fontSize: 12, color: "#71717A", textDecoration: "none" },
  footerCopy: { maxWidth: 720, margin: "0 auto", fontSize: 12, color: "#52525B" },
};