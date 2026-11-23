// Captures d'écran pour relecture visuelle. Usage : node scripts/capture.mjs <base> <sortie> <chemin>... [--large]
import { chromium } from "@playwright/test";

const [base, sortie, ...reste] = process.argv.slice(2);
const large = reste.includes("--large");
const chemins = reste.filter((c) => !c.startsWith("--"));
const navigateur = await chromium.launch();
for (const largeur of large ? [1440] : [360, 1440]) {
  const page = await navigateur.newPage({ viewport: { width: largeur, height: largeur < 500 ? 780 : 900 }, deviceScaleFactor: 1 });
  const erreurs = [];
  page.on("console", (m) => m.type() === "error" && erreurs.push(m.text()));
  page.on("pageerror", (e) => erreurs.push(String(e)));
  for (const c of chemins) {
    await page.goto(base + c, { waitUntil: "networkidle" });
    await page.waitForTimeout(1800);
    const nom = `${sortie}/${c.replace(/[^\w]+/g, "_") || "racine"}-${largeur}.png`;
    await page.screenshot({ path: nom, fullPage: true });
    console.log(nom, erreurs.length ? `ERREURS: ${erreurs.join(" | ")}` : "ok");
    erreurs.length = 0;
  }
  await page.close();
}
await navigateur.close();
