import { expect, test } from "@playwright/test";
import { connecter, reinitialiser } from "./session";

// Crédit progressif (ADR 0018) : écrans modifiés seulement.
test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ request }) => { await reinitialiser(request); });

test("commerçant : deux chiffres, lequel limite, frise ; avertissement au-dessus du palier", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await connecter(page.request, "commercant");
  await page.goto("/app");
  const bloc = page.getByTestId("palier-deux-chiffres");
  await expect(bloc).toBeVisible({ timeout: 20_000 });
  const phrase = bloc.getByTestId("palier-phrase");
  await expect(phrase).toContainText("Vos ventes permettent jusqu'à 865 000 FCFA.");
  await expect(phrase).toContainText("Pour un premier crédit chez Caisse Lagune Microfinance, le montant est limité à 150 000 FCFA.");
  await expect(phrase).toContainText("Remboursez-le à l'heure et votre limite passe à 225 000 FCFA.");
  await expect(bloc.getByTestId("frise-paliers").locator("li")).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);

  await page.goto("/app/simulateur");
  await expect(page.getByTestId("avertissement-palier")).toContainText("l'institution décide", { timeout: 20_000 });

  await page.goto("/app/conseils");
  await expect(page.getByTestId("levier-palier")).toContainText("225 000");
});

test("console : palier, historique cloisonné, redescente, limite par le plafond", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await connecter(page.request, "agent-lagune");
  const file = await (await page.request.get("/api/dossiers")).json() as { id: string; commercant_id: string; statut: string }[];
  const de = (cid: string) => file.find((d) => d.commercant_id === cid && d.statut === "recu")!.id;

  await page.goto(`/console/dossiers/${de("com-hounkpe")}`);
  const pal = page.getByTestId("fiche-palier");
  await expect(pal).toContainText("Redescendu après un retard");
  await expect(pal.getByTestId("historique-cycles")).toContainText("Remboursé à l'heure");
  await expect(pal.getByTestId("historique-cycles")).toContainText("Retard grave");

  await page.goto(`/console/dossiers/${de("com-edwige")}`);
  await expect(page.getByTestId("fiche-palier")).toContainText("ici, le plafond prudent");

  await page.goto(`/console/dossiers/${de("com-gildas")}`);
  await expect(page.getByTestId("fiche-palier")).toContainText("Palier 2 · crédit n° 2");
  await page.keyboard.press("a");
  expect((await page.getByLabel("Montant décidé (FCFA)").inputValue()).replace(/\D/g, "")).toBe("225000");

  // Baobab : aucun crédit de Lagune dans la fiche de Yaba.
  await connecter(page.request, "agent-baobab");
  const fb = await (await page.request.get("/api/dossiers")).json() as { id: string; commercant_id: string }[];
  await page.goto(`/console/dossiers/${fb.find((d) => d.commercant_id === "com-yaba")!.id}`);
  await expect(page.getByTestId("fiche-palier")).toContainText("premier crédit");
});

test("paramètres : politique de palier versionnée, aperçu pour le responsable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await connecter(page.request, "responsable-lagune");
  await page.goto("/console/parametres");
  const sec = page.getByTestId("politique-palier");
  await expect(sec).toBeVisible({ timeout: 20_000 });
  await sec.getByLabel("Montant du premier crédit (FCFA)").fill("300000");
  await sec.getByRole("button", { name: "Calculer l'aperçu" }).click();
  await expect(sec.getByTestId("apercu-palier")).toContainText("Demandes au-dessus du palier");
});
