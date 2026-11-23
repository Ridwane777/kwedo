import { expect, test } from "@playwright/test";
import { connecter, reinitialiser } from "./session";

test("chronomètre : « non mesuré » tant qu'aucun humain n'a chronométré, puis mesure et export", async ({ page }) => {
  await reinitialiser(page.request);
  await connecter(page.request, "agent-lagune");
  const f = await (await page.request.get("/api/dossiers")).json();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/console/dossiers/${f[0].id}`);
  const zone = page.getByRole("region", { name: "Chronomètre de traitement" });
  await expect(zone).toContainText("avec l'outil : non mesuré");
  await expect(zone.getByRole("button", { name: "Exporter CSV" })).toBeDisabled();
  await zone.getByRole("button", { name: "Démarrer" }).click();
  await page.waitForTimeout(1200);
  await zone.getByRole("button", { name: "Arrêter et enregistrer" }).click();
  await expect(zone).toContainText("sur 1 mesure");
  await expect(zone).toContainText("sans l'outil : non mesuré");
  const telechargement = page.waitForEvent("download");
  await zone.getByRole("button", { name: "Exporter CSV" }).click();
  const fichier = await telechargement;
  expect(fichier.suggestedFilename()).toBe("kwedo-chronos.csv");
});
