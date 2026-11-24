import { expect, test, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { connecter, reinitialiser } from "../e2e/session";

// Captures de la vraie application (données simulées) pour l'accueil, en clair et en sombre.
const DOSSIER = "apps/web/public/ecrans";
mkdirSync(DOSSIER, { recursive: true });
test.describe.configure({ mode: "serial" });

async function photo(page: Page, nom: string, theme: string) {
  await page.waitForLoadState("networkidle");
  await expect(page.locator('[role="status"][aria-label^="Chargement"]')).toHaveCount(0, { timeout: 20_000 });
  await page.waitForTimeout(1600); // fin des animations d'entrée (courbe, montant)
  await page.screenshot({ path: `${DOSSIER}/${nom}-${theme}.jpg`, type: "jpeg", quality: 72 });
}

async function telephone(b: Browser, theme: "light" | "dark") {
  const p = await b.newPage({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2, colorScheme: theme, reducedMotion: "reduce" });
  await connecter(p.request, "commercant");
  return p;
}
async function bureau(b: Browser, theme: "light" | "dark") {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: theme, reducedMotion: "reduce" });
  await connecter(p.request, "agent-lagune");
  return p;
}

for (const theme of ["light", "dark"] as const) {
  const t = theme === "light" ? "clair" : "sombre";
  test(`écrans de la vitrine (${t})`, async ({ browser }) => {
    test.setTimeout(240_000);
    const admin = await browser.newPage();
    await reinitialiser(admin.request);

    const tel = await telephone(browser, theme);
    await tel.goto("/app"); await photo(tel, "estimation", t);
    await tel.goto("/app/simulateur"); await photo(tel, "simulateur", t);

    // Démo jouée jusqu'à l'offre : accord et envoi, puis décision ajustée côté prêteur.
    await admin.setViewportSize({ width: 1600, height: 1000 });
    await admin.goto("/demo");
    await admin.getByRole("button", { name: "Réinitialiser la démo" }).click();
    await expect(admin.getByText("Démo réinitialisée")).toBeVisible({ timeout: 30_000 });
    for (const [n, action] of [[4, "Donner l'accord et envoyer"], [5, "Ajuster avec justificatif"]] as const) {
      await admin.getByRole("button", { name: String(n), exact: true }).click();
      await admin.getByRole("button", { name: action }).click();
      await expect(admin.getByText("Fait.")).toBeVisible({ timeout: 30_000 });
    }

    const pro = await bureau(browser, theme);
    await pro.goto("/console"); await photo(pro, "console-file", t);
    const file = await (await pro.request.get("/api/dossiers")).json();
    const alerte = file.find((d: { alertes: string[] }) => d.alertes.length) ?? file[0];
    await pro.goto(`/console/dossiers/${alerte.id}`); await photo(pro, "console-fiche", t);

    await tel.goto("/app/dossier");
    await tel.getByRole("link", { name: /Voir l'offre/ }).first().click();
    await expect(tel.getByText("vous propose")).toBeVisible();
    await photo(tel, "offre", t);

    for (const [n, action] of [[6, "Accepter l'offre"], [7, "Payer, puis avancer de 15 jours"]] as const) {
      await admin.getByRole("button", { name: String(n), exact: true }).click();
      await admin.getByRole("button", { name: action }).click();
      await expect(admin.getByText("Fait.")).toBeVisible({ timeout: 30_000 });
    }
    await tel.goto("/app/credit");
    await tel.getByText(/Échéancier/).first().click();
    await photo(tel, "echeancier", t);
    await tel.getByText("Messages reçus").evaluate((el) => el.scrollIntoView({ block: "start" }));
    await tel.evaluate(() => window.scrollBy(0, -90));
    await tel.waitForTimeout(400);
    await tel.screenshot({ path: `${DOSSIER}/rappels-${t}.jpg`, type: "jpeg", quality: 72 });

    await pro.goto("/console/portefeuille"); await photo(pro, "console-portefeuille", t);
    await Promise.all([tel.close(), pro.close(), admin.close()]);
  });
}
