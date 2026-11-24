import { expect, test } from "@playwright/test";
import { gzipSync } from "node:zlib";

// Poids de l'accueil (docs/MISSION-VITRINE.md), premier chargement sans cache à 1440 px.
// « brut » : corps décompressés ; « gzip » : ces corps recompressés (ordre de grandeur de ce qui transite,
// le serveur de test ne compresse pas). Polices et images (WOFF2, JPEG/WebP) sont déjà compressées.
// Avant la mission vitrine : 779 ko bruts (JS 540, polices 154, CSS 39, HTML 36), sans image.
// Après : 1 013 ko bruts, 486 ko gzip (images 118 : les 4 vraies captures du héros ; polices 180 ; JS 150).
// Budget : 520 ko gzip, polices et images comprises.
test("poids de l'accueil", async ({ page }) => {
  let brut = 0, gzip = 0;
  const parType: Record<string, number> = {};
  const lectures: Promise<void>[] = [];
  page.on("response", (r) => {
    lectures.push((async () => {
      const corps = await r.body().catch(() => Buffer.alloc(0));
      const t = r.request().resourceType();
      const deja = t === "font" || t === "image";
      brut += corps.length;
      const g = deja ? corps.length : gzipSync(corps).length;
      gzip += g;
      parType[t] = (parType[t] ?? 0) + g;
    })());
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await Promise.all(lectures);
  const ko = (n: number) => Math.round(n / 1024);
  console.log(`POIDS accueil : ${ko(brut)} ko bruts, ${ko(gzip)} ko gzip`, JSON.stringify(Object.fromEntries(Object.entries(parType).map(([k, v]) => [k, ko(v)]))));
  expect(gzip).toBeLessThan(520 * 1024);
});
