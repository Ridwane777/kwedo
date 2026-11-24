import { expect, test, type Page } from "@playwright/test";
import { connecter, reinitialiser } from "./session";

// Revue de la mission vitrine : chaque écran, chaque rôle, à 360, 768, 1440 et 1920 px, en clair et en sombre.
// Captures dans .captures/revue-vitrine/<theme>-<écran>-<largeur>.png ; débordement horizontal interdit.
const CAP = `${process.env.KWEDO_CAPTURES ?? ".captures"}/revue-finitions`;
const LARGEURS = [360, 768, 1440, 1920] as const;
const THEMES = [["clair", "light"], ["sombre", "dark"]] as const;

const GROUPES: { nom: string; profil?: string; pages: string[] }[] = [
  { nom: "public", pages: ["/", "/connexion", "/app/inscription", "/demo"] },
  { nom: "commercant", profil: "commercant", pages: ["/app", "/app/simulateur", "/app/dossier", "/app/credit", "/app/activite", "/app/conseils"] },
  { nom: "console", profil: "agent-lagune", pages: ["/console", "FICHE", "/console/portefeuille", "/console/parametres", "/console/journal"] },
  { nom: "admin", profil: "admin", pages: ["/admin"] },
];

test.beforeAll(async ({ browser }) => {
  const p = await browser.newPage();
  await reinitialiser(p.request);
  await p.close();
});

async function capturer(page: Page, url: string, nom: string) {
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(String(e)));
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  await expect(page.locator('[role="status"][aria-label^="Chargement"]')).toHaveCount(0, { timeout: 20_000 });
  // Les images chargées à la demande et les révélations au défilement : on parcourt la page avant la capture.
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${CAP}/${nom}.png`, fullPage: true });
  if (url === "/") {
    // Accueil : une capture par section, lisible à la relecture.
    const sections = page.locator("main > section");
    for (let k = 0; k < (await sections.count()); k++) await sections.nth(k).screenshot({ path: `${CAP}/${nom}-s${k + 1}.png` });
  }
  expect(erreurs, nom).toEqual([]);
  expect.soft(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), `débordement : ${nom}`).toBe(false);
}

for (const [theme, colorScheme] of THEMES) {
  test.describe(`vitrine ${theme}`, () => {
    // Mouvement réduit : la capture pleine page montre l'état final des révélations au défilement
    // (sinon tout ce qui est hors de la vue reste dans son état initial) ; c'est aussi le rendu sans animation.
    test.use({ colorScheme, reducedMotion: "reduce" });
    for (const g of GROUPES) {
      for (const largeur of LARGEURS) {
        test(`${g.nom} @${largeur}`, async ({ page }) => {
          test.setTimeout(180_000);
          await page.setViewportSize({ width: largeur, height: largeur < 500 ? 780 : largeur < 1000 ? 1024 : largeur < 1600 ? 900 : 1080 });
          if (g.profil) await connecter(page.request, g.profil);
          for (const chemin of g.pages) {
            let url = chemin;
            if (chemin === "FICHE") {
              const f = await (await page.request.get("/api/dossiers")).json();
              url = `/console/dossiers/${(f.find((d: { alertes: string[] }) => d.alertes.length) ?? f[0]).id}`;
            }
            await capturer(page, url, `${theme}-${chemin === "/" ? "accueil" : chemin.replace(/^\//, "").replace(/[^\w]+/g, "_")}-${largeur}`);
          }
        });
      }
    }
  });
}
