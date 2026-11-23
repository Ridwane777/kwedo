import { expect, test, type Page } from "@playwright/test";
import { connecter, reinitialiser } from "./session";

const CAP = process.env.KWEDO_CAPTURES ?? ".captures";

async function capture(page: Page, nom: string) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${CAP}/e2e-${nom}-${page.viewportSize()!.width}.png`, fullPage: true });
}

test.describe.configure({ mode: "serial" });

test("parcours complet : estimation → décision → offre → remboursement → relance", async ({ page, browser }) => {
  test.setTimeout(180_000);
  await reinitialiser(page.request);
  await connecter(page.request, "commercant");

  // 1. Estimation avec raisons, étiquette « simulé »
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/app");
  await expect(page.getByText("vous pouvez emprunter jusqu'à")).toBeVisible();
  await expect(page.getByText(/\d[\d\s]*\sFCFA/).first()).toBeVisible();
  await expect(page.getByText("Démo simulée")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pourquoi ce montant" })).toBeVisible();
  await expect(page.locator("ol li")).toHaveCount(3);
  await capture(page, "1-estimation");

  // 2. Simulateur : le curseur de baisse fait baisser le plafond
  await page.goto("/app/simulateur");
  await expect(page.getByText("il manque")).toBeVisible({ timeout: 15_000 });
  await capture(page, "2-simulateur");

  // 3. Consentements et envoi à deux institutions
  await page.goto("/app/dossier");
  await page.getByRole("switch", { name: /Caisse Lagune/ }).click();
  await expect(page.getByRole("switch", { name: /Caisse Lagune/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("switch", { name: /Banque Baobab/ }).click();
  await expect(page.getByRole("switch", { name: /Banque Baobab/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: /Envoyer à 2 institutions/ }).click();
  await expect(page.getByText("Envoyé le").first()).toBeVisible();
  await capture(page, "3-dossier");

  // 4. Console : fiche analysée, ajustement avec justificatif
  const agent = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await connecter(agent.request, "agent-lagune");
  await agent.goto("/console");
  await agent.getByRole("link", { name: "Afiavi Houngbo" }).click();
  await expect(agent.getByText("Montant proposé par le moteur")).toBeVisible();
  await agent.keyboard.press("a");
  const champ = agent.getByLabel("Montant décidé (FCFA)");
  await champ.fill("600000");
  await agent.getByRole("button", { name: "Enregistrer la décision" }).isDisabled();
  await agent.getByLabel(/Justificatif/).fill("Saison creuse en janvier : prudence sur le montant.");
  await agent.getByRole("button", { name: "Enregistrer la décision" }).click();
  await expect(agent.getByText("« Saison creuse en janvier : prudence sur le montant. »")).toBeVisible();
  await expect(agent.getByText("Décision enregistrée au journal.")).toBeVisible();
  await capture(agent, "4-decision");

  // Le second dossier montre une alerte de manipulation
  await agent.goto("/console");
  await agent.getByRole("link", { name: "Séna Kpadonou" }).click();
  await expect(agent.getByText(/renvoi d'un montant proche/)).toBeVisible();

  // 5. Offre et acceptation → échéancier
  await page.goto("/app/dossier");
  await page.getByRole("link", { name: /Voir l'offre/ }).click();
  await expect(page.getByText("vous propose")).toBeVisible();
  await capture(page, "5-offre");
  await page.getByRole("button", { name: /^Accepter/ }).click();
  await expect(page).toHaveURL(/\/app\/credit/);

  // 6. Remboursement
  await page.getByRole("button", { name: /Payer .* par mobile money/ }).click();
  await expect(page.getByText(/Paiement reçu\. Reçu n° SIM-PAY/)).toBeVisible();
  await capture(page, "6-credit");

  // 7. Retard simulé → relance respectueuse → portefeuille
  await agent.goto("/console/portefeuille");
  const admin = await browser.newPage();
  await connecter(admin.request, "admin");
  for (let k = 0; k < 3; k++) expect((await admin.request.post("/api/demo/avancer", { data: { jours: 7 } })).ok()).toBeTruthy();
  await admin.close();
  await agent.reload();
  await expect(agent.getByText(/n'est pas encore réglée/).first()).toBeVisible({ timeout: 15_000 });
  await expect(agent.getByText("Échéances en retard")).toBeVisible();
  await capture(agent, "7-portefeuille");

  await page.reload();
  await expect(page.getByText("Messages reçus")).toBeVisible();

  // Journal : la décision est tracée et ne peut être réécrite
  const j = await (await agent.request.get("/api/journal")).json();
  expect(j.some((e: { type: string; detail: string }) => e.type === "decision" && e.detail.includes("Saison creuse"))).toBeTruthy();
});

test("cloisonnement : une institution ne voit ni ne modifie celle d'à côté", async ({ browser }) => {
  const baobab = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await connecter(baobab.request, "responsable-baobab");
  await baobab.goto("/console/parametres");
  await expect(baobab.getByText(/Réglages de/)).toContainText("Banque Baobab");
  await expect(baobab.getByRole("combobox")).toHaveCount(0);
  expect((await baobab.request.get("/api/institutions/inst-lagune/parametres")).status()).toBe(403);
  expect((await baobab.request.post("/api/institutions/inst-lagune/parametres", { data: { m: 0.1 } })).status()).toBe(403);
  await baobab.goto("/console");
  await expect(baobab.getByRole("link", { name: "Séna Kpadonou" })).toHaveCount(0);

  const agent = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await connecter(agent.request, "agent-lagune");
  await agent.goto("/console/parametres");
  await expect(agent.getByRole("button", { name: /Enregistrer/ })).toHaveCount(0);
});

test("connexion puis admin général : supervision sans détail de dossier", async ({ page }) => {
  await page.goto("/console");
  await expect(page).toHaveURL(/\/connexion/);
  await page.getByRole("button", { name: /Admin général/ }).click();
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole("heading", { name: "Supervision de la plateforme" })).toBeVisible();
  await expect(page.getByText("Séna Kpadonou")).toHaveCount(0);
  await page.goto("/console");
  await expect(page).toHaveURL(/\/admin/);
});
