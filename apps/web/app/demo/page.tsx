"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Lisiere, Marque } from "@/components/motif";
import { Bouton, Simule } from "@/components/ui";
import { api, COMMERCANT_DEMO, connecter } from "@/lib/api";
import { useRaccourcis } from "@/lib/clavier";
import type { LigneDossier } from "@/lib/types";

type Ecran = { telephone?: string; console?: string };
type Temps = { titre: string; duree: number; dire: string; ecran: (ids: Ids) => Ecran; action?: { label: string; faire: (ids: Ids) => Promise<void> } };
type Ids = { dossier?: string; alerte?: string };

const MOTIF = "Saison creuse en janvier pour les tissus : prudence sur le montant.";

async function idsDemo(): Promise<Ids> {
  const f = await api<LigneDossier[]>("/dossiers");
  return { dossier: f.find((d) => d.commercant_id === COMMERCANT_DEMO)?.id, alerte: f.find((d) => d.alertes.includes("circulaire"))?.id };
}

// Le scénario joue les deux côtés : commerçant et agent Lagune. Les commandes de la démo passent par le profil admin.
const profilsDemo = async () => { await connecter("commercant"); await connecter("agent-lagune"); };
async function enAdmin<T>(faire: () => Promise<T>) {
  await connecter("admin");
  try { return await faire(); } finally { await connecter("agent-lagune"); }
}

const TEMPS: Temps[] = [
  { titre: "Le problème", duree: 20, ecran: () => ({ telephone: "/app/activite" }),
    dire: "Afiavi Houngbo vend des tissus à Cotonou. Personnage fictif, flux simulés. Elle n'a pas de relevé bancaire, mais elle encaisse chaque jour par mobile money sur un compte marchand séparé." },
  { titre: "Estimation", duree: 30, ecran: () => ({ telephone: "/app" }),
    dire: "Ses encaissements sont connectés. L'application affiche un montant, une durée, une échéance et trois raisons. La courbe montre la bande prudente : ce sur quoi elle peut compter même une mauvaise semaine." },
  { titre: "Simulateur", duree: 20, ecran: () => ({ telephone: "/app/simulateur" }),
    dire: "Elle demande plus. L'application lui dit exactement ce qui manque, en chiffre d'affaires vérifié et en régularité, puis propose des conseils." },
  { titre: "Envoi", duree: 20, ecran: () => ({ telephone: "/app/dossier" }),
    dire: "Elle choisit deux institutions fictives et donne son accord pour chacune. Elle peut le retirer à tout moment.",
    action: { label: "Donner l'accord et envoyer", faire: async () => {
      for (const i of ["inst-lagune", "inst-baobab"]) {
        await api(`/commercants/${COMMERCANT_DEMO}/consentements`, { body: { institution_id: i, action: "accorde" } });
        await api("/dossiers", { body: { commercant_id: COMMERCANT_DEMO, institution_id: i } });
      }
    } } },
  { titre: "Côté prêteur", duree: 60, ecran: (ids) => ({ console: ids.dossier ? `/console/dossiers/${ids.dossier}` : "/console" }),
    dire: "L'agent ouvre le dossier : courbe, indicateurs, montant proposé et raisons. Un autre dossier porte une alerte de manipulation : l'agent tranche, le commerçant n'est pas accusé. Ici, l'agent ajuste le montant avec un justificatif ; le temps de traitement s'affiche.",
    action: { label: "Ajuster avec justificatif", faire: async (ids) => {
      if (!ids.dossier) throw new Error("Envoyez d'abord le dossier (temps 4).");
      const d = await api<{ analyse: { plafond: number } }>(`/dossiers/${ids.dossier}`);
      await api(`/dossiers/${ids.dossier}/decisions`, { body: { type: "ajuste", montant_decide: Math.floor((d.analyse.plafond * 0.8) / 5000) * 5000, motif: MOTIF } });
    } } },
  { titre: "Offre et accord", duree: 20, ecran: (ids) => ({ telephone: ids.dossier ? `/app/offre/${ids.dossier}` : "/app/dossier" }),
    dire: "Afiavi lit l'offre : montant, durée, échéance, coût total, zéro frais Kwedo. Elle accepte ; l'échéancier se crée et le décaissement simulé part.",
    action: { label: "Accepter l'offre", faire: async (ids) => { await api(`/dossiers/${ids.dossier}/offre`, { body: { reponse: "accepte" } }); } } },
  { titre: "Remboursement", duree: 30, ecran: () => ({ telephone: "/app/credit", console: "/console/portefeuille" }),
    dire: "Un paiement arrive. Puis on avance l'horloge simulée : une échéance n'est pas payée, un rappel respectueux part sur le canal choisi, le portefeuille se met à jour.",
    action: { label: "Payer, puis avancer de 15 jours", faire: async (ids) => {
      const c = await api<{ credit: { id: string } | null }>(`/dossiers/${ids.dossier}`);
      if (!c.credit) throw new Error("Acceptez d'abord l'offre (temps 6).");
      const cr = await api<{ prochaine: { montant_attendu: number } }>(`/credits/${c.credit.id}`);
      await api(`/credits/${c.credit.id}/paiements`, { body: { montant: cr.prochaine.montant_attendu } });
      await enAdmin(() => api("/demo/avancer", { body: { jours: 15 } }));
    } } },
  { titre: "Test de résistance", duree: 20, ecran: () => ({ telephone: "/app/simulateur" }),
    dire: "Le curseur baisse les ventes de 30 % : la courbe descend et le plafond diminue, en direct." },
  { titre: "Clôture", duree: 15, ecran: () => ({ telephone: "/app", console: "/console/journal" }),
    dire: "Tout ce que vous avez vu est simulé et étiqueté comme tel. Sur ces données, le moteur est stable, explicable et détecte les manipulations injectées ; il ne classe pas encore mieux qu'une règle simple. La suite : un pilote avec une institution de microfinance, sur de vrais remboursements." },
];

