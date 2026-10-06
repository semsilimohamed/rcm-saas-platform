// Legal page: personal-data protection notice (CNDP, Loi 09-08). Static.

import Link from "next/link";

/**
 * CNDP / Loi 09-08 notice.
 */
export default function CNDPPage() {
  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <Link href="/" style={s.navLogo}>Siha<span style={{color:"#6366F1"}}>IQ</span></Link>
        <Link href="/" style={s.navBack}>← Retour à l&apos;accueil</Link>
      </nav>
      <div style={s.inner}>
        <div style={s.header}>
          <div style={s.eyebrow}>Conformité</div>
          <h1 style={s.h1}>Conformité CNDP — Loi 09-08</h1>
          <p style={s.meta}>Dernière mise à jour : 1er juin 2026 · SihaIQ · Casablanca, Maroc</p>
        </div>

        <div style={s.infoBox}>
          <strong>SihaIQ est architecturé dès la conception pour respecter intégralement la Loi 09-08</strong> relative à la protection des personnes physiques à l&apos;égard du traitement des données à caractère personnel, promulguée par Dahir n° 1-09-15 du 22 safar 1430 (18 février 2009).
        </div>

        <div style={s.pillarGrid}>
          {[
            { icon: "🔬", color: "#EEF2FF", border: "#C7D2FE", iconColor: "#4338CA", title: "Données synthétiques uniquement", body: "Conformément aux exigences de la CNDP, aucune donnée patient réelle n'est utilisée dans l'entraînement des modèles d'intelligence artificielle de SihaIQ. L'ensemble du corpus d'entraînement est composé de données synthétiques BAF générées à partir de distributions statistiques réelles, sans aucune information permettant d'identifier un patient." },
            { icon: "🏗️", color: "#FFF7ED", border: "#FED7AA", iconColor: "#C2410C", title: "Architecture multi-tenant isolée", body: "Chaque établissement de santé abonné à SihaIQ dispose d'un espace de données strictement isolé via Row Level Security PostgreSQL. Il est techniquement impossible pour un établissement d'accéder aux données d'un autre établissement. L'isolation est garantie au niveau de la base de données, pas seulement au niveau applicatif." },
            { icon: "📜", color: "#DCFCE7", border: "#86EFAC", iconColor: "#166534", title: "Journal d'audit immuable", body: "Toutes les actions effectuées sur la Plateforme sont enregistrées dans un journal d'audit immuable : connexions, créations/modifications/suppressions de dossiers, changements de statut, exports. Ce journal est conservé 5 ans et peut être fourni à la CNDP sur demande dans le cadre d'un contrôle." },
            { icon: "👤", color: "#EEF2FF", border: "#C7D2FE", iconColor: "#4338CA", title: "Minimisation des données", body: "SihaIQ applique le principe de minimisation des données : seules les informations strictement nécessaires au fonctionnement du service RCM sont collectées. Les données de santé des patients ne transitent pas par les serveurs SihaIQ — seules les métadonnées de facturation (codes NGAP, montants, statuts) sont traitées." },
            { icon: "🔒", color: "#FFF7ED", border: "#FED7AA", iconColor: "#C2410C", title: "Chiffrement et sécurité", body: "Toutes les communications sont chiffrées en transit via TLS 1.3. Les données au repos sont chiffrées via AES-256. Les mots de passe utilisateurs sont hashés avec bcrypt (facteur de coût adaptatif). Les tokens JWT ont une durée de vie limitée avec rotation automatique." },
            { icon: "⚖️", color: "#DCFCE7", border: "#86EFAC", iconColor: "#166534", title: "Droits des personnes concernées", body: "SihaIQ fournit les mécanismes permettant aux responsables de traitement (établissements de santé) d'exercer les droits de leurs patients : droit d'accès, de rectification, d'opposition et d'effacement. Ces fonctionnalités sont accessibles depuis le panneau d'administration de la Plateforme." },
          ].map(p => (
            <div key={p.title} style={{ ...s.pillar, background: p.color, border: `1px solid ${p.border}` }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>{p.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: p.iconColor, marginBottom: 8 }}>{p.title}</div>
              <div style={{ fontSize: 13, color: "#57534E", lineHeight: 1.7 }}>{p.body}</div>
            </div>
          ))}
        </div>

        <div style={s.section}>
          <h2 style={s.h2}>Adaptation à la Loi 54-23 (fusion CNOPS → CNSS)</h2>
          <p style={s.body}>La Loi 54-23 portant réforme de l&apos;Assurance Maladie Obligatoire entraîne la migration progressive de CNOPS vers CNSS. SihaIQ intègre un mécanisme de détection automatique de dérive du modèle lors de cette transition réglementaire. Le modèle SihaIQ sera automatiquement réentraîné sur les nouvelles règles de remboursement CNSS dès qu&apos;un volume suffisant de données labellisées sera disponible.</p>
        </div>

        <div style={s.section}>
          <h2 style={s.h2}>Contact CNDP et signalement</h2>
          <p style={s.body}>Pour toute question relative à la conformité CNDP de SihaIQ : <strong>dpo@sihaiq.ma</strong>. En cas de réclamation non résolue, vous pouvez saisir la Commission Nationale de contrôle de la protection des Données à caractère Personnel : <strong>www.cndp.ma</strong>.</p>
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
  header: { marginBottom: 32, paddingBottom: 32, borderBottom: "1px solid #E8E6E1" },
  eyebrow: { fontSize: 11, fontWeight: 700, color: "#6366F1", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 },
  h1: { fontSize: 36, fontWeight: 800, color: "#1C1917", letterSpacing: "-0.03em", marginBottom: 10 },
  meta: { fontSize: 13, color: "#A8A29E" },
  infoBox: { background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 10, padding: "16px 20px", fontSize: 14, color: "#4338CA", lineHeight: 1.7, marginBottom: 40 },
  pillarGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 40 },
  pillar: { borderRadius: 12, padding: 24 },
  section: { marginBottom: 36, paddingBottom: 36, borderBottom: "1px solid #F4F3F0" },
  h2: { fontSize: 16, fontWeight: 700, color: "#1C1917", marginBottom: 10 },
  body: { fontSize: 14, color: "#57534E", lineHeight: 1.8 },
  footer: { background: "#1C1917", padding: "32px 28px 24px", marginTop: 40 },
  footerInner: { maxWidth: 720, margin: "0 auto 16px", display: "flex", gap: 24, flexWrap: "wrap" },
  footerLink: { fontSize: 12, color: "#71717A", textDecoration: "none" },
  footerCopy: { maxWidth: 720, margin: "0 auto", fontSize: 12, color: "#52525B" },
};