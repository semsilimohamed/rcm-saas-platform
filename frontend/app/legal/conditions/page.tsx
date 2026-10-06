// Legal page: terms of use. Static.

import Link from "next/link";

/**
 * Terms of use.
 */
export default function ConditionsPage() {
  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <Link href="/" style={s.navLogo}>Siha<span style={{color:"#6366F1"}}>IQ</span></Link>
        <Link href="/" style={s.navBack}>← Retour à l&apos;accueil</Link>
      </nav>
      <div style={s.inner}>
        <div style={s.header}>
          <div style={s.eyebrow}>Légal</div>
          <h1 style={s.h1}>Conditions d&apos;utilisation</h1>
          <p style={s.meta}>Dernière mise à jour : 1er juin 2026 · SihaIQ · Casablanca, Maroc</p>
        </div>
        {[
          {
            title: "1. Acceptation des conditions",
            body: `Tout accès ou utilisation de la plateforme SihaIQ (ci-après « la Plateforme ») implique l'acceptation pleine et entière des présentes Conditions d'utilisation. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser la Plateforme. SihaIQ se réserve le droit de modifier ces conditions à tout moment. Les utilisateurs seront notifiés de toute modification substantielle.`
          },
          {
            title: "2. Description du service",
            body: `SihaIQ est une plateforme SaaS (Software as a Service) de gestion du cycle de revenus (Revenue Cycle Management) destinée aux établissements de santé privés marocains. La Plateforme permet la prédiction IA des rejets de remboursement CNOPS/CNSS/FAR, la gestion des dossiers BAF, le suivi des délais de forclusion, et l'analyse financière du portefeuille de créances.`
          },
          {
            title: "3. Propriété intellectuelle",
            body: `L'ensemble des contenus, algorithmes, interfaces, logos, marques, modèles d'intelligence artificielle et données synthétiques de la Plateforme sont la propriété exclusive de SihaIQ ou de ses partenaires. Toute reproduction, distribution, modification ou exploitation commerciale sans autorisation écrite préalable est strictement interdite. Les abonnés bénéficient d'une licence d'utilisation limitée, non exclusive et non transférable dans le cadre de leur abonnement.`
          },
          {
            title: "4. Obligations de l'utilisateur",
            body: `L'utilisateur s'engage à : (a) utiliser la Plateforme conformément aux lois marocaines en vigueur, notamment la Loi 09-08 relative à la protection des données personnelles ; (b) ne pas introduire de données patient réelles sans chiffrement adéquat ; (c) maintenir la confidentialité de ses identifiants de connexion ; (d) signaler immédiatement tout incident de sécurité à contact@sihaiq.ma ; (e) ne pas tenter de contourner les mesures de sécurité de la Plateforme.`
          },
          {
            title: "5. Données et confidentialité",
            body: `SihaIQ traite les données conformément à la Loi 09-08 (CNDP) et au Règlement Général sur la Protection des Données (RGPD) pour les établissements opérant en Europe. Aucune donnée patient réelle n'est utilisée dans l'entraînement des modèles d'intelligence artificielle. Les données de chaque établissement sont strictement isolées via une architecture multi-tenant avec Row Level Security PostgreSQL. Consultez notre Politique de confidentialité pour plus de détails.`
          },
          {
            title: "6. Disponibilité du service",
            body: `SihaIQ s'efforce de maintenir une disponibilité maximale de la Plateforme. Toutefois, des interruptions peuvent survenir pour maintenance planifiée, mises à jour de sécurité, ou événements indépendants de notre volonté (force majeure, pannes d'infrastructure tiers). SihaIQ ne peut être tenu responsable des pertes consécutives à une interruption de service.`
          },
          {
            title: "7. Limitation de responsabilité",
            body: `Dans les limites permises par la législation marocaine applicable, SihaIQ ne pourra être tenu responsable des dommages indirects, spéciaux ou consécutifs résultant de l'utilisation ou de l'impossibilité d'utiliser la Plateforme. La responsabilité de SihaIQ est limitée au montant des abonnements versés au cours des 12 mois précédant l'événement donnant lieu à responsabilité.`
          },
          {
            title: "8. Résiliation",
            body: `L'abonnement peut être résilié à tout moment par l'établissement abonné, sans frais de résiliation anticipée. La résiliation prend effet à la fin de la période de facturation en cours. SihaIQ peut suspendre ou résilier un compte en cas de violation des présentes conditions, après notification préalable de 7 jours ouvrables sauf en cas de violation grave.`
          },
          {
            title: "9. Droit applicable",
            body: `Les présentes Conditions d'utilisation sont régies par le droit marocain. Tout litige relatif à l'interprétation ou à l'exécution de ces conditions sera soumis à la compétence exclusive des tribunaux de Casablanca, Maroc, sauf disposition légale contraire impérative.`
          },
          {
            title: "10. Contact",
            body: `Pour toute question relative aux présentes Conditions d'utilisation : contact@sihaiq.ma · SihaIQ, Casablanca, Maroc.`
          },
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
  h2: { fontSize: 16, fontWeight: 700, color: "#1C1917", marginBottom: 10, letterSpacing: "-0.01em" },
  body: { fontSize: 14, color: "#57534E", lineHeight: 1.8 },
  footer: { background: "#1C1917", padding: "32px 28px 24px", marginTop: 40 },
  footerInner: { maxWidth: 720, margin: "0 auto 16px", display: "flex", gap: 24, flexWrap: "wrap" },
  footerLink: { fontSize: 12, color: "#71717A", textDecoration: "none" },
  footerCopy: { maxWidth: 720, margin: "0 auto", fontSize: 12, color: "#52525B" },
};