import { expect, test } from "@playwright/test";
import { connecter, reinitialiser } from "./session";

/** Mission demande (ADR 0017) : chaque plafond affiché porte ses conditions ; demande libre au-dessus du plafond. */
const CONDITIONS = /remboursés (chaque semaine|toutes les deux semaines|chaque mois) pendant \d+ (mois|semaines).*aux conditions d/;

test.describe.configure({ mode: "serial" });

test("chaque affichage de plafond porte ses conditions", async ({ page }) => {
  test.setTimeout(120_000);
  await reinitialiser(page.request);
  await connecter(page.request, "commercant");
  await page.setViewportSize({ width: 360, height: 780 });

  await page.goto("/app");
  await expect(page.getByTestId("plafond-conditions").first()).toContainText(CONDITIONS);
  await page.getByRole("button", { name: "C'est quoi, le plafond ?" }).first().click();
  await expect(page.getByTestId("definition-plafond")).toContainText("Ce n'est pas un crédit accordé");
  await expect(page.getByTestId("plafond-selon-duree").locator("tbody tr")).toHaveCount(4); // 3, 6, 9, 12 mois

  await page.goto("/app/activite");
  await expect(page.getByTestId("plafond-conditions")).toContainText(CONDITIONS);
  await expect(page.getByRole("link", { name: "Voir selon la durée" })).toBeVisible();

  await page.goto("/app/simulateur");
  await expect(page.getByTestId("plafond-conditions").first()).toContainText(CONDITIONS);

  await page.goto("/app/conseils");
  await expect(page.getByText("calculés pour cette fréquence et cette durée")).toBeVisible();
  await page.getByLabel("Je rembourse").selectOption("mensuelle");
  await expect(page.getByText(/chaque mois pendant \d+ mois, aux conditions de Caisse Lagune/).first()).toBeVisible({ timeout: 15_000 });

  await page.goto("/");
  for (const el of await page.getByTestId("plafond-conditions").all()) await expect(el).toContainText(/remboursés chaque semaine/);
});

test("demande au-dessus du plafond : avertissement non bloquant et récapitulatif", async ({ page }) => {
  await connecter(page.request, "commercant");
  await page.goto("/app/dossier");
  await page.getByRole("button", { name: "Déposer mon dossier de crédit" }).click();
  await page.getByRole("radio", { name: /Caisse Lagune/ }).check();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByTestId("plafond-conditions")).toContainText(/reste prudent pour vos ventes, remboursés chaque semaine/);
  await page.getByTestId("montant-souhaite").fill("5000000");
  await page.getByText("Équipement", { exact: true }).click();
  await page.getByLabel("En une phrase, à quoi servira-t-il ?").fill("Un véhicule de livraison.");
  await expect(page.getByTestId("avertissement-plafond")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Continuer" }).click();
  expect((await page.getByTestId("recap-montant").textContent())!.replace(/\D/g, "")).toBe("5000000");
  await expect(page.getByText("Équipement : Un véhicule de livraison.")).toBeVisible();
  await expect(page.getByText("Coût total du crédit")).toBeVisible();
});

test("console : file triable par risque, demande en tête de fiche", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await connecter(page.request, "agent-lagune");
  await page.goto("/console");
  await page.getByRole("button", { name: "Risque de la demande" }).click();
  await expect(page.getByText("demandes les plus risquées d'abord")).toBeVisible();
  await page.locator("tbody a").first().click();
  await expect(page.getByTestId("montant-demande")).toBeVisible();
  await expect(page.getByTestId("risque-demande")).toContainText(/tolérance/);
  await page.keyboard.press("a");
  await expect(page.getByTestId("risque-contre")).toContainText("Risque recalculé", { timeout: 15_000 });
});
