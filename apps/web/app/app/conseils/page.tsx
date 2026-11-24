"use client";

import { CircleCheck, Send, TrendingUp } from "lucide-react";
import { Chargement, Erreur, LienBouton, Pastille, Simule } from "@/components/ui";
import { useApi } from "@/lib/api";
import { useCommercant } from "@/lib/commercant";
import { duree, fcfa, FREQ, type Frequence } from "@/lib/format";
import { useState } from "react";
import type { Conseils, Levier, Palier } from "@/lib/types";

function Paliers({ paliers, compact = false }: { paliers: Palier[]; compact?: boolean }) {
  return (
    <ol className="flex gap-2" aria-label="Paliers d'historique vérifié">
      {paliers.map((p) => (
        <li key={p.semaines} className={`min-w-0 flex-1 rounded-xl border text-center ${compact ? "p-2" : "p-3"} ${p.atteint ? "border-bon bg-bon-doux" : "border-trait"}`}>
          <p className={`montant ${compact ? "text-lg" : "text-2xl"}`}>{p.mois} mois</p>
          <p className="text-xs text-encre-2">{p.atteint ? "atteint" : `encore ${p.reste} sem.`}</p>
        </li>
      ))}
    </ol>
  );
}

function Effet({ l }: { l: Levier }) {
  if (l.effet === null)
    return (
      <div className="rounded-xl bg-surface-2 p-3">
        <p className="font-semibold text-encre-2">Effet non chiffré</p>
        <p className="text-sm text-encre-2">{l.condition}</p>
      </div>
    );
  if (l.effet === 0)
    return (
      <div className="rounded-xl bg-surface-2 p-3">
        <p className="font-semibold text-encre-2">Pas d'effet mesurable aujourd'hui</p>
        <p className="text-sm text-encre-2">Calculé {l.condition} : le plafond ne bouge pas.</p>
      </div>
    );
  return (
    <div className="rounded-xl bg-bon-doux p-3">
      <p className="montant text-2xl text-bon">+ {fcfa(l.effet)} <span className="text-base font-normal">environ</span></p>
      <p className="text-sm text-encre">{l.condition}</p>
    </div>
  );
}

function Carte({ l, rang }: { l: Levier; rang: number }) {
  return (
    <li className="flex min-w-0 flex-col gap-4 rounded-2xl border border-trait bg-surface p-5 shadow-carte">
      <div className="flex items-start gap-3">
        <span className="titre flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ambre-doux text-ambre-encre">{rang}</span>
        <h3 className="titre min-w-0 pt-0.5 text-xl">{l.titre}</h3>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-encre-3">Où vous en êtes</p>
        <p>{l.constat}</p>
        <p className="text-sm text-encre-2">{l.repere}</p>
        {l.paliers && <div className="pt-2"><Paliers paliers={l.paliers} /></div>}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-encre-3">Pourquoi ça compte</p>
        <p className="text-encre-2">{l.pourquoi}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-encre-3">Quoi faire</p>
        <ul className="space-y-1.5">{l.actions.map((a) => <li key={a} className="border-l-2 border-ambre pl-3">{a}</li>)}</ul>
      </div>
      <div className="mt-auto space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-encre-3">Effet estimé sur le plafond</p>
        <Effet l={l} />
      </div>
    </li>
  );
}

