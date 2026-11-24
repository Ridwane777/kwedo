// Contrastes WCAG 2.1 des jetons, lus dans apps/web/app/globals.css, sur CHAQUE niveau de surface, clair et sombre.
// Usage : node scripts/contrastes.mjs [--strict]  (--strict : code de sortie 1 si une paire passe sous son seuil)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const css = readFileSync(fileURLToPath(new URL("../apps/web/app/globals.css", import.meta.url)), "utf8");
const bloc = (re) => Object.fromEntries([...css.match(re)[1].matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const T = {
  clair: bloc(/^:root \{([\s\S]*?)\n\}/m),
  sombre: bloc(/:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/),
};

const L = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const r = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const SURFACES = ["fond", "surface", "surface-2", "surface-3"];
// [texte, seuil] : 4,5 pour le texte courant, 3 pour les éléments graphiques (traits de courbe, icônes, focus).
// « ambre » (seuil 0) : point ou liseré qui accompagne toujours un libellé, jamais seul porteur de sens ; affiché pour information.
const TEXTES = [["encre", 4.5], ["encre-2", 4.5], ["encre-3", 4.5], ["marque", 4.5], ["montant", 4.5], ["alerte", 4.5], ["bon", 4.5], ["ambre-encre", 4.5], ["focus", 3], ["ambre", 0]];
const PAIRES = [["sur-action", "action", 4.5], ["marque", "marque-doux", 4.5], ["alerte", "alerte-doux", 4.5], ["bon", "bon-doux", 4.5], ["ambre-encre", "ambre-doux", 4.5], ["fond", "encre", 4.5],
  ["sur-scene", "scene", 4.5], ["sur-scene-2", "scene", 4.5],   // panneau de marque de la connexion
  ["logo-cauri", "fond", 3], ["logo-barre", "fond", 3], ["logo-cauri", "surface", 3]]; // marque (élément graphique)

let echec = 0;
for (const [nom, t] of Object.entries(T)) {
  console.log(`\n## ${nom}\n\n| texte \\ surface | ${SURFACES.join(" | ")} |\n|---|${SURFACES.map(() => "---").join("|")}|`);
  for (const [x, seuil] of TEXTES) {
    if (!t[x]) continue;
    const cells = SURFACES.map((s) => { const v = r(t[x], t[s]); if (v < seuil) echec++; return `${v.toFixed(2).replace(".", ",")}${v < seuil ? " ✗" : ""}`; });
    console.log(`| ${x} (≥ ${seuil}) | ${cells.join(" | ")} |`);
  }
  console.log("\n| paire | rapport |\n|---|---|");
  for (const [a, b, seuil] of PAIRES) {
    if (!t[a] || !t[b]) continue;
    const v = r(t[a], t[b]); if (v < seuil) echec++;
    console.log(`| ${a} / ${b} | ${v.toFixed(2).replace(".", ",")}${v < seuil ? " ✗" : ""} |`);
  }
}
console.log(`\n${echec ? `${echec} paire(s) sous le seuil` : "Toutes les paires passent AA."}`);
if (process.argv.includes("--strict") && echec) process.exit(1);
