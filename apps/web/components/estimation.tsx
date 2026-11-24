"use client";

import { Calculator, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Bouton } from "@/components/ui";
import type { Analyse, Estimation, InstitutionPublique } from "@/lib/types";
import { fcfa, pct } from "@/lib/format";

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
          <li className="text-xs">Moteur {a.version_moteur} · durée {a.duree_semaines} semaines · taux {pct(a.parametres.i, 2)} par semaine</li>
        </ol>
      )}
    </div>
  );
}
