import { expect, test } from "@playwright/test";
import { connecter, reinitialiser } from "./session";

// Console organisée par objet (ADR 0019) : Aujourd'hui, Demandes, Crédits, Recouvrement, Commerçants, détails croisés.
test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000); // réinitialisation : historique de démo rejoué par le simulateur
  const page = await browser.newPage();
  await reinitialiser(page.request);
  await page.close();
});

test("aujourd'hui : à faire maintenant, cartes vers les listes filtrées", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await connecter(page.request, "agent-lagune");
  await page.goto("/console");
  await expect(page.getByRole("heading", { name: "Aujourd'hui" })).toBeVisible();
  for (const t of ["Dossiers à décider", "Échéances en retard", /Offres sans réponse/]) await expect(page.getByRole("region", { name: t })).toBeVisible();
  await page.getByRole("link", { name: "Offres en attente du commerçant" }).click();
  await expect(page).toHaveURL(/\/console\/demandes\?onglet=attente/);
  await expect(page.getByRole("tab", { name: /En attente du commerçant/ })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("3");
  await expect(page).toHaveURL(/\/console\/credits$/);
});

test("demandes : onglets, recherche et pagination servis par l'API", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await connecter(page.request, "agent-lagune");
  await page.goto("/console/demandes");
  for (const o of ["À décider", "Complément demandé", "En attente du commerçant", "Traitées"]) await expect(page.getByRole("tab", { name: new RegExp(o) })).toBeVisible();
  await page.getByRole("tab", { name: /Traitées/ }).click();
  await expect(page).toHaveURL(/onglet=traitees/);
  await page.getByLabel("Décision").selectOption("refuse");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Effacer les filtres" }).click();
  // Pagination : 5 par page côté serveur
  await page.goto("/console/demandes?onglet=traitees&taille=5");
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await page.getByRole("button", { name: "Page suivante" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText(/^6–/)).toBeVisible();
  // Recherche sans accent
  await page.goto("/console/demandes?onglet=toutes");
  await page.getByRole("searchbox").fill("hounkpe");
  await expect(page).toHaveURL(/q=hounkpe/);
  await expect(page.locator("tbody tr").filter({ hasNotText: "Hounkpè" })).toHaveCount(0);
  await expect(page.locator("tbody tr")).not.toHaveCount(0);
});

test("dossier traité → bandeau de décision → crédit → commerçant, fil d'Ariane", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await connecter(page.request, "agent-lagune");
  await page.goto("/console/demandes?onglet=traitees&statut=offre_acceptee");
  await page.locator("tbody a").first().click();
  await expect(page.getByTestId("bandeau-decision")).toContainText("Offre acceptée par le commerçant");
  await expect(page.getByRole("button", { name: "Enregistrer la décision" })).toHaveCount(0);
  await page.getByRole("link", { name: /Voir le crédit/ }).click();
  await expect(page).toHaveURL(/\/console\/credits\/cre-/);
  await expect(page.getByRole("heading", { name: "Échéancier" })).toBeVisible();
  const ariane = page.getByRole("navigation", { name: "Fil d'Ariane" });
  await expect(ariane.getByRole("link", { name: "Crédits" })).toBeVisible();
  await page.getByRole("link", { name: "dossier d'origine" }).click();
  await expect(page).toHaveURL(/\/console\/dossiers\//);
  await page.getByRole("navigation", { name: "Fil d'Ariane" }).getByRole("link").nth(1).click();
  await expect(page).toHaveURL(/\/console\/commercants\/com-/);
  await expect(page.getByText("Historique chez votre institution seulement")).toBeVisible();
});

test("crédits : indicateurs et quatre onglets remplis ; ancienne URL redirigée", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await connecter(page.request, "agent-lagune");
  await page.goto("/console/portefeuille");
  await expect(page).toHaveURL(/\/console\/credits$/);
  for (const i of ["Encours", "Part en retard", "PAR 30 jours", "Taux de recouvrement"]) await expect(page.getByText(i, { exact: true })).toBeVisible();
  for (const o of ["En cours", "En retard", "Remboursés", "En défaut"]) {
    await page.getByRole("tab", { name: new RegExp(`^${o}`) }).click();
    await expect(page.locator("tbody tr").first()).toBeVisible();
  }
});

test("recouvrement et commerçants : cloisonnés par institution", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await connecter(page.request, "agent-baobab");
  await page.goto("/console/commercants");
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await expect(page.getByText("Hounkpè Dossou")).toHaveCount(0);
  await page.goto("/console/commercants/com-hounkpe");
  await expect(page.getByText("commerçant inconnu")).toBeVisible();
  await page.goto("/console/recouvrement");
  await expect(page.getByText("Aucune échéance en retard")).toBeVisible();
});

for (const theme of ["light", "dark"] as const) {
  test(`téléphone 360 ${theme} : onglets défilants, listes en cartes`, async ({ page }) => {
    await page.addInitScript((t) => { try { localStorage.setItem("kwedo-theme", t); } catch {} }, theme);
    await page.setViewportSize({ width: 360, height: 780 });
    await connecter(page.request, "agent-lagune");
    for (const url of ["/console", "/console/demandes?onglet=traitees", "/console/credits?onglet=tous", "/console/recouvrement", "/console/commercants"]) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
      if (!url.endsWith("recouvrement") && url !== "/console") await expect(page.locator("ul.md\\:hidden li").first()).toBeVisible();
      await page.screenshot({ path: `.captures/console-${url.replace(/[^\w]+/g, "_")}-360-${theme}.png`, fullPage: true });
    }
  });
}
