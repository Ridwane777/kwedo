"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Bouton, Chargement, Erreur } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { date, fcfa, FREQ, pct, type Frequence } from "@/lib/format";
import { ROLES, useSession } from "@/lib/session";
import type { Institution } from "@/lib/types";

type P = Institution["parametres"];
// Nom en clair + effet concret ; la formule reste dans le moteur et la documentation.
const CHAMPS: { k: keyof P; l: string; aide: string; min: number; max: number; pas: number }[] = [
  { k: "m", l: "Part des ventes qui reste après les coûts", aide: "Plus elle est haute, plus les plafonds montent ; plus de risque si l'activité réelle laisse moins.", min: 0.05, max: 1, pas: 0.01 },
  { k: "s", l: "Part de ce reste consacrée au remboursement", aide: "Plus cette marge est haute, plus les plafonds montent ; plus de risque.", min: 0.05, max: 1, pas: 0.01 },
  { k: "n", l: "Durée par défaut (semaines)", aide: "Plus elle est longue, plus le montant possible monte, mais aussi le coût total et l'engagement.", min: 1, max: 104, pas: 1 },
  { k: "i", l: "Taux d'intérêt par semaine", aide: "Plus il est haut, plus chaque échéance coûte : les plafonds baissent.", min: 0.0001, max: 0.19, pas: 0.0001 },
  { k: "percentile", l: "Prudence sur les mauvaises semaines", aide: "Plus ce chiffre est bas, plus on part d'une semaine sévère : plafonds plus bas, moins de risque (20 = 4 semaines sur 5 au-dessus).", min: 1, max: 50, pas: 1 },
  { k: "seuil_risque", l: "Tolérance au risque", aide: "Part maximale des avenirs simulés avec une échéance manquée. Plus elle est haute, plus de demandes passent ; plus d'impayés possibles.", min: 0.01, max: 0.5, pas: 0.01 },
];

type Avant = { avant: number | null; apres: number | null };
type ApercuR = { nb_dossiers: number; plafond_moyen: Avant; risque_moyen: Avant; au_dessus_tolerance: Avant };

/** Aperçu avant enregistrement : calculé par le moteur via l'API, réservé au responsable de l'institution. */
function Apercu({ inst, f }: { inst: string; f: P }) {
  const [r, setR] = useState<ApercuR | null>(null);
  const [etat, setEtat] = useState<"idle" | "calcul" | "erreur">("idle");
  const [err, setErr] = useState("");
  const cle = CHAMPS.map((c) => f[c.k]).join("|");
  useEffect(() => { setR(null); setEtat("idle"); }, [cle]);
  async function calculer() {
    setEtat("calcul");
    try {
      setR(await api<ApercuR>(`/institutions/${inst}/parametres/apercu`, { body: Object.fromEntries(CHAMPS.map((c) => [c.k, f[c.k]])) }));
      setEtat("idle");
    } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); setEtat("erreur"); }
  }
  const ligne = (l: string, v: Avant, fmt: (x: number) => string) => (
    <tr className="border-t border-trait">
      <th scope="row" className="py-1.5 pr-3 text-left font-normal">{l}</th>
      <td className="chiffres pr-3 text-right">{v.avant == null ? "—" : fmt(v.avant)}</td>
      <td className="chiffres text-right font-semibold">{v.apres == null ? "—" : fmt(v.apres)}</td>
    </tr>
  );
  return (
    <section aria-labelledby="t-apercu" className="space-y-2 rounded-xl border border-trait bg-surface p-3 md:col-span-2" data-testid="apercu-parametres">
      <h2 id="t-apercu" className="font-semibold">Effet sur vos dossiers en attente</h2>
      <Bouton type="button" variante="trait" onClick={() => void calculer()} disabled={etat === "calcul"}>
        {etat === "calcul" ? "Calcul en cours…" : "Calculer l'aperçu"}
      </Bouton>
      {etat === "erreur" && <p role="alert" className="text-alerte">{err}</p>}
      {r && (r.nb_dossiers === 0 ? <p className="text-encre-2">Aucun dossier en attente.</p> : (
        <table className="w-full max-w-lg text-sm" aria-live="polite">
          <thead className="text-encre-2">
            <tr><th className="text-left font-medium">{r.nb_dossiers} dossier(s) en attente</th><th className="pr-3 text-right font-medium">Avant</th><th className="text-right font-medium">Après</th></tr>
          </thead>
          <tbody>
            {ligne("Plafond prudent moyen", r.plafond_moyen, (x) => fcfa(x))}
            {ligne("Risque moyen de la demande", r.risque_moyen, (x) => pct(x, 1))}
            {ligne("Demandes au-dessus de la tolérance", r.au_dessus_tolerance, (x) => String(x))}
          </tbody>
        </table>
      ))}
      <p className="text-xs text-encre-2">Recalculé par le moteur avec la graine de chaque dossier ; rien n'est enregistré.</p>
    </section>
  );
}

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
        <p className="text-encre-2">Chaque modification crée une version, jamais une réécriture. Avant d'enregistrer, l'aperçu montre l'effet sur vos dossiers en attente.</p>
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
        {modifiable && inst && <Apercu inst={inst} f={f} />}
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
            <tr><th className="py-1.5">Version</th><th>Reste après coûts</th><th>Part remboursement</th><th>Durée (sem.)</th><th>Taux / sem.</th><th>Prudence</th><th>Tolérance</th><th>Fréquences</th><th>Durée</th><th>Versement</th><th>Auteur</th><th>Date</th></tr>
          </thead>
          <tbody className="chiffres">
            {hist.donnees.historique.map((h) => (
              <tr key={h.id} className="border-b border-trait"><td className="py-1.5">#{h.id}</td><td>{pct(h.m)}</td><td>{pct(h.s)}</td><td>{h.n}</td><td>{pct(h.i, 2)}</td><td>{h.percentile}</td><td>{pct(h.seuil_risque)}</td><td className="font-sans">{h.frequences.split(",").map((x) => FREQ[x as Frequence]?.periode ?? x).join(", ")}</td><td>{h.duree_min_mois}–{h.duree_max_mois} mois</td><td>{h.delai_versement_h} h</td><td>{h.auteur}</td><td>{date(h.cree_le, true)}</td></tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  );
}
