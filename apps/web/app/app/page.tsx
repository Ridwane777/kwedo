"use client";

import { useState } from "react";
import { CourbeFlux } from "@/components/courbe-flux";
import { ChaineCalcul, ChoixInstitution, Raisons } from "@/components/estimation";
import { Chargement, Erreur, LienBouton, Simule } from "@/components/ui";
import { useApi } from "@/lib/api";
import { useCommercant } from "@/lib/commercant";
import { fcfa } from "@/lib/format";
import type { Analyse, Commercant, InstitutionPublique } from "@/lib/types";

export default function Estimation() {
  const { id } = useCommercant();
  const [inst, setInst] = useState("inst-lagune");
  const insts = useApi<InstitutionPublique[]>("/institutions");
  const com = useApi<{ commercant: Commercant }>(`/commercants/${id}`);
  const nbTx = com.donnees?.commercant.nb_transactions ?? 0;
  // Lancée en parallèle du profil : le montant (LCP) n'attend pas une seconde requête.
  const est = useApi<Analyse>(`/commercants/${id}/estimation?institution_id=${inst}`);

  if (com.erreur) return <Erreur message={com.erreur} reessayer={com.recharger} />;
  if (!com.donnees) return <Chargement lignes={5} label="Chargement de votre estimation" />;
  const prenom = com.donnees.commercant.nom.split(" ")[0];

  if (!nbTx) {
    return (
      <section className="space-y-5">
        <h1 className="titre text-3xl">Bonjour {prenom}</h1>
        <p className="text-lg">Pour calculer ce que vous pouvez emprunter, Kwedo a besoin des encaissements de votre compte marchand.</p>
        <LienBouton href="/app/flux" grand className="w-full">Connecter mes encaissements</LienBouton>
      </section>
    );
  }

  const a = est.donnees;
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <p className="text-encre-2">Bonjour {prenom}, vous pouvez emprunter jusqu'à</p>
        {a ? (
          <p className="montant apparait text-[3.25rem] leading-none text-indigo" aria-live="polite">{fcfa(a.plafond)}</p>
        ) : est.erreur ? <Erreur message={est.erreur} reessayer={est.recharger} /> : <div className="chargement h-14 w-4/5" />}
        {a && (
          <p className="pt-2 text-[15px]">
            sur <strong>{a.duree_semaines} semaines</strong>, soit <strong className="chiffres">{fcfa(a.echeance_hebdo)}</strong> par semaine.
            <span className="block text-sm text-encre-2">Coût total du crédit : {fcfa(a.cout_total)} (intérêts de l'institution, aucun frais Kwedo).</span>
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          <Simule quoi="Estimation sur flux simulés" />
          {a?.provisoire && <span className="rounded-full bg-safran-doux px-2.5 py-0.5 text-xs font-medium text-safran-encre">Provisoire : historique court</span>}
        </div>
      </div>

      {a && (
        <CourbeFlux serie={a.serie_hebdo} prudent={a.encaissement_prudent} median={a.indicateurs.encaissement_median} debut={a.indicateurs.debut} />
      )}

      {a && (
        <div className="space-y-3">
          <h2 className="titre text-xl">Pourquoi ce montant</h2>
          <Raisons raisons={a.raisons} />
          <ChaineCalcul a={a} />
        </div>
      )}

      {insts.donnees && <ChoixInstitution institutions={insts.donnees} valeur={inst} onChange={setInst} />}

      <div className="space-y-3 pt-2">
        <LienBouton href="/app/simulateur" grand className="w-full">Et si je demandais plus&nbsp;?</LienBouton>
        <LienBouton href="/app/conseils" variante="discret" className="w-full">Comment augmenter mon plafond</LienBouton>
      </div>
    </section>
  );
}