export default function Demo() {
  const [k, setK] = useState(0);
  const [ids, setIds] = useState<Ids>({});
  const [etat, setEtat] = useState<{ t: "idle" | "occupe" | "ok" | "erreur"; m?: string }>({ t: "idle" });
  const [cle, setCle] = useState(0); // force le rechargement des écrans
  const t = TEMPS[k]!;
  const ecran = t.ecran(ids);

  const [pret, setPret] = useState(false);
  const rafraichir = useCallback(async () => { try { setIds(await idsDemo()); } catch { /* API arrêtée : message à l'action */ } setCle((c) => c + 1); }, []);
  useEffect(() => { void profilsDemo().catch(() => {}).finally(() => setPret(true)); }, []);
  useEffect(() => { if (pret) void rafraichir(); }, [k, pret, rafraichir]);

  async function reinitialiser() {
    setEtat({ t: "occupe" });
    try {
      await enAdmin(() => api("/demo/reinitialiser", { body: {} }));
      await profilsDemo();
      setK(0); await rafraichir(); setEtat({ t: "ok", m: "Démo réinitialisée : données figées rechargées." });
    } catch (e) { setEtat({ t: "erreur", m: e instanceof Error ? e.message : "Erreur" }); }
  }
  async function agir() {
    if (!t.action) return;
    setEtat({ t: "occupe" });
    try { await t.action.faire(ids); await rafraichir(); setEtat({ t: "ok", m: "Fait." }); }
    catch (e) { setEtat({ t: "erreur", m: e instanceof Error ? e.message : "Erreur" }); }
  }
  const raccourcis = useMemo(() => ({
    ArrowRight: () => setK((x) => Math.min(x + 1, TEMPS.length - 1)), ArrowLeft: () => setK((x) => Math.max(x - 1, 0)),
  }), []);
  useRaccourcis(raccourcis);
  const total = TEMPS.reduce((a, x) => a + x.duree, 0);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/"><Marque /></Link>
        <div className="flex items-center gap-3">
          <Simule quoi="Scénario de démonstration · données figées et simulées" />
          <Bouton variante="trait" onClick={reinitialiser} disabled={etat.t === "occupe"}>Réinitialiser la démo</Bouton>
        </div>
      </header>
      <Lisiere hauteur={10} />
      <div className="grid flex-1 gap-6 p-4 sm:p-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <ol className="grid grid-cols-9 gap-1" aria-label="Temps du scénario">
            {TEMPS.map((x, i) => (
              <li key={x.titre}>
                <button onClick={() => setK(i)} aria-current={i === k ? "step" : undefined} title={x.titre}
                  className={`h-9 w-full rounded-md text-sm font-medium ${i === k ? "bg-marque text-fond" : i < k ? "bg-marque-doux text-marque" : "bg-surface-2 text-encre-2"}`}>{i + 1}</button>
              </li>
            ))}
          </ol>
          <div className="space-y-3">
            <p className="text-sm text-encre-2">Temps {k + 1} sur 9 · {t.duree} s · total ≈ {Math.floor(total / 60)} min {total % 60} s</p>
            <h1 className="titre text-3xl">{t.titre}</h1>
            <p className="text-lg leading-relaxed">{t.dire}</p>
          </div>
          {t.action && <Bouton grand className="w-full" onClick={agir} disabled={etat.t === "occupe"}>{etat.t === "occupe" ? "…" : t.action.label}</Bouton>}
          {etat.m && <p role={etat.t === "erreur" ? "alert" : "status"} className={etat.t === "erreur" ? "text-alerte" : "text-bon"}>{etat.m}</p>}
          <div className="flex justify-between">
            <Bouton variante="discret" onClick={() => setK(Math.max(k - 1, 0))} disabled={k === 0}>← Précédent</Bouton>
            <Bouton variante="trait" onClick={() => setK(Math.min(k + 1, TEMPS.length - 1))} disabled={k === TEMPS.length - 1}>Suivant →</Bouton>
          </div>
          <p className="text-xs text-encre-2">Clavier : ← et →. Les écrans à droite sont l'application réelle, branchée sur l'API locale.</p>
        </aside>
        <section className="flex min-w-0 flex-wrap items-start justify-center gap-6" aria-label="Écrans">
          {pret && ecran.telephone && (
            <figure className="w-[380px] max-w-full space-y-2">
              <div className="h-[760px] w-full overflow-hidden rounded-[2.2rem] border-[10px] border-encre bg-fond shadow-xl">
                <iframe key={`t${cle}${ecran.telephone}`} src={ecran.telephone} title="Application commerçant" className="h-full w-full" />
              </div>
              <figcaption className="text-center text-xs text-encre-2">Application commerçant · 360 px</figcaption>
            </figure>
          )}
          {pret && ecran.console && (
            <figure className="w-full min-w-0 flex-1 space-y-2 md:min-w-[560px]">
              <div className="overflow-hidden rounded-xl border border-trait shadow-lg" style={{ height: 760 }}>
                <iframe key={`c${cle}${ecran.console}`} src={ecran.console} title="Console prêteur" className="h-full w-full" />
              </div>
              <figcaption className="text-center text-xs text-encre-2">Console prêteur</figcaption>
            </figure>
          )}
        </section>
      </div>
    </div>
  );
}
