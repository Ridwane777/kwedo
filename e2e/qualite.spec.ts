import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { connecter, reinitialiser } from "./session";

const CAP = process.env.KWEDO_CAPTURES ?? ".captures";

const COMMERCANT = ["/", "/connexion", "/app", "/app/simulateur", "/app/conseils", "/app/dossier", "/app/credit", "/app/activite", "/app/inscription", "/app/flux", "/app/compte"];
const CONSOLE = ["/console", "/console/demandes", "/console/credits", "/console/recouvrement", "/console/commercants", "/console/parametres", "/console/journal", "/demo", "/admin"];

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000); // réinitialisation avec historique de démo (ADR 0019)
  const page = await browser.newPage();
  await reinitialiser(page.request);
  await page.close();
});

for (const theme of ["light", "dark"] as const)
for (const [largeur, pages] of [[360, COMMERCANT], [1440, [...COMMERCANT.slice(0, 1), ...CONSOLE, "FICHE", "CREDIT", "COMMERCANT"]]] as const) {
  for (const chemin of pages) {
    test(`a11y + capture ${chemin} @${largeur} ${theme}`, async ({ page }) => {
      // Thème choisi avant le premier rendu, comme le ferait le script de la page après un choix mémorisé.
      await page.addInitScript((t) => { try { localStorage.setItem("kwedo-theme", t); } catch {} }, theme);
      await connecter(page.request, "commercant", chemin === "/admin" ? "admin" : "agent-lagune");
      let url: string = chemin;
      if (chemin === "FICHE") {
        const f = await (await page.request.get("/api/dossiers")).json();
        url = `/console/dossiers/${f.find((d: { alertes: string[] }) => d.alertes.length).id}`;
      }
      if (chemin === "CREDIT") url = `/console/credits/${(await (await page.request.get("/api/console/credits?onglet=en_retard")).json()).elements[0].id}`;
      if (chemin === "COMMERCANT") url = "/console/commercants/com-hounkpe";
      await page.setViewportSize({ width: largeur, height: largeur < 500 ? 780 : 900 });
      const erreurs: string[] = [];
      page.on("pageerror", (e) => erreurs.push(String(e)));
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
      await page.screenshot({ path: `${CAP}/q-${url.replace(/[^\w]+/g, "_")}-${largeur}-${theme}.png`, fullPage: true });
      const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).exclude("iframe").analyze();
      const graves = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      const resume = graves.map((v) => `${v.id} (${v.impact}) : ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
      expect(resume, resume.join("\n")).toEqual([]);
      expect(erreurs).toEqual([]);
      // Débordement horizontal : interdit en mobile.
      if (largeur === 360) {
        const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        expect(deborde, "débordement horizontal à 360 px").toBe(false);
      }
    });
  }
}
