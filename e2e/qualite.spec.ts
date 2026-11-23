import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { connecter, reinitialiser } from "./session";

const CAP = process.env.KWEDO_CAPTURES ?? ".captures";

const COMMERCANT = ["/", "/connexion", "/app", "/app/simulateur", "/app/conseils", "/app/dossier", "/app/credit", "/app/activite", "/app/inscription", "/app/flux", "/app/compte"];
const CONSOLE = ["/console", "/console/portefeuille", "/console/parametres", "/console/journal", "/demo", "/admin"];

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await reinitialiser(page.request);
  await page.close();
});

for (const [largeur, pages] of [[360, COMMERCANT], [1440, [...COMMERCANT.slice(0, 1), ...CONSOLE, "FICHE"]]] as const) {
  for (const chemin of pages) {
    test(`a11y + capture ${chemin} @${largeur}`, async ({ page }) => {
      await connecter(page.request, "commercant", chemin === "/admin" ? "admin" : "agent-lagune");
      let url: string = chemin;
      if (chemin === "FICHE") {
        const f = await (await page.request.get("/api/dossiers")).json();
        url = `/console/dossiers/${f.find((d: { alertes: string[] }) => d.alertes.length).id}`;
      }
      await page.setViewportSize({ width: largeur, height: largeur < 500 ? 780 : 900 });
      const erreurs: string[] = [];
      page.on("pageerror", (e) => erreurs.push(String(e)));
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${CAP}/q-${url.replace(/[^\w]+/g, "_")}-${largeur}.png`, fullPage: true });
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
