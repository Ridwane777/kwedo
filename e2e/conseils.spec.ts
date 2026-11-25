import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { connecter, reinitialiser } from "./session";

const CAP = ".captures/revue-conseils";

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000); // réinitialisation avec historique de démo (ADR 0019)
  const page = await browser.newPage();
  await reinitialiser(page.request);
  await page.close();
});

for (const theme of ["light", "dark"] as const)
for (const largeur of [360, 768, 1440, 1920]) {
  test(`conseils chiffrés @${largeur} ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => { try { localStorage.setItem("kwedo-theme", t); } catch {} }, theme);
    await connecter(page.request, "commercant");
    await page.setViewportSize({ width: largeur, height: largeur < 500 ? 780 : 900 });
    const erreurs: string[] = [];
    page.on("pageerror", (e) => erreurs.push(String(e)));
    await page.goto("/app/conseils");
    await expect(page.getByRole("heading", { name: "Faire monter mon plafond" })).toBeVisible();
    await expect(page.getByText(/peut monter d'environ|déjà au mieux/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Effet estimé sur le plafond").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ce qui va déjà bien" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Paliers d'historique vérifié" })).toBeVisible();
    await expect(page.getByText(/écart relatif/)).toHaveCount(0);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${CAP}/conseils-${largeur}-${theme}.png`, fullPage: true });
    const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(deborde, `débordement horizontal à ${largeur} px`).toBe(false);
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const graves = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id);
    expect(graves).toEqual([]);
    expect(erreurs).toEqual([]);
  });
}
