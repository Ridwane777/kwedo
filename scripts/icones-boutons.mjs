// Passe « icônes » (docs/MISSION-MENU-COMPTE.md) : icône + libellé sur les actions engageantes,
// icône seule (BoutonIcone) sur les actions courantes. Chaque remplacement doit trouver sa cible, sinon échec.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const W = process.argv[2];
const PLAN = {
  "app/app/activite/page.tsx": { lucide: ["Link2"], r: [
    [`<LienBouton href="/app/flux" grand className="w-full">Connecter`, `<LienBouton href="/app/flux" grand icone={Link2} className="w-full">Connecter`]] },
  "app/app/compte/page.tsx": { lucide: ["Link2", "TrendingUp"], r: [
    [`<LienBouton href="/app" grand className="w-full">Voir mon estimation`, `<LienBouton href="/app" grand icone={TrendingUp} className="w-full">Voir mon estimation`],
    [`<LienBouton href="/app/flux" grand className="w-full">Connecter`, `<LienBouton href="/app/flux" grand icone={Link2} className="w-full">Connecter`]] },
  "app/app/conseils/page.tsx": { lucide: ["Send"], r: [
    [`<LienBouton href="/app/dossier" grand className="w-full">Envoyer`, `<LienBouton href="/app/dossier" grand icone={Send} className="w-full">Envoyer`]] },
  "app/app/credit/page.tsx": { lucide: ["Wallet", "FileText"], r: [
    [`<Bouton grand className="w-full" disabled={envoi || du <= 0} onClick={payer}>`, `<Bouton grand icone={Wallet} className="w-full" disabled={envoi || du <= 0} onClick={payer}>`],
    [`<LienBouton href="/app/dossier" variante="trait" className="mt-3">`, `<LienBouton href="/app/dossier" variante="trait" icone={FileText} className="mt-3">`]] },
  "app/app/dossier/page.tsx": { lucide: ["Send"], r: [
    [`<Bouton grand className="w-full" disabled={!aEnvoyer.length || occupe === "envoi"} onClick={envoyer}>`, `<Bouton grand icone={Send} className="w-full" disabled={!aEnvoyer.length || occupe === "envoi"} onClick={envoyer}>`]] },
  "app/app/flux/page.tsx": { lucide: ["Link2"], r: [
    [`<Bouton grand className="w-full" disabled={!accord`, `<Bouton grand icone={Link2} className="w-full" disabled={!accord`]] },
  "app/app/inscription/page.tsx": { lucide: ["UserPlus"], r: [
    [`<Bouton type="submit" grand className="w-full" disabled={envoi}>`, `<Bouton type="submit" grand icone={UserPlus} className="w-full" disabled={envoi}>`]] },
  "app/app/offre/[id]/page.tsx": { lucide: ["Check", "CreditCard", "X"], r: [
    [`<Bouton grand className="w-full" onClick={() => router.push("/app/credit")}>Voir mon crédit</Bouton>
      </section>`, `<Bouton grand icone={CreditCard} className="w-full" onClick={() => router.push("/app/credit")}>Voir mon crédit</Bouton>
      </section>`],
    [`{o.credit && <Bouton grand className="w-full"`, `{o.credit && <Bouton grand icone={CreditCard} className="w-full"`],
    [`<Bouton grand className="w-full" disabled={!!envoi} onClick={() => repondre("accepte")}>`, `<Bouton grand icone={Check} className="w-full" disabled={!!envoi} onClick={() => repondre("accepte")}>`],
    [`<Bouton variante="discret" className="w-full" disabled={!!envoi} onClick={() => repondre("refuse")}>`, `<Bouton variante="discret" icone={X} className="w-full" disabled={!!envoi} onClick={() => repondre("refuse")}>`]] },
  "app/app/simulateur/page.tsx": { lucide: ["Lightbulb"], r: [
    [`<LienBouton href="/app/conseils" grand variante="trait" className="w-full">`, `<LienBouton href="/app/conseils" grand variante="trait" icone={Lightbulb} className="w-full">`]] },
  "app/console/parametres/page.tsx": { lucide: ["Save"], r: [
    [`<Bouton type="submit" className="mt-2">Enregistrer`, `<Bouton type="submit" icone={Save} className="mt-2">Enregistrer`]] },
  "app/console/portefeuille/page.tsx": { lucide: ["CalendarClock", "Save"], bi: true, r: [
    [`<button className="text-marque hover:underline" onClick={() => setOuvert(true)}>Reprogrammer</button>`, `<BoutonIcone icone={CalendarClock} label="Reprogrammer l'échéance" className="border border-trait" onClick={() => setOuvert(true)} />`],
    [`<Bouton type="submit">Enregistrer</Bouton>`, `<Bouton type="submit" icone={Save}>Enregistrer</Bouton>`]] },
  "app/console/dossiers/[id]/page.tsx": { lucide: ["ArrowLeft", "Save"], bi: true, r: [
    [`<Bouton type="submit" className="w-full"`, `<Bouton type="submit" icone={Save} className="w-full"`]] },
};

for (const [f, { lucide, r, bi }] of Object.entries(PLAN)) {
  const p = join(W, f);
  let t = readFileSync(p, "utf8");
  for (const [a, b] of r) {
    if (!t.includes(a)) throw new Error(`${f} : cible introuvable : ${a.slice(0, 70)}`);
    t = t.replace(a, b);
  }
  const imp = `import { ${lucide.join(", ")} } from "lucide-react";\n` + (bi ? `import { BoutonIcone } from "@/components/bouton-icone";\n` : "");
  t = t.replace(/("use client";\n\n)?/, (m) => m + imp);
  writeFileSync(p, t);
  console.log("ok", f);
}
