import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

// Marque cauri : pistes, tailles, clair et sombre ; favicon, icône d'application et image Open Graph servis.
const CAP = `${process.env.KWEDO_CAPTURES ?? ".captures"}/revue-finitions`;

for (const colorScheme of ["light", "dark"] as const) {
  test(`marque et pistes de logo (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/design");
    const zone = page.locator("section[aria-labelledby=t-marque]");
    await expect(zone).toBeVisible();
    await zone.screenshot({ path: `${CAP}/${colorScheme === "light" ? "clair" : "sombre"}-marque-pistes.png` });
  });
}

test("favicon, icône d'application, image Open Graph, manifeste", async ({ request }) => {
  mkdirSync(CAP, { recursive: true });
  for (const [url, type] of [["/icon.svg", "svg"], ["/apple-icon", "png"], ["/opengraph-image", "png"], ["/manifest.webmanifest", "json"]]) {
    const r = await request.get(url);
    expect(r.status(), url).toBe(200);
    expect(r.headers()["content-type"], url).toContain(type === "json" ? "manifest" : type);
    if (type === "png") writeFileSync(`${CAP}/${url.slice(1)}.png`, await r.body());
  }
});
