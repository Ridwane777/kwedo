// Tournage de la vidéo de démo Kwedo (≤ 2 min 30) : cartes + parcours réel sur l'app, sous-titres et curseur.
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
  b.style.cssText = "position:fixed;z-index:2147483646;left:50%;bottom:26px;transform:translateX(-50%);max-width:1180px;background:rgba(19,32,27,.88);color:#fff;font:600 24px/1.35 'Public Sans',system-ui,sans-serif;padding:14px 26px;border-radius:16px;text-align:center;pointer-events:none;opacity:0;transition:opacity .3s";
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
  if (r) await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2, { steps: 25 });
  await pause(p, 0.35);
}
async function clique(p, loc) { await viser(p, loc); await loc.click(); }

async function defiler(p, dy, duree = 1.2) {
  const n = 24;
  for (let k = 0; k < n; k++) { await p.mouse.wheel(0, dy / n); await p.waitForTimeout((duree * 1000) / n); }
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
  await pause(p, 0.8);
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

  top("titre");
  await carte(p, cartes.titre, "", 7);
  top("référence");
  await carte(p, cartes.reference, "Notre référence : le crédit mobile money de MTN Bénin.", 11);

  // 1. Commerçant
  top("commerçant");
  await connecter(p, "Afiavi Houngbo");
  await p.goto(B + "/app"); await p.getByText("votre plafond estimé").waitFor({ timeout: 20000 });
  await legende(p, "Afiavi vend des pagnes. Kwedo lit ses encaissements mobile money vérifiés.");
  await pause(p, 4.5);
  await viser(p, p.getByText(/remboursés (chaque|toutes)/).first());
  await legende(p, "Un plafond prudent, toujours affiché avec ses conditions : fréquence, durée, institution.");
  await pause(p, 4.5);
  await viser(p, p.getByText("Plafond selon la durée").first());
  await legende(p, "Le plafond dépend de la durée : de 440 000 FCFA sur 3 mois à 1,66 million sur 12 mois.");
  await pause(p, 5);
  await clique(p, p.getByText("Chaque mois", { exact: true }).first());
  await legende(p, "Elle peut aussi rembourser chaque mois : tout se recalcule.");
  await pause(p, 3.5);
  await defiler(p, 650);
  await legende(p, "Chaque montant est expliqué : la base est une mauvaise semaine, pas la moyenne.");
  await pause(p, 4.5);

  await p.goto(B + "/app/conseils"); await p.getByText("Faire monter mon plafond").waitFor();
  await legende(p, "Des conseils chiffrés par le moteur, du plus utile au moins utile.");
  await pause(p, 4.5);

  // 2. Dépôt du dossier
  top("dépôt");
  await p.goto(B + "/app/dossier"); await p.getByRole("button", { name: "Déposer mon dossier de crédit" }).waitFor();
  await legende(p, "Elle dépose son dossier : elle choisit l'institution, le montant et l'objet.");
  await clique(p, p.getByRole("button", { name: "Déposer mon dossier de crédit" }));
  await clique(p, p.locator("label", { hasText: "Mutuelle Solidaire" }));
  await clique(p, p.getByRole("button", { name: "Continuer" }));
  const montant = p.getByPlaceholder("Ex. 300 000");
  await clique(p, montant); await montant.pressSequentially("350000", { delay: 70 });
  await clique(p, p.locator("label", { hasText: "Achat de stock" }));
  const objet = p.getByPlaceholder("Ex. : acheter des pagnes avant les fêtes");
  await clique(p, objet); await objet.pressSequentially("Acheter des pagnes avant les fêtes", { delay: 35 });
  await pause(p, 1);
  await clique(p, p.getByRole("button", { name: "Continuer" }));
  await legende(p, "Récapitulatif, puis accord signé par code SMS (simulé) pour cette seule institution.");
  await pause(p, 2.5);
  const recevoir = p.getByRole("button", { name: /Recevoir mon code/ });
  const champ = p.locator('input[maxlength="6"], input[autocomplete="one-time-code"], input[inputmode="numeric"]').first();
  if (await recevoir.count()) { await clique(p, recevoir); await champ.waitFor({ timeout: 15000 }).catch(() => {}); await pause(p, 1.2); }
  const code = (await p.locator("body").innerText()).match(/\b(\d{6})\b/);
  if (!code) await p.screenshot({ path: "sms-echec.png" });
  if (code && (await champ.count())) {
    await clique(p, champ); await champ.pressSequentially(code[1], { delay: 120 });
    await pause(p, 0.8);
    const signer = p.getByRole("button", { name: /Signer et envoyer/ });
    if (await signer.count()) await clique(p, signer);
    await legende(p, "Dossier envoyé : seule la Mutuelle le voit, et c'est elle qui décide.");
  } else console.log("!! code SMS non trouvé : dépôt non signé");
  await pause(p, 3.5);

  // 3. Console de l'institution
  top("console");
  await connecter(p, "Agent de crédit");
  await p.goto(B + "/console"); await p.getByRole("heading", { name: "Aujourd'hui" }).waitFor();
  await legende(p, "Côté institution : l'agent de crédit voit ce qu'il doit traiter aujourd'hui.");
  await pause(p, 4.5);
  await p.goto(B + "/console/demandes"); await p.getByRole("heading", { name: "Demandes" }).waitFor();
  await legende(p, "Les demandes, triables par risque. Les dossiers traités restent consultables.");
  const tri = p.getByLabel("Tri");
  if (await tri.count()) { await viser(p, tri); await tri.selectOption({ label: "Risque décroissant" }).catch(() => {}); }
  await pause(p, 3.5);
  await clique(p, p.getByRole("link", { name: /Hounkpè Dossou/ }).first());
  await p.getByText("Risque de défaut pour cette demande").waitFor();
  await legende(p, "Le risque est calculé pour la demande exacte : 25,2 %, au-dessus de la tolérance de 10 %.");
  await pause(p, 5.5);
  await viser(p, p.getByText("Ce qui a pesé sur le plafond prudent"));
  await legende(p, "Les raisons sont lisibles, et une alerte signale un profil de flux inhabituel.");
  await pause(p, 4);
  await clique(p, p.locator("label", { hasText: "Contre-proposer" }));
  await legende(p, "L'agent décide : il peut contre-proposer un montant plus prudent. Rien n'est automatique.");
  await pause(p, 5);

  // 4. Résultats et fin
  top("résultats");
  await carte(p, cartes.resultats, "Les chiffres de MTN et les nôtres ne se mesurent pas de la même façon : nous le disons.", 20);
  top("fin");
  await carte(p, cartes.fin, "", 6);
  top("total");

  await ctx.close(); await nav.close();
})();
