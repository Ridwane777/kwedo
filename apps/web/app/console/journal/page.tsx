"use client";

import { useState } from "react";
import { Chargement, Erreur, Pastille, Vide } from "@/components/ui";
import { useApi } from "@/lib/api";
import { date } from "@/lib/format";

type Evenement = { type: string; horodatage: string; acteur: string; dossier_id: string | null; detail: string };
const TYPES: Record<string, { l: string; ton: "info" | "bon" | "attention" | "alerte" | "neutre" }> = {
  decision: { l: "Décision", ton: "bon" }, acces: { l: "Accès", ton: "neutre" }, intervention: { l: "Intervention", ton: "attention" },
  parametres: { l: "Paramètres", ton: "info" }, consentement: { l: "Consentement", ton: "info" },
};

export default function Journal() {
  const { donnees, erreur, recharger } = useApi<Evenement[]>("/journal?limite=500");
  const [filtre, setFiltre] = useState<string | null>(null);
  if (erreur) return <Erreur message={erreur} reessayer={recharger} />;
  if (!donnees) return <Chargement lignes={8} />;
  const lignes = donnees.filter((e) => !filtre || e.type === filtre);
  return (
    <section className="space-y-4">
      <header>
        <h1 className="titre text-2xl">Journal d'audit</h1>
        <p className="text-encre-2">En ajout seul : la base refuse toute modification ou suppression (déclencheurs SQLite). Chaque décision garde la version du moteur, la graine et les paramètres, et se rejoue à l'identique.</p>
      </header>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par type">
        <button onClick={() => setFiltre(null)} aria-pressed={!filtre} className={`rounded-lg border px-3 py-1 ${!filtre ? "border-indigo bg-indigo-doux text-indigo" : "border-trait"}`}>Tout ({donnees.length})</button>
        {Object.entries(TYPES).map(([k, v]) => (
          <button key={k} onClick={() => setFiltre(k)} aria-pressed={filtre === k} className={`rounded-lg border px-3 py-1 ${filtre === k ? "border-indigo bg-indigo-doux text-indigo" : "border-trait"}`}>
            {v.l} ({donnees.filter((e) => e.type === k).length})
          </button>
        ))}
      </div>
      {!lignes.length ? <Vide titre="Aucun événement" /> : (
        <table className="w-full text-left">
          <thead className="border-b-2 border-encre text-xs uppercase tracking-wide text-encre-2">
            <tr><th className="w-36 py-1.5">Date</th><th className="w-28">Type</th><th className="w-40">Acteur</th><th className="w-28">Dossier</th><th>Détail</th></tr>
          </thead>
          <tbody>
            {lignes.map((e, k) => (
              <tr key={k} className="border-b border-trait align-top">
                <td className="chiffres py-1.5 text-encre-2">{date(e.horodatage, true)}</td>
                <td><Pastille ton={TYPES[e.type]?.ton}>{TYPES[e.type]?.l ?? e.type}</Pastille></td>
                <td>{e.acteur}</td>
                <td>{e.dossier_id ? <a className="text-indigo hover:underline" href={`/console/dossiers/${e.dossier_id}`}>{e.dossier_id}</a> : "—"}</td>
                <td>{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
