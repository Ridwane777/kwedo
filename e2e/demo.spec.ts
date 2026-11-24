import { expect, test } from "@playwright/test";

const CAP = process.env.KWEDO_CAPTURES ?? ".captures";

test("mode démo : 9 temps, actions en un clic, réinitialisation", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/demo");
  await page.getByRole("button", { name: "Réinitialiser la démo" }).click();
  await expect(page.getByText("Démo réinitialisée")).toBeVisible({ timeout: 30_000 });

  const suivant = page.getByRole("button", { name: "Suivant", exact: true });
  const etapes: [number, string | null][] = [[1, null], [2, null], [3, null], [4, "Signer par code SMS et envoyer"], [5, "Contre-proposer avec justificatif"],
    [6, "Accepter l'offre"], [7, "Payer, puis avancer de 15 jours"], [8, null], [9, null]];
  for (const [n, action] of etapes) {
    await expect(page.getByText(`Temps ${n} sur 9`)).toBeVisible();
    if (action) {
      await page.getByRole("button", { name: action }).click();
      await expect(page.getByText("Fait.")).toBeVisible({ timeout: 30_000 });
    }
    if (n === 5 || n === 7) await page.screenshot({ path: `${CAP}/demo-${n}.png` });
    if (n < 9) await suivant.click();
  }
  // Le rappel est arrivé côté commerçant, la décision est au journal.
  await page.getByRole("button", { name: "7", exact: true }).click();
  const tel = page.frameLocator('iframe[title="Application commerçant"]');
  await expect(tel.getByText("Messages reçus")).toBeVisible({ timeout: 20_000 });

  // Réinitialisation en un clic : retour à l'état figé.
  await page.getByRole("button", { name: "Réinitialiser la démo" }).click();
  await expect(page.getByText("Démo réinitialisée")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Temps 1 sur 9")).toBeVisible();
  await page.getByRole("button", { name: "6", exact: true }).click();
  await expect(page.frameLocator('iframe[title="Application commerçant"]').getByRole("heading", { name: "Mon dossier", exact: true })).toBeVisible({ timeout: 20_000 });
});
