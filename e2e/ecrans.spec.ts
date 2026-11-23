import { expect, test, type Page } from "@playwright/test";
import { connecter, reinitialiser } from "./session";

// Revue visuelle (ADR 0009) : chaque rôle sur ses écrans, à 360 px et 1440 px ; captures dans .captures/ecrans-*.png.
const CAP = process.env.KWEDO_CAPTURES ?? ".captures";
const LARGEURS = [360, 1440] as const;
const EQUIPE = ["agent-lagune", "responsable-lagune", "agent-baobab", "responsable-baobab"];
const CONSOLE = ["/console", "/console/portefeuille", "/console/parametres", "/console/journal", "FICHE"];

test.describe.configure({ mode: "default" });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await reinitialiser(page.request);
  await page.close();
});

async function verifier(page: Page, url: string, nom: string, largeur: number) {
  await page.setViewportSize({ width: largeur, height: largeur < 500 ? 780 : 900 });
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(String(e)));
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${CAP}/ecrans-${nom}-${largeur}.png`, fullPage: true });
  expect(erreurs, nom).toEqual([]);
  const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect.soft(deborde, `débordement horizontal : ${nom} @${largeur}`).toBe(false);
}

for (const largeur of LARGEURS) {
  test(`accueil et connexion @${largeur}`, async ({ page }) => {
    await verifier(page, "/", "accueil", largeur);
    await verifier(page, "/connexion", "connexion", largeur);
  });

  test(`commerçant @${largeur}`, async ({ page }) => {
    test.setTimeout(90_000);
    await connecter(page.request, "commercant");
    for (const chemin of ["/app", "/app/simulateur", "/app/dossier", "/app/credit", "/app/activite", "/app/conseils"]) {
      await verifier(page, chemin, `commercant${chemin.replace(/[^\w]+/g, "_")}`, largeur);
    }
  });

  test(`admin @${largeur}`, async ({ page }) => {
    await connecter(page.request, "admin");
    await verifier(page, "/admin", "admin", largeur);
  });

  for (const profil of EQUIPE) {
    test(`console ${profil} @${largeur}`, async ({ page }) => {
      test.setTimeout(90_000);
      await connecter(page.request, profil);
      for (const chemin of CONSOLE) {
        let url = chemin;
        if (chemin === "FICHE") {
          const file = await (await page.request.get("/api/dossiers")).json();
          if (!file.length) continue; // Baobab n'a aucun dossier à l'état initial
          url = `/console/dossiers/${file[0].id}`;
        }
        await verifier(page, url, `${profil}${chemin.replace(/[^\w]+/g, "_")}`, largeur);
      }
    });
  }

  test(`démo, 9 temps @${largeur}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: largeur, height: largeur < 500 ? 780 : 900 });
    await page.goto("/demo");
    await page.getByRole("button", { name: "Réinitialiser la démo" }).click();
    await expect(page.getByText("Démo réinitialisée")).toBeVisible({ timeout: 30_000 });
    const actions: Record<number, string> = { 4: "Donner l'accord et envoyer", 5: "Ajuster avec justificatif", 6: "Accepter l'offre", 7: "Payer, puis avancer de 15 jours" };
    for (let n = 1; n <= 9; n++) {
      await expect(page.getByText(`Temps ${n} sur 9`)).toBeVisible();
      if (n === 6) {
        // Offre en attente, vue par le commerçant, avant de jouer « Accepter l'offre ».
        const com = await page.context().browser()!.newPage({ viewport: { width: largeur, height: largeur < 500 ? 780 : 900 } });
        await connecter(com.request, "commercant");
        await com.goto("/app/dossier");
        await com.getByRole("link", { name: /Voir l'offre/ }).first().click();
        await expect(com.getByText("vous propose")).toBeVisible();
        await com.waitForTimeout(800);
        await com.screenshot({ path: `${CAP}/ecrans-commercant_offre-${largeur}.png`, fullPage: true });
        expect.soft(await com.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), `débordement : offre @${largeur}`).toBe(false);
        await com.close();
      }
      if (actions[n]) {
        await page.getByRole("button", { name: actions[n] }).click();
        await expect(page.getByText("Fait.")).toBeVisible({ timeout: 30_000 });
      }
      await page.waitForTimeout(1000);
      // Capture une fois les deux écrans chargés (ni squelette ni « Chargement » dans les iframes).
      for (const titre of ["Application commerçant", "Console prêteur"]) {
        const f = page.frameLocator(`iframe[title="${titre}"]`);
        if (await page.locator(`iframe[title="${titre}"]`).count()) await expect(f.locator('[role="status"][aria-label^="Chargement"]')).toHaveCount(0, { timeout: 20_000 });
      }
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${CAP}/ecrans-demo-${n}-${largeur}.png`, fullPage: true });
      const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect.soft(deborde, `débordement horizontal : démo temps ${n} @${largeur}`).toBe(false);
      if (n < 9) await page.getByRole("button", { name: "Suivant →" }).click();
    }
    // Crédit en cours, avec paiement et échéancier, une fois la démo jouée.
    const com = await page.context().browser()!.newPage();
    await connecter(com.request, "commercant");
    await verifier(com, "/app/credit", "commercant_credit_en_cours", largeur);
    await expect(com.getByText(/échéance/i).first()).toBeVisible();
    await com.close();
  });
}
