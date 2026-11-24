import { expect, test, type Page } from "@playwright/test";
import { connecter, reinitialiser } from "./session";

/** Revue de la mission échéances (ADR 0015) : captures clair/sombre à 360 et 1440 px, sans débordement horizontal. */
const DOSSIER = ".captures/revue-echeances";

async function capture(page: Page, nom: string, theme: string) {
  await page.waitForTimeout(500);
  const w = page.viewportSize()!.width;
  const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(deborde, `${nom} déborde à ${w} px`).toBeFalsy();
  await page.screenshot({ path: `${DOSSIER}/${nom}-${theme}-${w}.png`, fullPage: true });
}

test.describe.configure({ mode: "serial" });

test("préparation : crédit mensuel ouvert pour Afiavi", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await reinitialiser(page.request);
  await connecter(page.request, "commercant");
  const r = page.request;
  const { code } = await (await r.post("/api/commercants/com-afiavi/code-sms", { data: { institution_id: "inst-lagune" } })).json();
  expect((await r.post("/api/commercants/com-afiavi/consentements", { data: { institution_id: "inst-lagune", action: "accorde", code } })).ok()).toBeTruthy();
  const d = await (await r.post("/api/dossiers", { data: { commercant_id: "com-afiavi", institution_id: "inst-lagune", frequence: "mensuelle", duree_mois: 6 } })).json();
  const agent = await browser.newPage();
  await connecter(agent.request, "agent-lagune");
  const fiche = await (await agent.request.get(`/api/dossiers/${d.id}`)).json();
  expect((await agent.request.post(`/api/dossiers/${d.id}/decisions`, { data: { type: "valide", motif: "Flux réguliers, mensualité supportable." } })).ok()).toBeTruthy();
  expect(fiche.frequence_demandee).toBe("mensuelle");
  await agent.close();
  const cr = await (await r.post(`/api/dossiers/${d.id}/offre`, { data: { reponse: "accepte" } })).json();
  expect(cr.echeances).toHaveLength(6);
});

for (const largeur of [360, 1440])
  for (const theme of ["light", "dark"] as const)
    test(`captures échéances @${largeur} ${theme}`, async ({ page, browser }) => {
      test.setTimeout(150_000);
      await page.setViewportSize({ width: largeur, height: largeur < 800 ? 780 : 900 });
      await page.emulateMedia({ colorScheme: theme });
      await connecter(page.request, "commercant");

      await page.goto("/app");
      await page.getByRole("radiogroup", { name: "Je rembourse" }).getByText("Chaque mois").click();
      await expect(page.getByTestId("phrase-echeance")).toContainText("chaque mois pendant");
      await capture(page, "1-estimation-mensuelle", theme);

      await page.goto("/app/simulateur");
      await expect(page.getByText(/il manque|C'est possible/)).toBeVisible({ timeout: 15_000 });
      await capture(page, "2-simulateur", theme);

      await page.goto("/app/dossier");
      await page.getByRole("button", { name: "Déposer mon dossier de crédit" }).click();
      await page.getByRole("radio", { name: /Banque Baobab/ }).check();
      await page.getByRole("button", { name: "Continuer" }).click();
      await expect(page.getByTestId("phrase-echeance")).toContainText("chaque mois");
      await capture(page, "3-dossier-modalites", theme);
      await page.getByRole("button", { name: "Continuer" }).click();
      await page.getByRole("button", { name: "Recevoir mon code par SMS" }).click();
      await expect(page.getByTestId("code-sms")).toBeVisible();
      await capture(page, "4-dossier-confirmation", theme);

      await page.goto("/app/credit");
      await expect(page.getByText(/6 échéances, chaque mois/)).toBeVisible();
      await page.getByText(/Échéancier/).click();
      await capture(page, "5-credit-mensuel", theme);

      const pro = await browser.newPage({ viewport: page.viewportSize()!, colorScheme: theme });
      await connecter(pro.request, "agent-lagune");
      await pro.goto("/console");
      await pro.getByRole("link", { name: "Séna Kpadonou" }).first().click();
      await expect(pro.getByTestId("modalites-demandees")).toBeVisible();
      await pro.keyboard.press("a");
      await expect(pro.getByLabel("Fréquence")).toBeVisible();
      await capture(pro, "6-console-fiche", theme);

      await connecter(pro.request, "responsable-lagune");
      await pro.goto("/console/parametres");
      await expect(pro.getByText("Modalités proposées au commerçant")).toBeVisible();
      await capture(pro, "7-console-parametres", theme);
      await pro.close();
    });
