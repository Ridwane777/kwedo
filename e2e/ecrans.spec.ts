import { expect, test, type Browser, type Page } from "@playwright/test";
import { connecter, reinitialiser } from "./session";

// Revue visuelle : chaque rôle sur ses écrans, à 360 et 1440 px, en clair et en sombre.
// Captures dans .captures/revue-finale/<theme>-*.png (thème « Système » piloté par le réglage émulé du navigateur).
const CAP = `${process.env.KWEDO_CAPTURES ?? ".captures"}/revue-finale`;
const LARGEURS = [360, 1440] as const;
const EQUIPE = ["agent-lagune", "responsable-lagune", "agent-baobab", "responsable-baobab"];
const CONSOLE = ["/console", "/console/portefeuille", "/console/parametres", "/console/journal", "FICHE"];
const COMMERCANT = ["/app", "/app/simulateur", "/app/dossier", "/app/credit", "/app/activite", "/app/conseils", "/app/flux", "/app/compte"];
const THEMES = [["clair", "light"], ["sombre", "dark"]] as const;

test.describe.configure({ mode: "default" });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await reinitialiser(page.request);
  await page.close();
});

const hauteur = (l: number) => (l < 500 ? 780 : 900);

for (const [theme, colorScheme] of THEMES) {
  test.describe(`thème ${theme}`, () => {
    test.use({ colorScheme });
    const nouvellePage = (b: Browser, largeur: number) => b.newPage({ colorScheme, viewport: { width: largeur, height: hauteur(largeur) } });

    async function verifier(page: Page, url: string, nom: string, largeur: number) {
      await page.setViewportSize({ width: largeur, height: hauteur(largeur) });
      const erreurs: string[] = [];
      page.on("pageerror", (e) => erreurs.push(String(e)));
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${CAP}/${theme}-${nom}-${largeur}.png`, fullPage: true });
      expect(erreurs, nom).toEqual([]);
      const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect.soft(deborde, `débordement horizontal : ${nom} @${largeur} ${theme}`).toBe(false);
    }

    for (const largeur of LARGEURS) {
      test(`accueil, connexion, inscription @${largeur}`, async ({ page }) => {
        await verifier(page, "/", "accueil", largeur);
        await verifier(page, "/connexion", "connexion", largeur);
        await verifier(page, "/app/inscription", "inscription", largeur);
      });

      test(`commerçant @${largeur}`, async ({ page }) => {
        test.setTimeout(120_000);
        await connecter(page.request, "commercant");
        for (const chemin of COMMERCANT) await verifier(page, chemin, `commercant${chemin.replace(/[^\w]+/g, "_")}`, largeur);
        // Menu de compte ouvert.
        await page.goto("/app");
        await page.getByRole("button", { name: /^Compte/ }).click();
        await expect(page.getByRole("menu", { name: "Compte" })).toBeVisible();
        await page.waitForTimeout(600); // fin du fondu d'ouverture
        await page.screenshot({ path: `${CAP}/${theme}-commercant_menu_compte-${largeur}.png` });
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
          if (profil === "agent-lagune") {
            await page.goto("/console");
            await page.getByRole("button", { name: /^Compte/ }).click();
            await expect(page.getByRole("menu", { name: "Compte" })).toBeVisible();
            await page.waitForTimeout(600);
            await page.screenshot({ path: `${CAP}/${theme}-console_menu_compte-${largeur}.png` });
          }
        });
      }

      test(`démo, 11 temps, offre et crédit @${largeur}`, async ({ page, browser }) => {
        test.setTimeout(240_000);
        await page.setViewportSize({ width: largeur, height: hauteur(largeur) });
        await page.goto("/demo");
        await page.getByRole("button", { name: "Réinitialiser la démo" }).click();
        await expect(page.getByText("Démo réinitialisée")).toBeVisible({ timeout: 30_000 });
        const actions: Record<number, string> = { 4: "Signer par code SMS et envoyer", 5: "Contre-proposer avec justificatif", 7: "Accepter l'offre", 8: "Payer, puis avancer de 15 jours",
          9: "Payer à l'heure et avancer de 7 jours, jusqu'à la fin du crédit" };
        for (let n = 1; n <= 11; n++) {
          await expect(page.getByText(`Temps ${n} sur 11`)).toBeVisible();
          if (n === 7) {
            // Offre en attente, vue par le commerçant, avant de jouer « Accepter l'offre ».
            const com = await nouvellePage(browser, largeur);
            await connecter(com.request, "commercant");
            await com.goto("/app/dossier");
            await com.getByRole("link", { name: /Voir l'offre/ }).first().click();
            await expect(com.getByText("vous propose")).toBeVisible();
            await com.waitForTimeout(800);
            await com.screenshot({ path: `${CAP}/${theme}-commercant_offre-${largeur}.png`, fullPage: true });
            expect.soft(await com.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), `débordement : offre @${largeur}`).toBe(false);
            await com.close();
          }
          if (actions[n]) {
            await page.getByRole("button", { name: actions[n] }).click();
            await expect(page.getByText("Fait.")).toBeVisible({ timeout: n === 9 ? 120_000 : 30_000 });
          }
          await page.waitForTimeout(1000);
          // Capture une fois les deux écrans chargés (ni squelette ni « Chargement » dans les iframes).
          for (const titre of ["Application commerçant", "Console prêteur"]) {
            const f = page.frameLocator(`iframe[title="${titre}"]`);
            if (await page.locator(`iframe[title="${titre}"]`).count()) await expect(f.locator('[role="status"][aria-label^="Chargement"]')).toHaveCount(0, { timeout: 20_000 });
          }
          await page.waitForTimeout(800);
          await page.screenshot({ path: `${CAP}/${theme}-demo-${n}-${largeur}.png`, fullPage: true });
          const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
          expect.soft(deborde, `débordement horizontal : démo temps ${n} @${largeur}`).toBe(false);
          if (n < 11) await page.getByRole("button", { name: "Suivant", exact: true }).click();
        }
        // Crédit en cours, avec paiement et échéancier, une fois la démo jouée.
        const com = await nouvellePage(browser, largeur);
        await connecter(com.request, "commercant");
        await verifier(com, "/app/credit", "commercant_credit_en_cours", largeur);
        await expect(com.getByText(/échéance/i).first()).toBeVisible();
        await com.close();
      });
    }
  });
}
