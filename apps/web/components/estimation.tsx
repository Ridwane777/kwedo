"use client";

import { Calculator, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Bouton } from "@/components/ui";
import type { Analyse, Estimation, InstitutionPublique } from "@/lib/types";
import { duree, fcfa, FREQ, pct, type Frequence } from "@/lib/format";

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

/** Niveau prudent ramené à la semaine, pour la courbe hebdomadaire (hors hebdomadaire, C_p est par période). */
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
          <p className="mt-1 font-medium">{FREQ[m.frequences[0] ?? a.frequence].nom} <span className="text-sm font-normal text-encre-2">(seule formule de cette institution)</span></p>
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

/** Mention discrète hors hebdomadaire : le risque n'a été évalué que sur des échéances hebdomadaires. */
export function MentionPrudente({ a }: { a: Pick<Estimation, "estimation_eprouvee"> }) {
  if (a.estimation_eprouvee) return null;
  return <p className="text-xs text-encre-2">Estimation prudente, moins éprouvée que le remboursement hebdomadaire.</p>;
}

/** Choix courant envoyé à l'API (rien tant que le commerçant garde la formule par défaut). */
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

export function ChaineCalcul({ a }: { a: Estimation }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="text-sm">
      <Bouton variante="trait" icone={ouvert ? ChevronUp : Calculator} aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)}>
        {ouvert ? "Masquer le calcul" : "Voir le calcul"}
      </Bouton>
      {ouvert && (
        <ol className="apparait mt-2 space-y-1.5 border-l-2 border-ambre pl-3 text-encre-2">
          {a.chaine_calcul.map((l) => <li key={l}>{l}</li>)}
          <li className="text-xs">Moteur {a.version_moteur} · {a.nb_echeances} échéances ({FREQ[a.frequence].chaque}) sur {duree({ duree_mois: a.parametres.duree_mois, duree_semaines: a.duree_semaines })} · taux {pct(a.taux_periode, 2)} par {FREQ[a.frequence].periode}</li>
        </ol>
      )}
    </div>
  );
}
