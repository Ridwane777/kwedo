// Renomme les tokens de l'ancien thème « registre vivant » vers le système « comptoir » (ADR 0010).
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const racine = process.argv[2];
const P = "(bg|text|border|divide|ring|outline|fill|stroke|decoration|accent|caret|from|to|via|border-[trblxy])";
const REGLES = [
  [new RegExp(`\\b${P}-papier-3`, "g"), "$1-surface-3"],
  [new RegExp(`\\b${P}-papier-2`, "g"), "$1-surface-2"],
  [new RegExp(`\\b${P}-papier\\b`, "g"), "$1-fond"],
  [new RegExp(`\\b${P}-indigo`, "g"), "$1-marque"],
  [new RegExp(`\\b${P}-terre`, "g"), "$1-alerte"],
  [new RegExp(`\\b${P}-feuille`, "g"), "$1-bon"],
  [new RegExp(`\\b${P}-safran`, "g"), "$1-ambre"],
  [/var\(--papier-3\)/g, "var(--surface-3)"],
  [/var\(--papier-2\)/g, "var(--surface-2)"],
  [/var\(--papier\)/g, "var(--fond)"],
  [/var\(--indigo/g, "var(--marque"],
  [/var\(--terre/g, "var(--alerte"],
  [/var\(--feuille/g, "var(--bon"],
  [/var\(--safran/g, "var(--ambre"],
];

function parcourir(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) parcourir(p);
    else if (/\.(tsx|ts)$/.test(n)) {
      const avant = readFileSync(p, "utf8");
      let t = avant;
      for (const [r, s] of REGLES) t = t.replace(r, s);
      if (t !== avant) { writeFileSync(p, t); console.log(p); }
    }
  }
}
for (const d of ["app", "components", "lib"]) parcourir(join(racine, d));
