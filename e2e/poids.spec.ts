import { expect, test } from "@playwright/test";

// Poids de l'accueil (docs/MISSION-VITRINE.md) : corps des réponses (décompressés) au premier chargement, sans cache.
// Avant la mission vitrine : 779 ko (JS 540, polices 154, CSS 39, HTML 36). Budget : 950 ko, polices comprises.
test("poids de l'accueil", async ({ page }) => {
  let total = 0;
  const parType: Record<string, number> = {};
  page.on("response", async (r) => {
    const taille = Number(r.headers()["content-length"] ?? 0) || (await r.body().catch(() => Buffer.alloc(0))).length;
    const t = r.request().resourceType();
    total += taille;
    parType[t] = (parType[t] ?? 0) + taille;
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  console.log(`POIDS accueil : ${(total / 1024).toFixed(0)} ko`, JSON.stringify(Object.fromEntries(Object.entries(parType).map(([k, v]) => [k, Math.round(v / 1024)]))));
  expect(total).toBeLessThan(950 * 1024);
});
