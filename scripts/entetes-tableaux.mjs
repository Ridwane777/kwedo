// Harmonise les en-têtes de tableaux (ADR 0010) : plus de capitales espacées ni de filet épais.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function parcourir(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) parcourir(p);
    else if (n.endsWith(".tsx")) {
      const avant = readFileSync(p, "utf8");
      const t = avant
        .replace(/border-b-2 border-encre text-xs uppercase tracking-wide text-encre-2/g, "border-b border-trait bg-surface-2/60 text-xs font-semibold text-encre-2 [&_th]:px-3 [&_th]:font-semibold")
        .replace(/text-xs uppercase tracking-wide/g, "text-xs font-semibold")
        .replace(/text-xs font-medium uppercase tracking-wide text-encre-2/g, "text-sm font-semibold text-encre")
        .replace(/ uppercase tracking-(wide|wider|widest)/g, " font-semibold");
      if (t !== avant) { writeFileSync(p, t); console.log(p); }
    }
  }
}
parcourir(join(process.argv[2], "app"));
parcourir(join(process.argv[2], "components"));
