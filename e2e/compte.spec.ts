import { expect, test, type Page } from "@playwright/test";
import { connecter, reinitialiser } from "./session";

// Menu de compte (UserButton) et thème : docs/MISSION-MENU-COMPTE.md.
test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await reinitialiser(page.request);
  await page.close();
});

const ESPACES = [
  { profil: "commercant", url: "/app", api: "/api/commercants/com-afiavi", nom: /Compte : Afiavi/ },
  { profil: "agent-lagune", url: "/console", api: "/api/dossiers", nom: /Compte : Agent de crédit/ },
  { profil: "admin", url: "/admin", api: "/api/admin/apercu", nom: /Compte : Admin général/ },
];

async function menuVisible(page: Page) {
  const menu = page.getByRole("menu", { name: "Compte" });
  await expect(menu).toBeVisible();
  const b = (await menu.boundingBox())!;
  const vp = page.viewportSize()!;
  expect(b.x, "menu coupé à gauche").toBeGreaterThanOrEqual(0);
  expect(b.x + b.width, "menu coupé à droite").toBeLessThanOrEqual(vp.width);
  expect(b.y + b.height, "menu sous le bas de l'écran").toBeLessThanOrEqual(vp.height);
  // Jamais masqué par la barre de navigation du bas (espace commerçant).
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  if (await nav.isVisible()) expect(b.y + b.height, "menu sous la barre du bas").toBeLessThanOrEqual((await nav.boundingBox())!.y);
  return menu;
}

for (const largeur of [360, 1440]) {
  for (const e of ESPACES) {
    test(`menu de compte ${e.profil} @${largeur} : clavier, déconnexion, retour arrière`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: largeur < 500 ? 780 : 900 });
      await connecter(page.request, e.profil);
      // Deux entrées de l'espace dans l'historique : la déconnexion remplace la seconde, le retour arrière tombe sur la première.
      await page.goto(e.url);
      await page.goto(`${e.url}?suite=1`);
      const bouton = page.getByRole("button", { name: e.nom });
      await expect(bouton).toBeVisible();
      await expect(bouton).toHaveAttribute("aria-haspopup", "menu");
      await expect(bouton).toHaveAttribute("aria-expanded", "false");
      const cible = (await bouton.boundingBox())!;
      expect(cible.width).toBeGreaterThanOrEqual(48);
      expect(cible.height).toBeGreaterThanOrEqual(48);

      // Clavier : ouverture, flèches, Échap, focus rendu au bouton.
      await bouton.focus();
      await page.keyboard.press("Enter");
      await expect(bouton).toHaveAttribute("aria-expanded", "true");
      await menuVisible(page);
      await page.keyboard.press("End");
      await expect(page.getByRole("menuitem", { name: "Se déconnecter" })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("menu", { name: "Compte" })).toHaveCount(0);
      await expect(bouton).toBeFocused();

      // Clic extérieur ferme.
      await bouton.click();
      await expect(page.getByRole("menuitem", { name: "Changer de profil" })).toBeVisible();
      await page.mouse.click(5, (page.viewportSize()!.height) / 2);
      await expect(page.getByRole("menu", { name: "Compte" })).toHaveCount(0);

      // Déconnexion réelle.
      await bouton.click();
      await page.getByRole("menuitem", { name: "Se déconnecter" }).click();
      await expect(page).toHaveURL(/\/connexion$/);
      expect((await page.request.get(e.api)).status(), "l'API refuse après déconnexion").toBeGreaterThanOrEqual(400);
      // Revenir en arrière ne rouvre pas l'espace.
      await page.goBack();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/connexion/);
      await expect(page.getByRole("button", { name: e.nom })).toHaveCount(0);
    });
  }
}

test("pas de menu de compte dans les cadres de la démo", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/demo");
  const tel = page.frameLocator('iframe[title="Application commerçant"]');
  await expect(tel.getByRole("navigation", { name: "Navigation principale" })).toBeVisible({ timeout: 20_000 });
  await expect(tel.getByRole("button", { name: /^Compte/ })).toHaveCount(0);
});

for (const largeur of [360, 1440]) {
  test(`thème : choix mémorisé après rechargement @${largeur}`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: largeur < 500 ? 780 : 900 });
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/connexion");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "system");
    // Pages sans session : bouton d'icône Système → Clair → Sombre.
    await page.getByRole("button", { name: /^Thème : Système/ }).click();
    await page.getByRole("button", { name: /^Thème : Clair/ }).click();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "dark");
    const fond = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(fond).toBe("rgb(20, 19, 18)"); // fond sombre graphite (ADR 0012)

    // Dans le menu de compte : choix « Clair », persistant.
    await connecter(page.request, "commercant");
    await page.goto("/app");
    await page.getByRole("button", { name: /^Compte/ }).click();
    await page.getByRole("menuitemradio", { name: "Thème clair" }).click();
    await expect(html).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "light");

    // Système suit le réglage du téléphone en direct.
    await page.getByRole("button", { name: /^Compte/ }).click();
    await page.getByRole("menuitemradio", { name: "Thème système" }).click();
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(20, 19, 18)");
    await page.emulateMedia({ colorScheme: "light" });
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(242, 244, 243)");
  });
}
