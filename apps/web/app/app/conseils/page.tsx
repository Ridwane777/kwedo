"use client";

import { Send } from "lucide-react";
import { Chargement, Erreur, LienBouton, Simule } from "@/components/ui";
import { useApi } from "@/lib/api";
import { useCommercant } from "@/lib/commercant";
import { fcfa, pct } from "@/lib/format";
import type { Estimation } from "@/lib/types";

const PALIERS = [13, 26, 52];

export default function Conseils() {
  const { id } = useCommercant();
  const { donnees: a, erreur, recharger } = useApi<Estimation>(`/commercants/${id}/estimation`);
  if (erreur) return <Erreur message={erreur} reessayer={recharger} />;
  if (!a) return <Chargement lignes={6} />;
  const W = a.indicateurs.semaines;
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="titre text-3xl">Faire monter mon plafond</h1>
        <Simule quoi="Conseils calculés sur flux simulés" />
      </div>

      <ol className="space-y-4">
        {a.conseils.map((c, k) => (
          <li key={c} className="flex gap-3">
            <span className="titre flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ambre-doux text-ambre-encre">{k + 1}</span>
            <p className="pt-1 text-[16px] leading-snug">{c}</p>
          </li>
        ))}
      </ol>

      <div className="space-y-3 border-t border-trait pt-5">
        <h2 className="titre text-xl">Les seuils, annoncés à l'avance</h2>
        <p className="text-sm text-encre-2">Seul le chiffre d'affaires vérifié compte : paiements de clients sur votre compte marchand, hors transferts vers vous-même et hors allers-retours.</p>
        <ol className="flex gap-2" aria-label="Paliers d'historique vérifié">
          {PALIERS.map((p) => (
            <li key={p} className={`flex-1 rounded-xl border p-3 text-center ${W >= p ? "border-bon bg-bon-doux" : "border-trait"}`}>
              <p className="montant text-2xl">{{ 13: "3", 26: "6", 52: "12" }[p]} mois</p>
              <p className="text-xs text-encre-2">{W >= p ? "atteint" : `encore ${p - W} sem.`}</p>
            </li>
          ))}
        </ol>
        <dl className="grid grid-cols-2 gap-y-3 pt-2 text-sm">
          <dt className="text-encre-2">Semaines vérifiées</dt><dd className="chiffres text-right">{W}</dd>
          <dt className="text-encre-2">Régularité (écart relatif)</dt><dd className="chiffres text-right">{pct(a.indicateurs.regularite_cv)}</dd>
          <dt className="text-encre-2">Part des flux professionnels</dt><dd className="chiffres text-right">{pct(a.indicateurs.part_flux_pro)}</dd>
          <dt className="text-encre-2">Exclu : transferts vers vous-même</dt><dd className="chiffres text-right">{fcfa(a.indicateurs.exclu_transferts_soi)}</dd>
        </dl>
      </div>
      <LienBouton href="/app/dossier" grand icone={Send} className="w-full">Envoyer mon dossier</LienBouton>
    </section>
  );
}
