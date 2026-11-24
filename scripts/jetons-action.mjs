// ADR 0012 : le bouton principal et les gros montants passent sur des jetons dédiés (action, montant).
// En clair ils valent la marque (aucun changement visible) ; en sombre ils deviennent sobres et neutres.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function parcourir(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) parcourir(p);
    else if (n.endsWith(".tsx")) {
      const avant = readFileSync(p, "utf8");
      const t = avant
        .replace(/bg-marque text-fond/g, "bg-action text-sur-action")
        .replace(/className="([^"]*\bmontant\b[^"]*)"/g, (m, c) => `className="${c.replace(/\btext-marque\b/, "text-montant")}"`);
      if (t !== avant) { writeFileSync(p, t); console.log(p); }
    }
  }
}
for (const d of ["app", "components"]) parcourir(join(process.argv[2], d));
