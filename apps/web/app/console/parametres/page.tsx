"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Bouton, Chargement, Erreur } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { date, FREQ, pct, type Frequence } from "@/lib/format";
import { ROLES, useSession } from "@/lib/session";
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

const FREQS: Frequence[] = ["hebdomadaire", "quinzaine", "mensuelle"];
const MODALITES: { k: "duree_min_mois" | "duree_max_mois" | "delai_versement_h"; l: string; min: number; max: number }[] = [
  { k: "duree_min_mois", l: "Durée minimale (mois)", min: 3, max: 12 },
  { k: "duree_max_mois", l: "Durée maximale (mois)", min: 3, max: 12 },
  { k: "delai_versement_h", l: "Versement annoncé (heures)", min: 1, max: 720 },
];

export default function Parametres() {
  const session = useSession();
  const moi = session?.pro ?? null;
  const inst = moi?.institution_id ?? null;
  const modifiable = moi?.role === "responsable";
  const hist = useApi<{ actifs: P; historique: P[] }>(inst ? `/institutions/${inst}/parametres` : null);
  const [f, setF] = useState<P | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  useEffect(() => { if (hist.donnees) setF(hist.donnees.actifs); }, [hist.donnees]);

  if (hist.erreur) return <Erreur message={hist.erreur} />;
  if (!moi || !hist.donnees || !f) return <Chargement lignes={6} />;

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    try {
      await api(`/institutions/${inst}/parametres`, { body: f });
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
      <p className="rounded-lg bg-surface-2 px-3 py-2">Réglages de <strong>{moi.institution}</strong>, visibles par cette seule institution.{!modifiable && ` Votre rôle (${ROLES[moi.role]}) permet de les lire ; seul le responsable crédit peut les modifier.`}</p>
      <form onSubmit={enregistrer} className="grid max-w-3xl gap-x-6 gap-y-3 md:grid-cols-2">
        {CHAMPS.map((c) => (
          <label key={c.k} className="block">
            <span className="font-medium">{c.l}</span>
            <input type="number" disabled={!modifiable} min={c.min} max={c.max} step={c.pas} value={f[c.k] as number}
              onChange={(e) => setF({ ...f, [c.k]: Number(e.target.value) })}
              className="chiffres mt-1 block w-full rounded-lg border border-trait bg-fond px-2 py-1.5 disabled:bg-surface-2" />
            <span className="text-[11px] text-encre-2">{c.aide}</span>
          </label>
        ))}
        <fieldset className="space-y-3 rounded-xl border border-trait p-3 md:col-span-2">
          <legend className="px-1 font-semibold">Modalités proposées au commerçant</legend>
          <div>
            <span className="font-medium">Fréquences de remboursement acceptées</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {FREQS.map((fr) => {
                const liste = f.frequences.split(",").filter(Boolean);
                const coche = liste.includes(fr);
                return (
                  <label key={fr} className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 ${coche ? "border-marque bg-marque-doux" : "border-trait"}`}>
                    <input type="checkbox" disabled={!modifiable} checked={coche} className="accent-[var(--marque)]"
                      onChange={() => setF({ ...f, frequences: (coche ? liste.filter((x) => x !== fr) : [...liste, fr]).join(",") })} />
                    {FREQ[fr].nom}
                  </label>
                );
              })}
            </div>
            <span className="text-[11px] text-encre-2">Le commerçant ne voit que ces options. Le risque n'a été évalué que pour l'hebdomadaire (ADR 0015).</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {MODALITES.map((c) => (
              <label key={c.k} className="block">
                <span className="font-medium">{c.l}</span>
                <input type="number" disabled={!modifiable} min={c.min} max={c.max} step={1} value={f[c.k]}
                  onChange={(e) => setF({ ...f, [c.k]: Number(e.target.value) })}
                  className="chiffres mt-1 block w-full rounded-lg border border-trait bg-fond px-2 py-1.5 disabled:bg-surface-2" />
              </label>
            ))}
          </div>
        </fieldset>
        <div className="md:col-span-2">
          {msg &&<p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-bon" : "text-alerte"}>{msg.t}</p>}
          {modifiable && <Bouton type="submit" icone={Save} className="mt-2">Enregistrer une nouvelle version</Bouton>}
        </div>
      </form>
      <div>
        <h2 className="titre mb-1 text-lg">Historique</h2>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] max-w-5xl text-left [&_td]:pr-3 [&_th]:whitespace-nowrap [&_th]:pr-3">
          <thead className="border-b border-trait bg-surface-2/60 text-xs font-semibold text-encre-2 [&_th]:px-3 [&_th]:font-semibold">
            <tr><th className="py-1.5">Version</th><th>m</th><th>s</th><th>n</th><th>i</th><th>Percentile</th><th>Seuil</th><th>Fréquences</th><th>Durée</th><th>Versement</th><th>Auteur</th><th>Date</th></tr>
          </thead>
          <tbody className="chiffres">
            {hist.donnees.historique.map((h) => (
              <tr key={h.id} className="border-b border-trait"><td className="py-1.5">#{h.id}</td><td>{h.m}</td><td>{h.s}</td><td>{h.n}</td><td>{pct(h.i, 2)}</td><td>p{h.percentile}</td><td>{pct(h.seuil_risque)}</td><td className="font-sans">{h.frequences.split(",").map((x) => FREQ[x as Frequence]?.periode ?? x).join(", ")}</td><td>{h.duree_min_mois}–{h.duree_max_mois} mois</td><td>{h.delai_versement_h} h</td><td>{h.auteur}</td><td>{date(h.cree_le, true)}</td></tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  );
}
