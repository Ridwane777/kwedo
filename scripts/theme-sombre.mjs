// Réécrit les deux blocs sombres de globals.css à partir d'une seule liste (ADR 0012, docs/design.md).
// Graphite neutre légèrement chaud, accent désaturé ; la profondeur vient de la clarté des surfaces.
import { readFileSync, writeFileSync } from "node:fs";

export const SOMBRE = {
  fond: "#141312", surface: "#1c1b19", "surface-2": "#252422", "surface-3": "#2f2d2a", trait: "#3b3936",
  encre: "#ecebe7", "encre-2": "#c2beb7", "encre-3": "#a29d95",
  marque: "#8db3a4", "marque-doux": "#263330",
  action: "#3c5f53", "sur-action": "#f1efea", montant: "#ecebe7",
  alerte: "#e3a197", "alerte-doux": "#3b2522",
  bon: "#9ec4a6", "bon-doux": "#24302a",
  ambre: "#cfa55a", "ambre-encre": "#e5cc93", "ambre-doux": "#372f20",
  focus: "#a9c9bc", cadre: "#3b3936",
  "logo-barre": "#ecebe7", "logo-cauri": "#d4c6a1",
  ombre: "0 0 0 1px rgb(255 255 255 / 0.04)",
};

if (process.argv[2]) {
  const f = process.argv[2];
  const corps = (ind) => Object.entries(SOMBRE).map(([k, v]) => `${ind}--${k}: ${v};`).join("\n");
  let t = readFileSync(f, "utf8");
  t = t.replace(/:root\[data-theme="dark"\] \{[\s\S]*?\n\}/, `:root[data-theme="dark"] {\n  color-scheme: dark;\n${corps("  ")}\n}`);
  t = t.replace(/(:root:not\(\[data-theme="light"\]\):not\(\[data-theme="dark"\]\) \{)[\s\S]*?\n  \}/,
    `$1\n    color-scheme: dark;\n${corps("    ")}\n  }`);
  writeFileSync(f, t);
  console.log("blocs sombres réécrits");
}
