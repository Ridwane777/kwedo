import { expect, test, type Page } from "@playwright/test";
import { connecter, reinitialiser } from "./session";

// Formule hors des écrans : la décision se lit par la demande et son risque. Ni L_max, ni C_p, ni « formule »
// sur les pages de l'espace commerçant et de la console (la formule reste dans le moteur et docs/).
const INTERDITS = [/L_?max/i, /C_?p\b/, /\bformule/i];

async function sansFormule(page: Page, chemin: string, attendre?: () => Promise<void>) {
  await page.goto(chemin);
  if (attendre) await attendre();
  await expect(page.locator('[role="status"][aria-label^="Chargement"]')).toHaveCount(0, { timeout: 30_000 });
  // Les panneaux repliés (onglets, détails) sont lus aussi : textContent, pas seulement le texte visible.
  const texte = await page.locator("body").textContent() ?? "";
  for (const motif of INTERDITS) expect(texte, `${chemin} contient ${motif}`).not.toMatch(motif);
}

test.describe.configure({ mode: "serial" });

test("aucune page de /app ni /console n'affiche L_max, C_p ni « formule »", async ({ page }) => {
  test.setTimeout(240_000);
  await reinitialiser(page.request);
  await connecter(page.request, "commercant", "responsable-lagune");

  await sansFormule(page, "/app", async () => {
    await expect(page.getByRole("heading", { name: "Pourquoi ce montant" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Comment ce montant est calculé" }).click();
    await expect(page.getByTestId("comment-calcule")).toContainText("2 000 scénarios");
  });
  for (const chemin of ["/app/simulateur", "/app/dossier", "/app/conseils", "/app/activite", "/app/flux", "/app/credit", "/app/compte"]) {
    await sansFormule(page, chemin);
  }

  await sansFormule(page, "/console", async () => { await expect(page.getByRole("link", { name: /Hounkpè Dossou/ }).first()).toBeVisible({ timeout: 30_000 }); });
  const dossiers = await (await page.request.get("/api/dossiers")).json() as { id: string }[];
  for (const d of dossiers) {
    await sansFormule(page, `/console/dossiers/${d.id}`, async () => {
      await expect(page.getByTestId("risque-demande")).toBeVisible({ timeout: 30_000 });
    });
  }
  for (const chemin of ["/console/portefeuille", "/console/journal"]) await sansFormule(page, chemin);
  await sansFormule(page, "/console/parametres", async () => { await expect(page.getByText("Tolérance au risque").first()).toBeVisible({ timeout: 30_000 }); });
});

test("fiche d'un dossier à risque : au-dessus de la tolérance, cause nommée", async ({ page }) => {
  await reinitialiser(page.request);
  await connecter(page.request, "agent-lagune");
  const f = await (await page.request.get("/api/dossiers?tri=risque")).json() as { id: string; commercant_id: string }[];
  const d = f.find((x) => x.commercant_id === "com-hounkpe")!;
  await page.goto(`/console/dossiers/${d.id}`);
  await expect(page.getByTestId("risque-demande")).toContainText("Au-dessus de la tolérance", { timeout: 30_000 });
  await expect(page.getByText("Son activité baisse ces dernières semaines")).toBeVisible();
  await page.getByRole("tab", { name: "Comment c'est calculé" }).click();
  await expect(page.getByTestId("comment-calcule")).toContainText("L'institution décide");
});

test("paramètres : noms en clair et aperçu avant enregistrement", async ({ page }) => {
  test.setTimeout(120_000);
  await reinitialiser(page.request);
  await connecter(page.request, "responsable-lagune");
  await page.goto("/console/parametres");
  await expect(page.getByText("Part de ce reste consacrée au remboursement")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Tolérance au risque").fill("0.3");
  await page.getByRole("button", { name: "Calculer l'aperçu" }).click();
  const a = page.getByTestId("apercu-parametres");
  await expect(a.getByText("Plafond prudent moyen")).toBeVisible({ timeout: 90_000 });
  await expect(a.getByText("Risque moyen de la demande")).toBeVisible();
});
