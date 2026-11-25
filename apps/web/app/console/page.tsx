"use client";

import { ArrowRight, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Chargement, Erreur, Pastille, Simule } from "@/components/ui";
import { useApi } from "@/lib/api";
import { date, fcfa, pct, STATUTS } from "@/lib/format";
import { IndicateursCredits, TON_STATUT, type Indicateurs } from "./commun";
import type { LigneDemande } from "./demandes/page";

type Aujourdhui = {
  maintenant: string; nb_a_decider: number; avec_alertes: number; a_decider: LigneDemande[];
  nb_retards: number; nouveaux_retards: number; retards: { id: number; rang: number; date_due: string; montant_attendu: number; montant_recu: number; credit_id: string; nom: string; jours_retard: number }[];
  nb_offres_sans_reponse: number; delai_sans_reponse_jours: number; offres_sans_reponse: (LigneDemande & { jours_sans_reponse: number })[];
  indicateurs: Indicateurs;
};

function Carte({ titre, n, href, lien, children, vide }: { titre: string; n: number; href: string; lien: string; children: ReactNode; vide: string }) {
  return (
    <section aria-label={titre} className="flex flex-col rounded-2xl border border-trait bg-surface">
      <header className="flex items-baseline justify-between gap-3 border-b border-trait px-4 py-3">
        <h2 className="font-semibold">{titre}</h2>
        <span className="montant text-2xl">{n}</span>
      </header>
      <div className="flex-1">{n ? children : <p className="px-4 py-3 text-encre-2">{vide}</p>}</div>
      <Link href={href} className="flex min-h-11 items-center justify-between border-t border-trait px-4 py-2 font-medium text-marque hover:bg-surface-2">
        {lien}<ArrowRight aria-hidden="true" size={18} />
      </Link>
    </section>
  );
}

export default function Aujourdhui() {
  const { donnees: a, erreur, recharger } = useApi<Aujourdhui>("/console/aujourdhui");
  if (erreur) return <Erreur message={erreur} reessayer={recharger} />;
  if (!a) return <Chargement lignes={6} />;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titre text-[1.75rem] leading-tight">Aujourd'hui</h1>
          <p className="text-encre-2">Ce qui demande une action maintenant · date simulée : {date(a.maintenant, true)}</p>
        </div>
        <Simule quoi="Horloge simulée" />
      </header>
      <IndicateursCredits i={a.indicateurs} liens />
      <div className="grid gap-4 xl:grid-cols-3">
        <Carte titre="Dossiers à décider" n={a.nb_a_decider} href="/console/demandes" lien="Toutes les demandes à décider" vide="Aucun dossier en attente de décision.">
          {a.avec_alertes > 0 && (
            <Link href="/console/demandes?alertes=1" className="flex items-center gap-2 bg-ambre-doux px-4 py-2 text-sm font-medium text-ambre-encre">
              <TriangleAlert aria-hidden="true" size={16} />{a.avec_alertes} avec alertes de cohérence
            </Link>
          )}
          <ul className="divide-y divide-trait">
            {a.a_decider.map((d) => (
              <li key={d.id}>
                <Link href={`/console/dossiers/${d.id}`} className="flex items-baseline justify-between gap-3 px-4 py-2.5 hover:bg-surface-2">
                  <span className="min-w-0"><span className="font-semibold">{d.nom}</span>
                    <span className="block text-sm text-encre-2"><Pastille ton={TON_STATUT[d.statut]}>{STATUTS[d.statut]}</Pastille> <span className={d.dans_tolerance ? "" : "text-alerte"}>risque {pct(d.risque_demande, 1)}</span>{d.alertes.length > 0 && ` · ${d.alertes.length} alerte${d.alertes.length > 1 ? "s" : ""}`}</span>
                  </span>
                  <span className="chiffres shrink-0">{fcfa(d.montant_demande)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Carte>
        <Carte titre="Échéances en retard" n={a.nb_retards} href="/console/recouvrement" lien="Aller au recouvrement" vide="Aucune échéance en retard.">
          {a.nouveaux_retards > 0 && <p className="bg-alerte-doux px-4 py-2 text-sm font-medium text-alerte">{a.nouveaux_retards} nouvelle{a.nouveaux_retards > 1 ? "s" : ""} depuis hier</p>}
          <ul className="divide-y divide-trait">
            {a.retards.map((e) => (
              <li key={e.id}>
                <Link href={`/console/credits/${e.credit_id}`} className="flex items-baseline justify-between gap-3 px-4 py-2.5 hover:bg-surface-2">
                  <span><span className="font-semibold">{e.nom}</span><span className="block text-sm text-encre-2">échéance {e.rang} du {date(e.date_due)} · <span className="text-alerte">{e.jours_retard} j</span></span></span>
                  <span className="chiffres shrink-0">{fcfa(e.montant_attendu - e.montant_recu)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Carte>
        <Carte titre={`Offres sans réponse depuis ${a.delai_sans_reponse_jours} jours`} n={a.nb_offres_sans_reponse} href="/console/demandes?onglet=attente" lien="Offres en attente du commerçant" vide="Aucune offre ne traîne.">
          <ul className="divide-y divide-trait">
            {a.offres_sans_reponse.map((d) => (
              <li key={d.id}>
                <Link href={`/console/dossiers/${d.id}`} className="flex items-baseline justify-between gap-3 px-4 py-2.5 hover:bg-surface-2">
                  <span><span className="font-semibold">{d.nom}</span><span className="block text-sm text-encre-2">offre du {date(d.decide_le)} · sans réponse depuis {d.jours_sans_reponse} j</span></span>
                  <span className="chiffres shrink-0">{fcfa(d.montant_decide)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Carte>
      </div>
    </section>
  );
}
