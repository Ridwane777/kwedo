"use client";

import { Calculator, ChevronUp, Info } from "lucide-react";
import { useState } from "react";
import { Bouton } from "@/components/ui";
import { useApi } from "@/lib/api";
import type { Analyse, Estimation, InstitutionPublique } from "@/lib/types";
import { DEFINITION_PLAFOND, duree, fcfa, FREQ, pct, phrasePlafond, type Frequence } from "@/lib/format";

export function ChoixInstitution({ institutions, valeur, onChange }: { institutions: InstitutionPublique[]; valeur: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm text-encre-2">
      Selon les règles de
      <select value={valeur} onChange={(e) => onChange(e.target.value)}
        className="mt-1 block min-h-12 w-full rounded-xl border border-trait bg-surface-2 px-3 text-base text-encre">
        {institutions.map((i) => <option key={i.id} value={i.id}>{i.nom}</option>)}
      </select>
    </label>
  );
}

/** Niveau prudent ramené à la semaine, pour la courbe hebdomadaire (hors hebdomadaire, le niveau prudent est par période). */
export const prudentHebdo = (a: Pick<Estimation, "encaissement_prudent" | "frequence">) =>
  a.encaissement_prudent / ({ hebdomadaire: 1, quinzaine: 2, mensuelle: 52 / 12 } as const)[a.frequence];

/** Durée affichée dans le sélecteur : celle choisie, sinon la durée de l'institution ramenée en mois. */
export const moisDe = (a: Pick<Estimation, "parametres" | "duree_semaines">) =>
  a.parametres.duree_mois ?? Math.round((a.duree_semaines * 12) / 52);

