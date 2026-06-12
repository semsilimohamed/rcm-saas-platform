/**
 * SihaIQ brand migration — dashboard sub-pages
 * Applies the exact token map already verified on dashboard/page.tsx.
 *
 * Usage (from repo root C:\Users\RPC\rcm-saas-platform):
 *   node migrate-brand.mjs           -> DRY RUN: shows what would change, writes nothing
 *   node migrate-brand.mjs --write   -> applies changes
 *
 * Prerequisite: git add -A && git commit -m "pre brand migration"  (your rollback)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const WRITE = process.argv.includes("--write");

const FILES = [
  "frontend/app/dashboard/audit/page.tsx",
  "frontend/app/dashboard/comptabilite/page.tsx",
  "frontend/app/dashboard/dossiers/page.tsx",
  "frontend/app/dashboard/encours/page.tsx",
  "frontend/app/dashboard/financier/page.tsx",
  "frontend/app/dashboard/forclusion/page.tsx",
  "frontend/app/dashboard/patients/page.tsx",
  "frontend/app/dashboard/performance/page.tsx",
  "frontend/app/dashboard/prediction/page.tsx",
  "frontend/app/dashboard/settings/page.tsx",
];

/* Ordered: specific strings FIRST (so globals don't eat them), then global hex tokens. */
const REPLACEMENTS = [
  // Payer chart palette -> aligned with landing hero (CNOPS/CNSS/AMO/AMO-Tadamon)
  ['["#0F62FE", "#16A34A", "#F59E0B", "#8B5CF6"]', '["#5B4FE8", "#1D9E75", "#F2711C", "#9CA3AF"]'],
  // Leftover purple accent on money KPIs -> SihaIQ orange
  ['accent: "#8B5CF6"', 'accent: "#F2711C"'],
  // Modal overlay navy -> warm dark
  ["rgba(12,27,51,0.5)", "rgba(26,24,20,0.55)"],
  // ── Global brand tokens: blue system -> violet system ──
  ["#0F62FE", "#5B4FE8"],   // primary
  ["#93C5FD", "#C7C2F7"],   // logo accent lines
  ["#E6F1FB", "#EEEDFB"],   // light tint bg
  ["#B5D4F4", "#C7C2F7"],   // light tint border
  ["#185FA5", "#4A3FD4"],   // dark accent text
  ["#378ADD", "#7B72F0"],   // link accent
  // ── Neutrals: cold gray-blue -> warm SihaIQ grays ──
  ["#0C1B33", "#1A1814"],
  ["#1A1D23", "#1A1814"],
  ["#9EA3AE", "#9C9890"],
  ["#6B7280", "#5C5852"],
  ["#F0F4FA", "#F2F1EE"],
  ["#E2E4E9", "#E5E3DD"],
  ["#EEF2F8", "#F2F1EE"],
  ["#FAFBFF", "#FAFAF7"],
  ["#F8FBFF", "#F8F7FE"],
  ["#F5F7FA", "#F5F4F1"],
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

let grandTotal = 0;
let missing = 0;

for (const rel of FILES) {
  const path = join(process.cwd(), rel);
  if (!existsSync(path)) {
    console.log(`✗ ABSENT   ${rel}`);
    missing++;
    continue;
  }
  let src = readFileSync(path, "utf8");
  let fileCount = 0;
  const perToken = [];

  for (const [from, to] of REPLACEMENTS) {
    const re = new RegExp(escape(from), "g");
    const n = (src.match(re) || []).length;
    if (n > 0) {
      src = src.replace(re, to);
      fileCount += n;
      perToken.push(`${from} -> ${to} (${n})`);
    }
  }

  grandTotal += fileCount;
  if (fileCount === 0) {
    console.log(`= AUCUN    ${rel} (déjà migré ou palette différente)`);
  } else {
    console.log(`${WRITE ? "✓ ÉCRIT" : "~ DRY-RUN"}  ${rel} — ${fileCount} remplacement(s)`);
    for (const t of perToken) console.log(`             ${t}`);
    if (WRITE) writeFileSync(path, src, "utf8");
  }
}

console.log(`\n${WRITE ? "APPLIQUÉ" : "DRY RUN (rien écrit — relancer avec --write)"} : ${grandTotal} remplacements sur ${FILES.length - missing}/${FILES.length} fichiers.`);
if (missing > 0) console.log(`⚠ ${missing} fichier(s) introuvable(s) — exécuter depuis la racine du repo.`);
if (!WRITE && grandTotal > 0) console.log("Vérifier la liste ci-dessus, puis: node migrate-brand.mjs --write");
