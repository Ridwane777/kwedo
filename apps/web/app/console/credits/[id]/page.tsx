"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Chargement, Erreur, Pastille, Simule } from "@/components/ui";
import { useApi } from "@/lib/api";
import { date, fcfa, FREQ, pct, STATUTS } from "@/lib/format";
import type { Credit } from "@/lib/types";
import { Ariane, Indicateur, StatutCredit } from "../../commun";
import { Reprogrammer } from "../../recouvrement/reprogrammer";

type Detail = Omit<Credit, "echeances"> & {
  statut: string; jours_retard: number;
  commercant: { id: string; nom: string; telephone: string; type_activite: string };
  dossier: { id: string; statut: string; cree_le: string; montant_demande: number | null; objet_texte: string | null } | null;
  echeances: (Credit["echeances"][number] & { jours_retard: number })[];
  interventions: { id: number; echeance_id: number; rang: number; auteur: string; motif: string; horodatage: string; avant: { date_due: string; statut: string }; apres: { date_due: string; statut: string } }[];
};

const ECH: Record<string, { l: string; ton: "bon" | "attention" | "alerte" | "neutre" }> = {
  payee: { l: "Payée", ton: "bon" }, partielle: { l: "Partielle", ton: "attention" }, en_retard: { l: "En retard", ton: "alerte" }, a_venir: { l: "À venir", ton: "neutre" },
};

export default function PageCredit() {
  const { id } = useParams<{ id: string }>();
  const { donnees: c, erreur, recharger } = useApi<Detail>(`/console/credits/${id}`);
  if (erreur) return <Erreur message={erreur} reessayer={recharger} />;
  if (!c) return <Chargement lignes={8} label="Chargement du crédit" />;
  const relances = (eid: number) => c.relances.filter((r) => r.echeance_id === eid).length;

  return (
    <article className="space-y-5">
      <Ariane etapes={[{ label: "Crédits", href: "/console/credits" }, { label: c.commercant.nom, href: `/console/commercants/${c.commercant.id}` }, { label: `Crédit ${c.id}` }]} />
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="titre text-[1.75rem] leading-tight">Crédit de {fcfa(c.montant)}</h1>
          <StatutCredit s={c.statut} />
          <Simule quoi="Paiements simulés" />
        </div>
        <p className="text-encre-2">
          <Link href={`/console/commercants/${c.commercant.id}`} className="font-medium text-marque hover:underline">{c.commercant.nom}</Link>
          {" · "}décaissé le {date(c.decaisse_le)} · {FREQ[c.frequence].chaque}, {c.echeances.length} échéances, taux {pct(c.taux_periode, 2)} par période
          {c.dossier && <> · <Link href={`/console/dossiers/${c.dossier.id}`} className="font-medium text-marque hover:underline">dossier d'origine</Link> ({STATUTS[c.dossier.statut]}, déposé le {date(c.dossier.cree_le)})</>}
        </p>
      </header>
      <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Indicateur l="Restant dû" v={fcfa(c.restant)} />
        <Indicateur l="Remboursé" v={fcfa(c.total_recu)} />
        <Indicateur l="Coût total" v={fcfa(c.cout_total)} />
        <Indicateur l="Retard le plus ancien" v={c.jours_retard ? `${c.jours_retard} jours` : "—"} ton={c.jours_retard ? "text-alerte" : ""} />
      </dl>

      <section aria-labelledby="t-ech">
        <h2 id="t-ech" className="titre mb-2 text-lg">Échéancier</h2>
        <div className="overflow-x-auto rounded-2xl border border-trait bg-surface">
          <table className="w-full min-w-[640px] text-left [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
            <thead className="border-b border-trait bg-surface-2/60 text-xs text-encre-2">
              <tr><th>Rang</th><th>Date</th><th className="text-right">Attendu</th><th className="text-right">Reçu</th><th>Statut</th><th className="text-right">Relances</th><th>Action</th></tr>
            </thead>
            <tbody>
              {c.echeances.map((e) => (
                <tr key={e.id} className="border-b border-trait last:border-b-0">
                  <td className="chiffres">{e.rang}</td>
                  <td className="chiffres">{date(e.date_due)}</td>
                  <td className="chiffres text-right">{fcfa(e.montant_attendu)}</td>
                  <td className="chiffres text-right">{fcfa(e.montant_recu)}</td>
                  <td><Pastille ton={ECH[e.statut]!.ton}>{ECH[e.statut]!.l}{e.jours_retard ? ` · ${e.jours_retard} j` : ""}</Pastille></td>
                  <td className="chiffres text-right">{relances(e.id) || "—"}</td>
                  <td>{e.statut === "en_retard" && <Reprogrammer id={e.id} onFait={recharger} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="t-pai">
          <h2 id="t-pai" className="titre mb-2 text-lg">Paiements</h2>
          {!c.paiements.length ? <p className="text-encre-2">Aucun paiement reçu.</p> : (
            <ul className="divide-y divide-trait rounded-2xl border border-trait bg-surface">
              {c.paiements.map((p) => <li key={p.id} className="flex justify-between gap-3 px-3 py-2"><span className="chiffres text-encre-2">{date(p.horodatage, true)}</span><span className="chiffres">{fcfa(p.montant)}</span></li>)}
            </ul>
          )}
        </section>
        <section aria-labelledby="t-rel">
          <h2 id="t-rel" className="titre mb-2 text-lg">Relances</h2>
          {!c.relances.length ? <p className="text-encre-2">Aucune relance.</p> : (
            <ul className="space-y-2">
              {[...c.relances].reverse().map((r) => (
                <li key={r.id} className="border-l-2 border-marque pl-3">
                  <p className="text-xs text-encre-2">{date(r.horodatage, true)} · {r.canal}</p><p>{r.message}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="t-rep">
          <h2 id="t-rep" className="titre mb-2 text-lg">Reprogrammations</h2>
          {!c.interventions.length ? <p className="text-encre-2">Aucune reprogrammation.</p> : (
            <ul className="space-y-2">
              {c.interventions.map((x) => (
                <li key={x.id} className="rounded-xl border border-trait bg-surface p-3">
                  <p>Échéance {x.rang} : {date(x.avant.date_due)} → <strong>{date(x.apres.date_due)}</strong></p>
                  <p className="italic">« {x.motif} »</p>
                  <p className="text-xs text-encre-2">{x.auteur}, {date(x.horodatage, true)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </article>
  );
}