/** Fréquence et durée de remboursement, limitées aux options de l'institution choisie (ADR 0015). */
export function ChoixModalites({ a, onChange, desactive }: {
  a: Estimation; onChange: (frequence: Frequence, dureeMois: number) => void; desactive?: boolean;
}) {
  const m = a.modalites;
  const mois = Math.min(m.duree_max_mois, Math.max(m.duree_min_mois, moisDe(a)));
  const durees = Array.from({ length: m.duree_max_mois - m.duree_min_mois + 1 }, (_, k) => m.duree_min_mois + k);
  return (
    <fieldset className="space-y-3" disabled={desactive}>
      <legend className="sr-only">Comment rembourser</legend>
      <div>
        <p className="text-sm text-encre-2" id="lib-frequence">Je rembourse</p>
        {m.frequences.length === 1 ? (
          <p className="mt-1 font-medium">{FREQ[m.frequences[0] ?? a.frequence].nom} <span className="text-sm font-normal text-encre-2">(seule option de cette institution)</span></p>
        ) : (
          <div role="radiogroup" aria-labelledby="lib-frequence" className="mt-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${m.frequences.length}, minmax(0, 1fr))` }}>
            {m.frequences.map((f) => (
              <label key={f} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-2 text-center text-sm leading-tight ${a.frequence === f ? "border-marque bg-marque-doux font-semibold text-marque" : "border-trait bg-surface-2"}`}>
                <input type="radio" name="frequence" className="sr-only" checked={a.frequence === f} onChange={() => onChange(f, mois)} />{FREQ[f].nom}
              </label>
            ))}
          </div>
        )}
      </div>
      <label className="block text-sm text-encre-2">
        Pendant
        <select value={mois} onChange={(e) => onChange(a.frequence, Number(e.target.value))}
          className="mt-1 block min-h-12 w-full rounded-xl border border-trait bg-surface-2 px-3 text-base text-encre">
          {durees.map((d) => <option key={d} value={d}>{d} mois</option>)}
        </select>
      </label>
    </fieldset>
  );
}

/** Définition du plafond : au toucher (bouton) comme au survol (title). */
export function DefinitionPlafond() {
  const [ouvert, setOuvert] = useState(false);
  return (
    <span className="inline">
      <button type="button" title={DEFINITION_PLAFOND} aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)}
        className="ml-1 inline-flex min-h-8 items-center gap-1 align-middle text-sm text-marque underline-offset-4 hover:underline">
        <Info aria-hidden="true" size={16} /> C'est quoi, le plafond ?
      </button>
      {ouvert && <span role="note" className="mt-1 block rounded-xl bg-fond p-3 text-sm text-encre-2" data-testid="definition-plafond">{DEFINITION_PLAFOND}</span>}
    </span>
  );
}

/** Plafond avec ses conditions (fréquence, durée, institution) et sa définition. */
export function PlafondConditions({ montant, frequence, duree: t, institution, className = "" }: {
  montant: number; frequence: Frequence; duree: { duree_mois?: number | null; duree_semaines?: number | null }; institution?: string | null; className?: string;
}) {
  return (
    <p className={`text-[15px] ${className}`} data-testid="plafond-conditions">
      {phrasePlafond(montant, frequence, t, institution)}. <DefinitionPlafond />
    </p>
  );
}

type LignesPlafonds = { institution: string; frequence: Frequence; lignes: { duree_mois: number; plafond: number; echeance: number; nb_echeances: number; cout_total: number }[] };

/** Plafond selon la durée, dans les modalités de l'institution, pour une fréquence. */
export function PlafondSelonDuree({ cid, inst, frequence }: { cid: string; inst: string; frequence?: Frequence }) {
  const { donnees: p, erreur } = useApi<LignesPlafonds>(`/commercants/${cid}/plafonds?institution_id=${inst}${frequence ? `&frequence=${frequence}` : ""}`);
  if (erreur) return <p className="text-sm text-alerte">{erreur}</p>;
  if (!p) return <div className="chargement h-24" />;
  return (
    <div className="space-y-2" id="selon-duree" data-testid="plafond-selon-duree">
      <h3 className="font-semibold">Plafond selon la durée ({FREQ[p.frequence].chaque}, aux conditions de {p.institution})</h3>
      <div className="overflow-x-auto">
      <table className="w-full min-w-0 text-left text-xs sm:text-sm">
        <thead className="text-encre-2"><tr><th className="py-1 font-medium">Durée</th><th className="py-1 text-right font-medium">Plafond</th><th className="py-1 text-right font-medium">{FREQ[p.frequence].echeance}</th><th className="py-1 text-right font-medium">Coût total</th></tr></thead>
        <tbody className="chiffres">
          {p.lignes.map((l) => (
            <tr key={l.duree_mois} className="border-t border-trait">
              <td className="py-1.5">{l.duree_mois} mois</td><td className="py-1.5 text-right font-semibold">{fcfa(l.plafond)}</td>
              <td className="py-1.5 text-right">{fcfa(l.echeance)}</td><td className="py-1.5 text-right">{fcfa(l.cout_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <p className="text-xs text-encre-2">Allonger la durée augmente le montant possible, mais aussi le coût total et la durée d'engagement ; l'institution peut refuser une durée longue.</p>
    </div>
  );
}

/** Mention discrète si la fréquence choisie n'a pas passé le run final d'évaluation (ADR 0016). */
export function MentionPrudente({ a }: { a: Pick<Estimation, "estimation_eprouvee"> }) {
  if (a.estimation_eprouvee) return null;
  return <p className="text-xs text-encre-2">Estimation prudente, moins éprouvée que le remboursement hebdomadaire.</p>;
}

/** Choix courant envoyé à l'API (rien tant que le commerçant garde le choix par défaut). */
export function requeteModalites(choix: { frequence: Frequence; duree: number } | null): string {
  return choix ? `&frequence=${choix.frequence}&duree_mois=${choix.duree}` : "";
}

export function Raisons({ raisons }: { raisons: Analyse["raisons"] }) {
  return (
    <ol className="divide-y divide-trait border-y border-trait">
      {raisons.map((r, k) => (
        <li key={r.code} className="flex gap-3 py-3.5">
          <span className="titre mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-marque-doux text-sm text-marque">{k + 1}</span>
          <div className="text-[15px] leading-snug">
            <p>{r.texte}</p>
            {r.effet !== 0 && (
              <p className="mt-1 text-xs text-encre-2">
                {r.effet > 0 ? `Sans ce facteur, le plafond serait plus haut de ${fcfa(r.effet)}.` : `Ce facteur ajoute ${fcfa(-r.effet)} au plafond.`}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Méthode en trois phrases, sans symbole ni variable : la formule reste dans le moteur et la documentation. */
export function CommentCalcule({ a }: { a: Estimation }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="text-sm">
      <Bouton variante="trait" icone={ouvert ? ChevronUp : Calculator} aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)}>
        Comment ce montant est calculé
      </Bouton>
      {ouvert && (
        <div className="apparait mt-2 space-y-1.5 border-l-2 border-ambre pl-3 text-encre-2" data-testid="comment-calcule">
          <p>On part d'une mauvaise {FREQ[a.frequence].periode} de vos ventes, pas de la moyenne, et on garde une marge de sécurité pour vos autres dépenses.</p>
          <p>On teste ensuite 2 000 scénarios de vos ventes à venir : le montant retenu est le plus haut que vous rembourseriez dans presque tous ces scénarios.</p>
          <p>C'est une estimation : l'institution décide ensuite d'accorder, d'ajuster ou de refuser.</p>
          <p className="text-xs">{a.nb_echeances} échéances ({FREQ[a.frequence].chaque}) sur {duree({ duree_mois: a.parametres.duree_mois, duree_semaines: a.duree_semaines })} · coût total {fcfa(a.cout_total)}</p>
        </div>
      )}
    </div>
  );
}
