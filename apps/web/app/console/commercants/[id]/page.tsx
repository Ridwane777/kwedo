"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Chargement, Erreur, Pastille, Simule } from "@/components/ui";
import { useApi } from "@/lib/api";
import { ACTIVITES, date, fcfa, pct, STATUTS } from "@/lib/format";
import { Ariane, DECISIONS, Indicateur, StatutCredit, TON_STATUT } from "../../commun";
import type { LigneCredit } from "../../credits/page";
import type { LigneDemande } from "../../demandes/page";

type Fiche = {
  commercant: { id: string; nom: string; telephone: string; type_activite: string; compte_separe: boolean; compte_marchand_ouvert_le: string | null; canal: string };
  consentement_actif: boolean;
  demandes: LigneDemande[]; credits: LigneCredit[];
  retards: { id: number; rang: number; date_due: string; montant_attendu: number; montant_recu: number; credit_id: string; jours_retard: number }[];
  flux: { encaisse_4_semaines: number; encaisse_12_semaines: number; moyenne_hebdo_12_semaines: number; derniere_transaction: string | null } | null;
  resume: { demandes: number; credits: number; encours: number; retards: number };
};

export default function PageCommercant() {
  const { id } = useParams<{ id: string }>();
  const { donnees: f, erreur, recharger } = useApi<Fiche>(`/console/commercants/${id}`);
  if (erreur) return <Erreur message={erreur} reessayer={recharger} />;
  if (!f) return <Chargement lignes={8} label="Chargement du commerçant" />;
  const m = f.commercant;
  return (
    <article className="space-y-5">
      <Ariane etapes={[{ label: "Commerçants", href: "/console/commercants" }, { label: m.nom }]} />
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="titre text-[1.75rem] leading-tight">{m.nom}</h1>
          {!f.consentement_actif && <Pastille ton="alerte">Accord retiré : flux non consultables</Pastille>}
        </div>
        <p className="text-encre-2">{ACTIVITES[m.type_activite]} · compte marchand {m.compte_separe ? "séparé" : "non séparé"} depuis le {date(m.compte_marchand_ouvert_le)} · relances par {m.canal}</p>
        <p className="text-xs text-encre-2">Historique chez votre institution seulement : rien n'apparaît des autres institutions.</p>
      </header>

      <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Indicateur l="Demandes" v={String(f.resume.demandes)} />
        <Indicateur l="Crédits" v={String(f.resume.credits)} />
        <Indicateur l="Encours" v={fcfa(f.resume.encours)} />
        <Indicateur l="Échéances en retard" v={String(f.resume.retards)} ton={f.resume.retards ? "text-alerte" : ""} />
      </dl>

      {f.flux && (
        <section aria-labelledby="t-flux" className="rounded-2xl border border-trait bg-surface p-4">
          <h2 id="t-flux" className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold">Flux récents <Simule quoi="flux simulés" /></h2>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div><dt className="text-xs text-encre-2">Encaissé sur 4 semaines</dt><dd className="chiffres font-semibold">{fcfa(f.flux.encaisse_4_semaines)}</dd></div>
            <div><dt className="text-xs text-encre-2">Encaissé sur 12 semaines</dt><dd className="chiffres font-semibold">{fcfa(f.flux.encaisse_12_semaines)}</dd></div>
            <div><dt className="text-xs text-encre-2">Moyenne par semaine (12 sem.)</dt><dd className="chiffres font-semibold">{fcfa(f.flux.moyenne_hebdo_12_semaines)}</dd></div>
          </dl>
          <p className="mt-2 text-xs text-encre-2">Dernière transaction : {date(f.flux.derniere_transaction, true)}</p>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="t-dem">
          <h2 id="t-dem" className="titre mb-2 text-lg">Demandes</h2>
          <ul className="divide-y divide-trait rounded-2xl border border-trait bg-surface">
            {f.demandes.map((d) => (
              <li key={d.id}>
                <Link href={`/console/dossiers/${d.id}`} className="block space-y-1 px-4 py-3 hover:bg-surface-2">
                  <span className="flex items-baseline justify-between gap-3"><span className="chiffres font-semibold">{fcfa(d.montant_demande)}</span><Pastille ton={TON_STATUT[d.statut]}>{STATUTS[d.statut]}</Pastille></span>
                  <span className="block text-sm text-encre-2">Déposée le {date(d.cree_le)} · risque {pct(d.risque_demande, 1)}{d.decision && ` · ${DECISIONS[d.decision]} le ${date(d.decide_le)}`}{d.montant_decide ? ` (${fcfa(d.montant_decide)})` : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="t-cre">
          <h2 id="t-cre" className="titre mb-2 text-lg">Crédits</h2>
          {!f.credits.length ? <p className="text-encre-2">Aucun crédit chez votre institution.</p> : (
            <ul className="divide-y divide-trait rounded-2xl border border-trait bg-surface">
              {f.credits.map((c) => (
                <li key={c.id}>
                  <Link href={`/console/credits/${c.id}`} className="block space-y-1 px-4 py-3 hover:bg-surface-2">
                    <span className="flex items-baseline justify-between gap-3"><span className="chiffres font-semibold">{fcfa(c.montant)}</span><StatutCredit s={c.statut} /></span>
                    <span className="block text-sm text-encre-2">Décaissé le {date(c.decaisse_le)} · {c.payees}/{c.echeances} échéances payées · reste {fcfa(c.restant)}{c.jours_retard ? ` · ${c.jours_retard} j de retard` : ""}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {f.retards.length > 0 && (
            <>
              <h3 className="mb-1 mt-4 font-semibold">Échéances en retard</h3>
              <ul className="space-y-1 text-sm">
                {f.retards.map((e) => <li key={e.id}><Link href={`/console/credits/${e.credit_id}`} className="hover:underline">Échéance {e.rang} du {date(e.date_due)}</Link> · reste {fcfa(e.montant_attendu - e.montant_recu)} · <span className="text-alerte">{e.jours_retard} j</span></li>)}
              </ul>
            </>
          )}
        </section>
      </div>
    </article>
  );
}
