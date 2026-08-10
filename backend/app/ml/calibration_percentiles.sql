-- ============================================================================
-- SihaIQ — recalibrage des zones d'affichage sur les scores RÉELLEMENT observés
-- ============================================================================
-- NE PAS UTILISER TANT QUE LE VOLUME EST FAIBLE.
-- Les seuils actuels (ZONE_MODERE=0.40 / ZONE_ELEVE=0.70 dans app/api/claims.py)
-- sont calés sur une grille synthétique de plages réalistes. Ils ne doivent être
-- remplacés par des quantiles observés qu'à partir de ~500 dossiers scorés par
-- le modèle v3 — en dessous, les quantiles sont instables et refléteraient
-- surtout les dossiers de test.
--
-- Prérequis : ne compter que les dossiers scorés par le RF v3. Les scores
-- antérieurs viennent de XGBoost v2 (5 organismes, distribution différente) et
-- FAUSSERAIENT le calage. Ajuster la date ci-dessous à la mise en production v3.
-- ============================================================================

-- 1) Volume disponible : vérifier AVANT de regarder les quantiles.
SELECT
    count(*)                             AS dossiers_scores,
    count(*) FILTER (WHERE created_at >= DATE '2026-08-10') AS scores_v3,
    min(risk_score)                      AS score_min,
    max(risk_score)                      AS score_max,
    round(avg(risk_score)::numeric, 4)   AS score_moyen
FROM claims
WHERE risk_score IS NOT NULL;

-- 2) Percentiles de la distribution réelle (le calage se lit ici).
--    p40 -> future borne ZONE_MODERE, p75 -> future borne ZONE_ELEVE,
--    pour conserver la répartition cible ÉLEVÉ 25% / MODÉRÉ 35% / FAIBLE 40%.
SELECT
    count(*)                                                              AS n,
    round(percentile_cont(0.10) WITHIN GROUP (ORDER BY risk_score)::numeric, 4) AS p10,
    round(percentile_cont(0.25) WITHIN GROUP (ORDER BY risk_score)::numeric, 4) AS p25,
    round(percentile_cont(0.40) WITHIN GROUP (ORDER BY risk_score)::numeric, 4) AS p40,
    round(percentile_cont(0.50) WITHIN GROUP (ORDER BY risk_score)::numeric, 4) AS p50,
    round(percentile_cont(0.60) WITHIN GROUP (ORDER BY risk_score)::numeric, 4) AS p60,
    round(percentile_cont(0.75) WITHIN GROUP (ORDER BY risk_score)::numeric, 4) AS p75,
    round(percentile_cont(0.90) WITHIN GROUP (ORDER BY risk_score)::numeric, 4) AS p90
FROM claims
WHERE risk_score IS NOT NULL
  AND created_at >= DATE '2026-08-10';

-- 3) Répartition actuelle dans les 3 zones : mesure la sur/sous-alerte réelle.
SELECT
    CASE
        WHEN risk_score >= 0.70 THEN 'ÉLEVÉ'
        WHEN risk_score >= 0.40 THEN 'MODÉRÉ'
        ELSE 'FAIBLE'
    END AS zone,
    count(*)                                              AS n,
    round(100.0 * count(*) / sum(count(*)) OVER (), 1)    AS pourcentage
FROM claims
WHERE risk_score IS NOT NULL
  AND created_at >= DATE '2026-08-10'
GROUP BY 1
ORDER BY min(risk_score) DESC;

-- 4) Contrôle du seuil de DÉCISION (0.40) : le seul vrai juge est le taux de
--    rejet observé par zone. C'est cette requête, pas les quantiles, qui dit si
--    le seuil recall-first est bien placé — à lancer dès qu'assez de dossiers
--    ont un statut définitif.
SELECT
    CASE WHEN risk_score >= 0.40 THEN 'danger' ELSE 'sure' END AS alerte,
    count(*)                                                    AS n,
    count(*) FILTER (WHERE status = 'rejected')                 AS rejetes,
    round(100.0 * count(*) FILTER (WHERE status = 'rejected') / NULLIF(count(*), 0), 1)
                                                                AS taux_rejet_pct
FROM claims
WHERE risk_score IS NOT NULL
  -- statuts définitifs uniquement (cf. VALID_STATUSES dans app/api/claims.py) :
  -- un dossier 'pending' ou 'contested' n'a pas encore d'issue connue.
  AND status IN ('rejected', 'approved', 'settled', 'closed')
  AND created_at >= DATE '2026-08-10'
GROUP BY 1;
-- Lecture : un bon seuil recall-first laisse TRÈS peu de rejets dans la zone
-- 'sure' (faux négatifs). Si la ligne 'sure' affiche un taux de rejet non
-- négligeable, abaisser SEUIL_DECISION — sans toucher aux ZONE_*.
