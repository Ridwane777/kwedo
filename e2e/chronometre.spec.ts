import { expect, test } from "@playwright/test";

const API = process.env.KWEDO_API ?? "http://127.0.0.1:3462";

test("chronomètre : « non mesuré » tant qu'aucun humain n'a chronométré, puis mesure et export", async ({ page, request }) => {
  await request.post(`${API}/demo/reinitialiser`, { data: {} });
  const f = await (await request.get(`${API}/dossiers?institution_id=inst-lagune`)).json();
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
