"use client";

import { Chargement, Erreur, LienBouton, Pastille } from "@/components/ui";
import { useApi } from "@/lib/api";
import { useCommercant } from "@/lib/commercant";
import { date, pct } from "@/lib/format";
import type { TableauDeBord } from "@/lib/types";

export default function Compte() {
  const { id } = useCommercant();
  const { donnees, erreur, recharger } = useApi<TableauDeBord>(`/commercants/${id}`);
  if (erreur) return <Erreur message={erreur} reessayer={recharger} />;
  if (!donnees) return <Chargement />;
  const c = donnees.commercant, e = donnees.estimation;
  return (
    <section className="space-y-6">
      <h1 className="titre text-3xl">Mon compte marchand</h1>
      <p className="text-lg leading-snug">
        Un compte marchand sert uniquement à encaisser vos clients. Il est séparé de votre compte personnel :
        c'est ce qui permet de prouver vos ventes sans cahier ni papier.
      </p>
      <dl className="divide-y divide-trait border-y border-trait">
        <div className="flex justify-between py-3"><dt>Compte séparé</dt><dd>{c.compte_separe ? <Pastille ton="bon">Oui</Pastille> : <Pastille ton="attention">Non</Pastille>}</dd></div>
        <div className="flex justify-between py-3"><dt>Ouvert le</dt><dd>{date(c.compte_marchand_ouvert_le)}</dd></div>
        <div className="flex justify-between py-3"><dt>Encaissements connectés</dt><dd>{c.nb_transactions ? `${c.nb_transactions} opérations` : "pas encore"}</dd></div>
        {e && <div className="flex justify-between py-3"><dt>Part professionnelle</dt><dd className="chiffres">{pct(e.indicateurs.part_flux_pro)}</dd></div>}
      </dl>
      {!c.compte_separe && (
        <p className="rounded-xl bg-safran-doux p-4 text-safran-encre">Vos encaissements sont mélangés à des flux personnels. Ouvrez un compte marchand auprès de votre opérateur : la période de constitution de votre historique démarre dès l'ouverture.</p>
      )}
      {c.nb_transactions ? <LienBouton href="/app" grand className="w-full">Voir mon estimation</LienBouton>
        : <LienBouton href="/app/flux" grand className="w-full">Connecter mes encaissements</LienBouton>}
    </section>
  );
}
