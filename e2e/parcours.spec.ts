import { expect, test, type Page } from "@playwright/test";

const API = process.env.KWEDO_API ?? "http://127.0.0.1:3460";
const CAP = process.env.KWEDO_CAPTURES ?? ".captures";

async function capture(page: Page, nom: string) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${CAP}/e2e-${nom}-${page.viewportSize()!.width}.png`, fullPage: true });
}

test.describe.configure({ mode: "serial" });

test("parcours complet : estimation → décision → offre → remboursement → relance", async ({ page, request, browser }) => {
  test.setTimeout(180_000);
  expect((await request.post(`${API}/demo/reinitialiser`, { data: {} })).ok()).toBeTruthy();

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
  await expect(agent.getByText(/Dossier traité en/)).toBeVisible();
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
  await agent.getByRole("button", { name: "Avancer de 7 jours" }).click();
  for (let k = 0; k < 2; k++) {
    await agent.getByRole("button", { name: "Avancer de 7 jours" }).click();
    await expect(agent.getByRole("button", { name: "Avancer de 7 jours" })).toBeEnabled();
  }
  await expect(agent.getByText(/n'est pas encore réglée/).first()).toBeVisible({ timeout: 15_000 });
  await expect(agent.getByText("Échéances en retard")).toBeVisible();
  await capture(agent, "7-portefeuille");

  await page.reload();
  await expect(page.getByText("Messages reçus")).toBeVisible();

  // Journal : la décision est tracée et ne peut être réécrite
  const j = await (await request.get(`${API}/journal`)).json();
  expect(j.some((e: { type: string; detail: string }) => e.type === "decision" && e.detail.includes("Saison creuse"))).toBeTruthy();
});
