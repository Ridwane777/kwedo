"use client";

import { ChevronLeft, ChevronRight, Play, RotateCcw } from "lucide-react";
import Link from "next/link";
import { BoutonIcone } from "@/components/bouton-icone";
import { BoutonTheme } from "@/components/user-button";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Lisiere, Marque } from "@/components/motif";
import { Bouton, Pastille, Simule } from "@/components/ui";
import { fcfa, pct } from "@/lib/format";
import { api, COMMERCANT_DEMO, connecter } from "@/lib/api";
import { useRaccourcis } from "@/lib/clavier";
import type { LigneDossier } from "@/lib/types";

type Ecran = { telephone?: string; console?: string; comparer?: boolean };
type Temps = { titre: string; duree: number; dire: string; ecran: (ids: Ids) => Ecran; action?: { label: string; faire: (ids: Ids) => Promise<void> } };
type Ids = { dossier?: string; alerte?: string; sain?: string; risque?: string };

// Comparaison côte à côte : un dossier sain et un dossier à risque de la file Lagune (risques calculés par le moteur).
const DOSSIER_SAIN = "com-edwige", DOSSIER_RISQUE = "com-hounkpe";

type Fiche = { id: string; commercant: { nom: string }; montant_demande: number; analyse: { plafond: number; raisons: { code: string; texte: string }[] };
  demande: { risque: number; seuil_risque: number; dans_tolerance: boolean } };

const troisiemePersonne = (t: string) => t.replace(/vous encaissez/g, "le commerçant encaisse").replace(/Vos encaissements/g, "Ses encaissements")
  .replace(/Votre activité/g, "Son activité").replace(/Votre historique/g, "Son historique").replace(/vos /g, "ses ");

function decisionProposee(d: Fiche) {
  if (d.demande.dans_tolerance) return "Accorder la demande";
  return d.analyse.plafond > 0 ? `Contre-proposer autour du plafond prudent (${fcfa(d.analyse.plafond)})` : "Refuser ou demander un complément";
}

/** Deux dossiers côte à côte : risque de la demande, raisons, décision proposée. */
function Comparaison({ ids, cle }: { ids: Ids; cle: number }) {
  const [fiches, setFiches] = useState<Fiche[] | null>(null);
  useEffect(() => {
    if (!ids.sain || !ids.risque) return;
    void Promise.all([ids.sain, ids.risque].map((x) => api<Fiche>(`/dossiers/${x}`))).then(setFiches).catch(() => setFiches(null));
  }, [ids.sain, ids.risque, cle]);
  if (!fiches) return <p className="text-encre-2">Chargement des deux dossiers…</p>;
  return (
    <div className="grid w-full gap-4 md:grid-cols-2" data-testid="comparaison">
      {fiches.map((d, k) => (
        <article key={d.id} className={`space-y-3 rounded-2xl border-l-4 bg-surface p-4 shadow-carte ${d.demande.dans_tolerance ? "border-bon" : "border-alerte"}`}>
          <p className="text-sm font-semibold text-encre-2">{k === 0 ? "Dossier sain" : "Dossier à risque"}</p>
          <h2 className="titre text-xl">{d.commercant.nom}</h2>
          <p>Demande : <strong className="chiffres">{fcfa(d.montant_demande)}</strong> · plafond prudent {fcfa(d.analyse.plafond)}</p>
          <p>Risque de défaut : <strong className="chiffres">{pct(d.demande.risque, 1)}</strong> pour une tolérance de {pct(d.demande.seuil_risque)}{" "}
            <Pastille ton={d.demande.dans_tolerance ? "bon" : "alerte"}>{d.demande.dans_tolerance ? "Dans la tolérance" : "Au-dessus de la tolérance"}</Pastille></p>
          <ul className="space-y-1 text-sm">{d.analyse.raisons.map((r) => <li key={r.code} className="border-l-2 border-marque pl-2">{troisiemePersonne(r.texte)}</li>)}</ul>
          <p className="font-semibold">Décision proposée : {decisionProposee(d)}</p>
          <Link href={`/console/dossiers/${d.id}`} target="_blank" className="text-sm text-marque underline underline-offset-4">Ouvrir la fiche</Link>
        </article>
      ))}
    </div>
  );
}

const MOTIF = "Saison creuse en janvier pour les tissus : prudence sur le montant.";

