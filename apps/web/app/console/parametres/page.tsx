"use client";

import { useEffect, useState } from "react";
import { Bouton, Chargement, Erreur } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { date, pct } from "@/lib/format";
import type { Institution } from "@/lib/types";

type P = Institution["parametres"];
const CHAMPS: { k: keyof P; l: string; aide: string; min: number; max: number; pas: number }[] = [
  { k: "m", l: "m · part qui reste après coûts", aide: "Marge de l'activité, invisible dans les flux. Dépend du type de commerce.", min: 0.05, max: 1, pas: 0.01 },
  { k: "s", l: "s · part prélevable de cette marge", aide: "Ce qu'on accepte de prélever pour rembourser.", min: 0.05, max: 1, pas: 0.01 },
  { k: "n", l: "n · durée (semaines)", aide: "Nombre d'échéances hebdomadaires.", min: 1, max: 104, pas: 1 },
  { k: "i", l: "i · taux par semaine", aide: "Taux de l'institution par période.", min: 0.0001, max: 0.19, pas: 0.0001 },
  { k: "percentile", l: "Percentile prudent", aide: "Niveau bas des encaissements retenu (p20 = 4 semaines sur 5 au-dessus).", min: 1, max: 50, pas: 1 },
  { k: "seuil_risque", l: "Seuil de risque", aide: "Part maximale des avenirs simulés avec une échéance manquée.", min: 0.01, max: 0.5, pas: 0.01 },
];

export default function Parametres() {
  const [inst, setInst] = useState("inst-lagune");
  const insts = useApi<Institution[]>("/institutions");
  const hist = useApi<{ actifs: P; historique: P[] }>(`/institutions/${inst}/parametres`);
  const [f, setF] = useState<P | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  useEffect(() => { if (hist.donnees) setF(hist.donnees.actifs); }, [hist.donnees]);

  if (insts.erreur || hist.erreur) return <Erreur message={(insts.erreur ?? hist.erreur)!} />;
  if (!insts.donnees || !hist.donnees || !f) return <Chargement lignes={6} />;

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    try {
      await api(`/institutions/${inst}/parametres`, { body: { ...f, auteur: "responsable.demo" } });
      setMsg({ ok: true, t: "Nouvelle version enregistrée. Elle s'applique aux prochains dossiers ; les décisions passées gardent leurs paramètres." });
      await hist.recharger();
    } catch (er) { setMsg({ ok: false, t: er instanceof Error ? er.message : "Erreur" }); }
  }

  return (
    <section className="space-y-5">
      <header>
        <h1 className="titre text-2xl">Paramètres du moteur</h1>
        <p className="text-encre-2">Formule : R = C<sub>p</sub> × m × s · L<sub>max</sub> = R × (1 − (1 + i)<sup>−n</sup>) / i. Chaque modification crée une version, jamais une réécriture.</p>
      </header>
      <label className="block w-80">Institution
        <select value={inst} onChange={(e) => setInst(e.target.value)} className="mt-1 block w-full rounded-lg border border-trait bg-papier-2 px-2 py-1.5">
          {insts.donnees.map((i) => <option key={i.id} value={i.id}>{i.nom}</option>)}
        </select>
      </label>
      <form onSubmit={enregistrer} className="grid max-w-3xl gap-x-6 gap-y-3 md:grid-cols-2">
        {CHAMPS.map((c) => (
          <label key={c.k} className="block">
            <span className="font-medium">{c.l}</span>
            <input type="number" min={c.min} max={c.max} step={c.pas} value={f[c.k] as number}
              onChange={(e) => setF({ ...f, [c.k]: Number(e.target.value) })}
              className="chiffres mt-1 block w-full rounded-lg border border-trait bg-papier px-2 py-1.5" />
            <span className="text-[11px] text-encre-2">{c.aide}</span>
          </label>
        ))}
        <div className="md:col-span-2">
          {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-feuille" : "text-terre"}>{msg.t}</p>}
          <Bouton type="submit" className="mt-2">Enregistrer une nouvelle version</Bouton>
        </div>
      </form>
      <div>
        <h2 className="titre mb-1 text-lg">Historique</h2>
        <table className="w-full max-w-4xl text-left">
          <thead className="border-b-2 border-encre text-xs uppercase tracking-wide text-encre-2">
            <tr><th className="py-1.5">Version</th><th>m</th><th>s</th><th>n</th><th>i</th><th>Percentile</th><th>Seuil</th><th>Auteur</th><th>Date</th></tr>
          </thead>
          <tbody className="chiffres">
            {hist.donnees.historique.map((h) => (
              <tr key={h.id} className="border-b border-trait"><td className="py-1.5">#{h.id}</td><td>{h.m}</td><td>{h.s}</td><td>{h.n}</td><td>{pct(h.i, 2)}</td><td>p{h.percentile}</td><td>{pct(h.seuil_risque)}</td><td>{h.auteur}</td><td>{date(h.cree_le, true)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
