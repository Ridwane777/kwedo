// Vidéo de démonstration Kwedo, parcours de bout en bout : Afiavi demande, l'institution décide, Afiavi rembourse.
// Puis référence et résultats. Rythme serré (pas de son) : chaque écran reste le temps de lire son sous-titre.
const { chromium } = require("playwright");
const cartes = require("./cartes");
const B = process.env.KWEDO_URL || "http://127.0.0.1:3461";
// Navigateur : celui de Playwright par défaut, ou un Chromium précis via KWEDO_CHROME.
const CHROME = process.env.KWEDO_CHROME || undefined;
const W = 1440, H = 900;

// Curseur visible et bandeau de sous-titre, posés à chaque page.
const DECOR = `
(() => {
  if (document.getElementById("kw-curseur")) return;
  const c = document.createElement("div");
  c.id = "kw-curseur";
  c.style.cssText = "position:fixed;z-index:2147483647;width:22px;height:22px;border-radius:50%;background:rgba(12,90,70,.35);border:2px solid #0c5a46;pointer-events:none;transform:translate(-50%,-50%);left:-50px;top:-50px;transition:transform .12s";
  document.documentElement.appendChild(c);
  addEventListener("mousemove", (e) => { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; }, true);
  addEventListener("mousedown", () => { c.style.transform = "translate(-50%,-50%) scale(.7)"; }, true);
  addEventListener("mouseup", () => { c.style.transform = "translate(-50%,-50%)"; }, true);
  const b = document.createElement("div");
  b.id = "kw-legende";
  b.style.cssText = "position:fixed;z-index:2147483646;left:50%;bottom:22px;transform:translateX(-50%);max-width:1100px;background:rgba(19,32,27,.9);color:#fff;font:600 23px/1.3 'Public Sans',system-ui,sans-serif;padding:11px 24px;border-radius:14px;text-align:center;pointer-events:none;opacity:0;transition:opacity .2s";
  document.documentElement.appendChild(b);
})();`;

const pause = (p, s) => p.waitForTimeout(s * 1000);
const decorer = (p) => p.addScriptTag({ content: DECOR });

async function legende(p, texte) {
  if (!(await p.locator("#kw-legende").count())) await decorer(p);
  await p.evaluate((t) => {
    const b = document.getElementById("kw-legende");
    b.textContent = t;
    b.style.opacity = t ? "1" : "0";
  }, texte);
}

async function viser(p, loc) {
  await loc.scrollIntoViewIfNeeded();
  const r = await loc.boundingBox();
  if (r) await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2, { steps: 12 });
  await pause(p, 0.15);
}
async function clique(p, loc) { await viser(p, loc); await loc.click(); }
async function taper(p, loc, texte, delai) { await clique(p, loc); await loc.pressSequentially(texte, { delay: delai }); }

async function defiler(p, dy) {
  for (let k = 0; k < 15; k++) { await p.mouse.wheel(0, dy / 15); await p.waitForTimeout(40); }
}

// Risque affiché sur la fiche (jamais écrit en dur : il dépend de l'état de la démo).
async function risque(p) {
  const t = await p.locator("body").innerText();
  const m = t.match(/Risque de défaut pour cette demande\s*([\d\s,]+\s?%)/);
  return m ? m[1].replace(/\s+/g, " ").trim().replace(" %", " %") : "risque calculé";
}

async function carte(p, html, texte, s) {
  await p.setContent(html);
  await decorer(p);
  await legende(p, texte);
  await pause(p, s);
}

async function connecter(p, motif) {
  await p.context().clearCookies();
  await p.goto(B + "/connexion");
  await pause(p, 0.4);
  await clique(p, p.getByRole("button", { name: new RegExp(motif) }).first());
  await p.waitForURL(/\/(app|console)/, { timeout: 15000 }).catch(() => {});
}