export default function PageConseils() {
  const { id } = useCommercant();
  // Fréquence et durée visibles et modifiables en haut de page : les effets sont calculés pour ce choix.
  const [choix, setChoix] = useState<{ frequence: Frequence; duree: number } | null>(null);
  const { donnees: c, erreur, recharger } = useApi<Conseils>(`/commercants/${id}/conseils?institution_id=inst-lagune${choix ? `&frequence=${choix.frequence}&duree_mois=${choix.duree}` : ""}`);
  if (erreur) return <Erreur message={erreur} reessayer={recharger} />;
  if (!c) return <Chargement lignes={6} label="Calcul des conseils" />;
  const conditions = `${FREQ[c.frequence].chaque} pendant ${duree({ duree_mois: c.duree_mois, duree_semaines: c.duree_semaines })}, aux conditions de ${c.institution}`;
  const mois = c.duree_mois ?? Math.round((c.duree_semaines * 12) / 52);

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="titre text-3xl">Faire monter mon plafond</h1>
        <Simule quoi="Conseils calculés sur flux simulés" />
      </div>

      <fieldset className="grid gap-2 rounded-2xl bg-surface p-4 shadow-carte sm:grid-cols-2" aria-label="Modalités des calculs">
        <label className="block text-sm text-encre-2">Je rembourse
          <select value={c.frequence} onChange={(e) => setChoix({ frequence: e.target.value as Frequence, duree: mois })} className="mt-1 block min-h-12 w-full rounded-xl border border-trait bg-surface-2 px-3 text-base text-encre">
            {c.modalites.frequences.map((f) => <option key={f} value={f}>{FREQ[f].nom}</option>)}
          </select>
        </label>
        <label className="block text-sm text-encre-2">Pendant
          <select value={mois} onChange={(e) => setChoix({ frequence: c.frequence, duree: Number(e.target.value) })} className="mt-1 block min-h-12 w-full rounded-xl border border-trait bg-surface-2 px-3 text-base text-encre">
            {Array.from({ length: c.modalites.duree_max_mois - c.modalites.duree_min_mois + 1 }, (_, k) => c.modalites.duree_min_mois + k).map((m) => <option key={m} value={m}>{m} mois</option>)}
          </select>
        </label>
        <p className="text-xs text-encre-2 sm:col-span-2">Les effets « + X FCFA » ci-dessous sont calculés pour cette fréquence et cette durée.</p>
      </fieldset>

      <div className="flex flex-col gap-3 rounded-2xl border border-ambre/50 bg-ambre-doux p-5 sm:flex-row sm:items-center">
        <TrendingUp aria-hidden="true" size={28} className="shrink-0 text-ambre-encre" />
        <p className="text-[17px] leading-snug text-encre">
          {c.gain_possible && c.meilleur_levier ? (
            <>Votre plafond ({fcfa(c.plafond_actuel)}, {conditions}) peut monter d'environ <strong className="chiffres">{fcfa(c.gain_possible)}</strong> ; le levier le plus efficace : <strong>{c.meilleur_levier.titre.toLowerCase()}</strong>.</>
          ) : c.plafond_actuel ? (
            <>Votre plafond ({fcfa(c.plafond_actuel)}, {conditions}) est déjà au mieux de ce que vos encaissements vérifiés permettent ; les conseils ci-dessous aident à le garder.</>
          ) : (
            <>Pas encore d'encaissement vérifié : connectez votre compte marchand pour obtenir des conseils chiffrés.</>
          )}
        </p>
      </div>

      {c.leviers.length > 0 && (
        <div className="space-y-3">
          <h2 className="titre text-xl">À améliorer, du plus utile au moins utile</h2>
          <ol className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {c.leviers.map((l, k) => <Carte key={l.code} l={l} rang={k + 1} />)}
          </ol>
        </div>
      )}

      {c.deja_bien.length > 0 && (
        <div className="space-y-3 border-t border-trait pt-5">
          <h2 className="titre text-xl">Ce qui va déjà bien</h2>
          <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {c.deja_bien.map((l) => (
              <li key={l.code} className="flex min-w-0 gap-3 rounded-xl border border-trait p-3">
                <CircleCheck aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-bon" />
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">{l.titre} <Pastille ton="bon">bon</Pastille></p>
                  <p className="text-sm text-encre-2">{l.constat}</p>
                  {l.paliers && <div className="pt-1"><Paliers paliers={l.paliers} compact /></div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-sm text-encre-2">
        Seul le chiffre d'affaires vérifié compte : paiements de vrais clients sur votre compte marchand, hors transferts vers vous-même et hors allers-retours.
        Il n'existe aucun moyen de faire monter le plafond autrement qu'en vendant plus, plus régulièrement, sur ce compte. Les effets sont calculés par le même moteur que votre estimation, sur des scénarios ; ils ne s'additionnent pas forcément.
      </p>
      <LienBouton href={`/app/dossier?institution=${c.institution_id}${choix ? `&frequence=${choix.frequence}&duree=${choix.duree}` : ""}`} grand icone={Send} className="w-full sm:w-auto">Envoyer mon dossier</LienBouton>
    </section>
  );
}