async function idsDemo(): Promise<Ids> {
  const f = await api<LigneDossier[]>("/dossiers");
  return { dossier: f.find((d) => d.commercant_id === COMMERCANT_DEMO)?.id, alerte: f.find((d) => d.alertes.includes("circulaire"))?.id,
    sain: f.find((d) => d.commercant_id === DOSSIER_SAIN)?.id, risque: f.find((d) => d.commercant_id === DOSSIER_RISQUE)?.id };
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
    dire: "Ses encaissements sont connectés. L'application affiche un plafond avec ses conditions (chaque semaine pendant 6 mois, aux conditions de Caisse Lagune), son tableau selon la durée, une échéance et trois raisons. La courbe montre la bande prudente : ce sur quoi elle peut compter même une mauvaise semaine." },
  { titre: "Simulateur", duree: 20, ecran: () => ({ telephone: "/app/simulateur" }),
    dire: "Elle demande plus. L'application lui dit exactement ce qui manque, en chiffre d'affaires vérifié et en régularité, puis propose des conseils." },
  { titre: "Envoi", duree: 20, ecran: () => ({ telephone: "/app/dossier" }),
    dire: "Elle dépose son dossier : elle saisit le montant qu'elle veut, pas celui du moteur, et son objet (achat de stock avant les fêtes). Au-dessus du plafond, un avertissement non bloquant. Elle choisit l'institution, rembourse chaque semaine ou chaque mois selon ce que l'institution propose, voit l'échéance exacte, et signe son accord avec un code reçu par SMS. Elle peut le retirer à tout moment.",
    action: { label: "Signer par code SMS et envoyer", faire: async () => {
      const demande = { objet_categorie: "stock", objet: "Acheter des pagnes wax avant les fêtes de fin d'année." };
      for (const [i, termes] of [["inst-lagune", { montant_demande: 600_000 }], ["inst-baobab", { frequence: "mensuelle", duree_mois: 6, montant_demande: 400_000 }]] as const) {
        const { code } = await api<{ code: string }>(`/commercants/${COMMERCANT_DEMO}/code-sms`, { body: { institution_id: i } });
        await api(`/commercants/${COMMERCANT_DEMO}/consentements`, { body: { institution_id: i, action: "accorde", code } });
        await api("/dossiers", { body: { commercant_id: COMMERCANT_DEMO, institution_id: i, ...demande, ...termes } });
      }
    } } },
  { titre: "Côté prêteur", duree: 60, ecran: (ids) => ({ console: ids.dossier ? `/console/dossiers/${ids.dossier}` : "/console" }),
    dire: "L'agent ouvre le dossier : en tête, le montant demandé, son objet et le risque de défaut pour CETTE demande, dans ou au-dessus de la tolérance de l'institution ; le plafond prudent sert de repère. Premier crédit chez Caisse Lagune : le palier limite le montant accordable. La contre-proposition part par défaut du plus petit des deux, palier ou plafond prudent ; risque recalculé, justificatif enregistré au journal.",
    action: { label: "Contre-proposer avec justificatif", faire: async (ids) => {
      if (!ids.dossier) throw new Error("Envoyez d'abord le dossier (temps 4).");
      const d = await api<{ analyse: { plafond: number }; montant_demande: number; palier: { montant_accordable: number } }>(`/dossiers/${ids.dossier}`);
      await api(`/dossiers/${ids.dossier}/decisions`, { body: { type: "ajuste", montant_decide: Math.min(d.palier.montant_accordable, d.montant_demande), motif: MOTIF } });
    } } },
  { titre: "Sain ou à risque", duree: 30, ecran: () => ({ comparer: true }),
    dire: "Deux dossiers de la même file, côte à côte. À gauche, des ventes stables : la demande reste dans la tolérance, l'agent peut accorder. À droite, des ventes en baisse : la demande dépasse le plafond prudent et le risque calculé par le moteur passe au-dessus de la tolérance ; les raisons nomment la cause, l'agent contre-propose ou refuse." },
  { titre: "Offre et accord", duree: 20, ecran: (ids) => ({ telephone: ids.dossier ? `/app/offre/${ids.dossier}` : "/app/dossier" }),
    dire: "Afiavi lit l'offre, marquée « contre-proposition » avec l'écart à sa demande : montant, durée, échéance, coût total, zéro frais Kwedo. Elle accepte ; l'échéancier se crée et le décaissement simulé part.",
    action: { label: "Accepter l'offre", faire: async (ids) => { await api(`/dossiers/${ids.dossier}/offre`, { body: { reponse: "accepte" } }); } } },
  { titre: "Remboursement", duree: 30, ecran: () => ({ telephone: "/app/credit", console: "/console/portefeuille" }),
    dire: "Un paiement arrive. Puis on avance l'horloge simulée : une échéance n'est pas payée, un rappel respectueux part sur le canal choisi, le portefeuille se met à jour.",
    action: { label: "Payer, puis avancer de 15 jours", faire: async (ids) => {
      const c = await api<{ credit: { id: string } | null }>(`/dossiers/${ids.dossier}`);
      if (!c.credit) throw new Error("Acceptez d'abord l'offre (temps 7).");
      const cr = await api<{ prochaine: { montant_attendu: number } }>(`/credits/${c.credit.id}`);
      await api(`/credits/${c.credit.id}/paiements`, { body: { montant: cr.prochaine.montant_attendu } });
      await enAdmin(() => api("/demo/avancer", { body: { jours: 15 } }));
    } } },
  { titre: "Le plafond grandit avec les remboursements", duree: 30, ecran: () => ({ telephone: "/app/credit", console: "/console/portefeuille" }),
    dire: "Afiavi rembourse chaque échéance à l'heure, semaine après semaine. À la dernière, le palier suivant se débloque : chez Caisse Lagune, sa limite passe de 150 000 à 225 000 FCFA. Chaque crédit bien remboursé devient une vraie donnée ; un retard grave ferait redescendre d'un palier.",
    action: { label: "Payer à l'heure et avancer de 7 jours, jusqu'à la fin du crédit", faire: async (ids) => {
      const c = await api<{ credit: { id: string } | null }>(`/dossiers/${ids.dossier}`);
      if (!c.credit) throw new Error("Acceptez d'abord l'offre (temps 7).");
      for (let k = 0; k < 60; k++) {
        const cr = await api<{ restant: number; echeances: { statut: string; date_due: string; montant_attendu: number; montant_recu: number }[]; prochaine: { date_due: string } | null }>(`/credits/${c.credit.id}`);
        if (!cr.restant || !cr.prochaine) break;
        // Ce qui est échu, plus la prochaine échéance : payé à l'heure.
        const du = cr.echeances.filter((e) => e.statut !== "payee" && e.date_due <= cr.prochaine!.date_due).reduce((s, e) => s + e.montant_attendu - e.montant_recu, 0);
        await api(`/credits/${c.credit.id}/paiements`, { body: { montant: Math.min(du, cr.restant) } });
        if (du >= cr.restant) break;
        await enAdmin(() => api("/demo/avancer", { body: { jours: 7 } }));
      }
    } } },
  { titre: "Test de résistance", duree: 20, ecran: () => ({ telephone: "/app/simulateur" }),
    dire: "Le curseur baisse les ventes de 30 % : la courbe descend et le plafond (même fréquence, même durée) diminue, en direct." },
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
          <span className="sm:hidden"><Simule quoi="Données simulées" /></span>
          <span className="hidden sm:inline"><Simule quoi="Scénario de démonstration, données figées et simulées" /></span>
          <BoutonTheme />
          <BoutonIcone icone={RotateCcw} label="Réinitialiser la démo" onClick={reinitialiser} disabled={etat.t === "occupe"} className="border border-trait" />
        </div>
      </header>
      <Lisiere hauteur={10} />
      <div className="grid flex-1 gap-6 p-4 sm:p-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <ol className="grid grid-cols-10 gap-1" aria-label="Temps du scénario">
            {TEMPS.map((x, i) => (
              <li key={x.titre}>
                <button onClick={() => setK(i)} aria-current={i === k ? "step" : undefined} title={x.titre}
                  className={`h-9 w-full rounded-md text-sm font-medium ${i === k ? "bg-action text-sur-action" : i < k ? "bg-marque-doux text-marque" : "bg-surface-2 text-encre-2"}`}>{i + 1}</button>
              </li>
            ))}
          </ol>
          <div className="space-y-3">
            <p className="text-sm text-encre-2">Temps {k + 1} sur {TEMPS.length} · {t.duree} s · total ≈ {Math.floor(total / 60)} min {total % 60} s</p>
            <h1 className="titre text-3xl">{t.titre}</h1>
            <p className="text-lg leading-relaxed">{t.dire}</p>
          </div>
          {t.action && <Bouton grand icone={Play} className="w-full" onClick={agir} disabled={etat.t === "occupe"} aria-busy={etat.t === "occupe"}>{t.action.label}</Bouton>}
          {etat.m && <p role={etat.t === "erreur" ? "alert" : "status"} className={etat.t === "erreur" ? "text-alerte" : "text-bon"}>{etat.m}</p>}
          <div className="flex justify-between">
            <BoutonIcone icone={ChevronLeft} label="Précédent" ancre="gauche" onClick={() => setK(Math.max(k - 1, 0))} disabled={k === 0} className="border border-trait" infobulle="haut" />
            <BoutonIcone icone={ChevronRight} label="Suivant" onClick={() => setK(Math.min(k + 1, TEMPS.length - 1))} disabled={k === TEMPS.length - 1} className="border border-trait bg-surface" infobulle="haut" />
          </div>
          <p className="text-xs text-encre-2">Clavier : ← et →. Les écrans à droite sont l'application réelle, branchée sur l'API locale.</p>
        </aside>
        <section className="flex min-w-0 flex-wrap items-start justify-center gap-6" aria-label="Écrans">
          {pret && ecran.comparer && <Comparaison ids={ids} cle={cle} />}
          {pret && ecran.telephone && (
            <figure className="w-[380px] max-w-full space-y-2">
              <div className="h-[760px] w-full overflow-hidden rounded-[2.2rem] border-[10px] border-cadre bg-fond shadow-carte">
                <iframe key={`t${cle}${ecran.telephone}`} src={ecran.telephone} title="Application commerçant" className="h-full w-full" />
              </div>
              <figcaption className="text-center text-xs text-encre-2">Application commerçant · 360 px</figcaption>
            </figure>
          )}
          {pret && ecran.console && (
            <figure className="w-full min-w-0 flex-1 space-y-2 md:min-w-[560px]">
              <div className="overflow-hidden rounded-xl border border-trait shadow-carte" style={{ height: 760 }}>
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