(async () => {
  const nav = await chromium.launch({ executablePath: CHROME });
  const ctx = await nav.newContext({ viewport: { width: W, height: H }, colorScheme: "light", recordVideo: { dir: "brut", size: { width: W, height: H } } });
  await ctx.addInitScript(DECOR);
  const p = await ctx.newPage();
  const t0 = Date.now();
  const top = (n) => console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s  ${n}`);

  top("ouverture");
  await carte(p, cartes.ouverture, "", 2.5);

  // Acte 1 : Afiavi prépare sa demande
  top("Afiavi");
  await connecter(p, "Afiavi Houngbo");
  await p.goto(B + "/app"); await p.getByText("votre plafond estimé").waitFor({ timeout: 20000 });
  await legende(p, "Son plafond, calculé sur ses ventes vérifiées.");
  await pause(p, 2.8);
  await viser(p, p.getByText("Plafond selon la durée").first());
  await legende(p, "Il dépend de la durée choisie.");
  await pause(p, 2.6);
  await clique(p, p.getByText("Chaque mois", { exact: true }).first());
  await legende(p, "Rembourser chaque mois : tout se recalcule.");
  await pause(p, 2.4);
  await defiler(p, 650);
  await legende(p, "Chaque montant est expliqué.");
  await pause(p, 2.6);

  await p.goto(B + "/app/conseils"); await p.getByText("À améliorer, du plus utile au moins utile").waitFor({ timeout: 30000 });
  await legende(p, "Ses conseils, chiffrés : ce qui ferait monter son plafond.");
  await pause(p, 3.2);

  top("dépôt");
  await p.goto(B + "/app/dossier"); await p.getByRole("button", { name: "Déposer mon dossier de crédit" }).waitFor();
  await legende(p, "Elle dépose son dossier.");
  await clique(p, p.getByRole("button", { name: "Déposer mon dossier de crédit" }));
  await clique(p, p.locator("label", { hasText: "Caisse Lagune" }));
  await clique(p, p.getByRole("button", { name: "Continuer" }));
  await taper(p, p.getByPlaceholder("Ex. 300 000"), "350000", 45);
  await clique(p, p.locator("label", { hasText: "Achat de stock" }));
  await taper(p, p.getByPlaceholder("Ex. : acheter des pagnes avant les fêtes"), "Pagnes pour les fêtes", 20);
  await clique(p, p.getByRole("button", { name: "Continuer" }));
  await legende(p, "Accord signé par code SMS (simulé).");
  const champ = p.locator('input[maxlength="6"], input[autocomplete="one-time-code"], input[inputmode="numeric"]').first();
  await clique(p, p.getByRole("button", { name: /Recevoir mon code/ }));
  await champ.waitFor({ timeout: 15000 });
  const code = (await p.locator("body").innerText()).match(/\b(\d{6})\b/)[1];
  await taper(p, champ, code, 60);
  await clique(p, p.getByRole("button", { name: /Signer et envoyer/ }));
  await p.getByText(/Dossier envoyé/).waitFor({ timeout: 15000 }).catch(() => {});
  await legende(p, "Dossier envoyé à Caisse Lagune.");
  await pause(p, 2.2);

  // Acte 2 : l'institution décide
  top("institution");
  await connecter(p, "Les dossiers de son institution");
  await p.goto(B + "/console/demandes"); await p.getByRole("heading", { name: "Demandes" }).waitFor();
  const tri = p.getByLabel("Tri");
  if (await tri.count()) { await viser(p, tri); await tri.selectOption({ label: "Risque décroissant" }).catch(() => {}); }
  await legende(p, "Chez Caisse Lagune : les demandes, triées par risque.");
  await pause(p, 2.8);
  await clique(p, p.getByRole("link", { name: /Hounkpè Dossou/ }).first());
  await p.getByText("Risque de défaut pour cette demande").waitFor();
  await legende(p, `Un dossier à risque : ${await risque(p)}, au-dessus de la tolérance, avec une alerte.`);
  await pause(p, 3.4);
  await p.goto(B + "/console/demandes");
  await clique(p, p.getByRole("link", { name: /Afiavi Houngbo/ }).first());
  await p.getByText("Risque de défaut pour cette demande").waitFor();
  await legende(p, `La demande d'Afiavi : ${await risque(p)}, dans la tolérance. Raisons détaillées.`);
  await pause(p, 3.4);
  await clique(p, p.locator("label", { hasText: "Accorder" }).first());
  await taper(p, p.locator("textarea").first(), "Ventes régulières, demande sous le plafond.", 12);
  await clique(p, p.getByRole("button", { name: /Enregistrer la décision/ }));
  await legende(p, "L'agent accorde, avec un justificatif tracé.");
  await pause(p, 2.6);

  // Acte 3 : Afiavi accepte et rembourse
  top("remboursement");
  await connecter(p, "Afiavi Houngbo");
  await p.goto(B + "/app/dossier");
  await clique(p, p.getByRole("link", { name: /Voir l.offre/ }).first());
  await p.getByRole("button", { name: /Accepter/ }).waitFor();
  await legende(p, "Afiavi reçoit l'offre et l'accepte.");
  await pause(p, 2.2);
  await clique(p, p.getByRole("button", { name: /Accepter/ }).first());
  await p.getByRole("heading", { name: "Mon crédit" }).waitFor();
  await legende(p, "Elle paie ses premières échéances par mobile money (simulé).");
  const payer = p.getByRole("button", { name: /Payer .* par mobile money/ });
  for (let k = 0; k < 2; k++) {
    await pause(p, 1.2);
    await clique(p, payer);
    await p.getByText(/Paiement reçu/).waitFor({ timeout: 10000 }).catch(() => {});
  }
  await pause(p, 1);
  await clique(p, p.getByText(/Échéancier \(/).first());
  await legende(p, "Échéancier à jour, reçus, rappels au choix.");
  await pause(p, 2.6);

  // Acte 4 : référence et résultats
  top("référence");
  await carte(p, cartes.reference, "", 8);
  top("résultats");
  await carte(p, cartes.resultats, "", 10);
  await carte(p, cartes.fin, "", 2.5);
  top("total");

  await ctx.close(); await nav.close();
})();
