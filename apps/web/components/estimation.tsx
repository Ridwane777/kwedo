"use client";

import { useState } from "react";
import type { Analyse, Institution } from "@/lib/types";
import { fcfa, pct } from "@/lib/format";

export function ChoixInstitution({ institutions, valeur, onChange }: { institutions: Institution[]; valeur: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm text-encre-2">
      Selon les règles de
      <select value={valeur} onChange={(e) => onChange(e.target.value)}
        className="mt-1 block min-h-12 w-full rounded-xl border border-trait bg-papier-2 px-3 text-base text-encre">
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
          <span className="titre mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-doux text-sm text-indigo">{k + 1}</span>
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

export function ChaineCalcul({ a }: { a: Analyse }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="text-sm">
      <button onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert} className="min-h-11 font-medium text-indigo underline-offset-4 hover:underline">
        {ouvert ? "Masquer le calcul" : "Voir le calcul complet"}
      </button>
      {ouvert && (
        <ol className="apparait mt-2 space-y-1.5 border-l-2 border-safran pl-3 text-encre-2">
          {a.chaine_calcul.map((l) => <li key={l}>{l}</li>)}
          <li className="text-xs">Moteur {a.version_moteur} · graine {a.graine} · risque simulé au plafond {pct(a.risque, 1)}</li>
        </ol>
      )}
    </div>
  );
}
