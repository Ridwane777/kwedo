"use client";

import { useState } from "react";
import { Bouton, Chargement, Erreur, Simule, Vide } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { date, fcfa, pct } from "@/lib/format";

type Portefeuille = {
  maintenant: string; encours: number; par30: number; taux_recouvrement: number | null; part_en_retard: number;
  credits: { credit_id: string; commercant: string; montant: number; restant: number; payees: number; en_retard: number; partielles: number; jours_retard: number; echeances: number; relances: number }[];
  relances: { id: number; nom: string; rang: number; canal: string; message: string; horodatage: string }[];
  retards: { id: number; nom: string; rang: number; date_due: string; montant_attendu: number; montant_recu: number }[];
};

function Indicateur({ l, v, ton }: { l: string; v: string; ton?: string }) {
  return (
    <div className="border-l-2 border-trait pl-3">
      <dt className="text-xs uppercase tracking-wide text-encre-2">{l}</dt>
      <dd className={`montant text-2xl ${ton ?? ""}`}>{v}</dd>
    </div>
  );
}

function Reprogrammer({ e, onFait }: { e: Portefeuille["retards"][number]; onFait: () => Promise<void> }) {
  const [ouvert, setOuvert] = useState(false);
  const [nd, setNd] = useState("");
  const [motif, setMotif] = useState("");
  const [err, setErr] = useState<string | null>(null);
  if (!ouvert) return <button className="text-indigo hover:underline" onClick={() => setOuvert(true)}>Reprogrammer</button>;
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={async (ev) => {
      ev.preventDefault(); setErr(null);
      try { await api(`/echeances/${e.id}/interventions`, { body: { nouvelle_date: nd, motif } }); setOuvert(false); await onFait(); }
      catch (x) { setErr(x instanceof Error ? x.message : "Erreur"); }
    }}>
      <input type="date" required value={nd} onChange={(x) => setNd(x.target.value)} className="rounded border border-trait bg-papier px-1.5 py-1" aria-label="Nouvelle date" />
      <input required minLength={10} value={motif} onChange={(x) => setMotif(x.target.value)} placeholder="Motif (tracé)" className="w-56 rounded border border-trait bg-papier px-1.5 py-1" aria-label="Motif" />
      <Bouton type="submit">Enregistrer</Bouton>
      {err && <span role="alert" className="text-terre">{err}</span>}
    </form>
  );
}

export default function PagePortefeuille() {
  const { donnees: p, erreur, recharger } = useApi<Portefeuille>("/portefeuille");
  if (erreur) return <Erreur message={erreur} reessayer={recharger} />;
  if (!p) return <Chargement lignes={6} />;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titre text-2xl">Portefeuille</h1>
          <p className="text-encre-2">Date simulée : {date(p.maintenant, true)}</p>
        </div>
        <Simule quoi="Horloge et paiements simulés" />
      </header>
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Indicateur l="Encours" v={fcfa(p.encours)} />
        <Indicateur l="Part en retard" v={pct(p.part_en_retard, 1)} ton={p.part_en_retard > 0 ? "text-terre" : ""} />
        <Indicateur l="PAR 30 jours" v={pct(p.par30, 1)} />
        <Indicateur l="Taux de recouvrement" v={p.taux_recouvrement === null ? "—" : pct(p.taux_recouvrement, 1)} />
      </dl>

      {!p.credits.length ? <Vide titre="Aucun crédit décaissé">Les crédits apparaissent ici dès qu'un commerçant accepte une offre.</Vide> : (
        <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left [&_th]:whitespace-nowrap [&_th]:pr-3 [&_td]:pr-3">
          <thead className="border-b-2 border-encre text-xs uppercase tracking-wide text-encre-2">
            <tr><th className="py-2">Commerçant</th><th className="text-right">Montant</th><th className="text-right">Restant dû</th><th className="text-right">Payées</th><th className="text-right">Partielles</th><th className="text-right">En retard</th><th className="text-right">Jours de retard</th><th className="text-right">Relances</th></tr>
          </thead>
          <tbody>
            {p.credits.map((c) => (
              <tr key={c.credit_id} className="border-b border-trait">
                <td className="py-2 font-medium">{c.commercant}</td>
                <td className="chiffres text-right">{fcfa(c.montant)}</td>
                <td className="chiffres text-right">{fcfa(c.restant)}</td>
                <td className="chiffres text-right">{c.payees}/{c.echeances}</td>
                <td className="chiffres text-right">{c.partielles}</td>
                <td className={`chiffres text-right ${c.en_retard ? "font-medium text-terre" : ""}`}>{c.en_retard}</td>
                <td className="chiffres text-right">{c.jours_retard}</td>
                <td className="chiffres text-right">{c.relances}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="titre mb-2 text-lg">Échéances en retard</h2>
          {!p.retards.length ? <p className="text-encre-2">Aucune.</p> : (
            <ul className="divide-y divide-trait">
              {p.retards.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>{e.nom} · échéance {e.rang} du {date(e.date_due)} · reste {fcfa(e.montant_attendu - e.montant_recu)}</span>
                  <Reprogrammer e={e} onFait={recharger} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="titre mb-1 text-lg">Relances envoyées</h2>
          <p className="mb-2 text-xs text-encre-2">Règles de l'institution : rappel 2 jours avant, puis J+1, J+3, J+7 ; 3 messages maximum par échéance ; 8 h-20 h ; canal choisi par le commerçant ; jamais l'entourage. <Simule quoi="rien n'est envoyé" /></p>
          {!p.relances.length ? <p className="text-encre-2">Aucune relance pour l'instant.</p> : (
            <ul className="space-y-2">
              {p.relances.map((r) => (
                <li key={r.id} className="border-l-2 border-indigo pl-3">
                  <p className="text-xs text-encre-2">{date(r.horodatage, true)} · {r.nom} · échéance {r.rang} · {r.canal}</p>
                  <p>{r.message}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
