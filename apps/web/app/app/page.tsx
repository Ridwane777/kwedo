"use client";

import { useState } from "react";
import { CourbeFlux } from "@/components/courbe-flux";
import { ChaineCalcul, ChoixInstitution, Raisons } from "@/components/estimation";
import { Chargement, Erreur, LienBouton, Simule } from "@/components/ui";
import { useApi } from "@/lib/api";
import { useCommercant } from "@/lib/commercant";
import { fcfa } from "@/lib/format";
import type { Estimation as VueEstimation, Commercant, InstitutionPublique } from "@/lib/types";

export default function Estimation() {
  const { id } = useCommercant();
  const [inst, setInst] = useState("inst-lagune");
  const insts = useApi<InstitutionPublique[]>("/institutions");
  const com = useApi<{ commercant: Commercant }>(`/commercants/${id}`);
  const nbTx = com.donnees?.commercant.nb_transactions ?? 0;
  // Lancée en parallèle du profil : le montant (LCP) n'attend pas une seconde requête.
  const est = useApi<VueEstimation>(`/commercants/${id}/estimation?institution_id=${inst}`);

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
      {/* Combien, à quel prix, que faire : tout tient dans ce bloc, au-dessus de la ligne de flottaison. */}
      <div className="rounded-3xl bg-surface p-5 shadow-carte">
        <p className="text-encre-2">Bonjour {prenom}, vous pouvez emprunter jusqu'à</p>
        {a ? (
          <p className="montant apparait mt-1 text-[3.1rem] leading-none text-marque" aria-live="polite">{fcfa(a.plafond)}</p>
        ) : est.erreur ? <div className="mt-2"><Erreur message={est.erreur} reessayer={est.recharger} /></div> : <div className="chargement mt-2 h-12 w-4/5" />}
        {a && (
          <>
            <dl className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-fond p-3">
                <dt className="text-sm text-encre-2">Chaque semaine</dt>
                <dd className="chiffres text-lg font-semibold">{fcfa(a.echeance_hebdo)}</dd>
              </div>
              <div className="rounded-2xl bg-fond p-3">
                <dt className="text-sm text-encre-2">Pendant</dt>
                <dd className="chiffres text-lg font-semibold">{a.duree_semaines} semaines</dd>
              </div>
              <div className="col-span-2 flex items-baseline justify-between gap-3 rounded-2xl bg-fond p-3">
                <dt className="text-sm text-encre-2">Coût total du crédit</dt>
                <dd className="chiffres text-right font-semibold">{fcfa(a.cout_total)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-sm text-encre-2">Intérêts de l'institution choisie. Aucun frais Kwedo.</p>
            <LienBouton href="/app/dossier" grand className="mt-5 w-full">Envoyer mon dossier</LienBouton>
          </>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Simule quoi="Estimation sur flux simulés" />
          {a?.provisoire && <span className="rounded-full bg-ambre-doux px-2.5 py-0.5 text-xs font-semibold text-ambre-encre">Provisoire : historique court</span>}
        </div>
      </div>

      {insts.donnees && <ChoixInstitution institutions={insts.donnees} valeur={inst} onChange={setInst} />}

      {a && (
        <div className="space-y-2">
          <h2 className="titre text-xl">Vos ventes, semaine par semaine</h2>
          <CourbeFlux serie={a.serie_hebdo} prudent={a.encaissement_prudent} median={a.indicateurs.encaissement_median} debut={a.indicateurs.debut} />
        </div>
      )}

      {a && (
        <div className="space-y-3">
          <h2 className="titre text-xl">Pourquoi ce montant</h2>
          <Raisons raisons={a.raisons} />
          <ChaineCalcul a={a} />
        </div>
      )}

      <div className="grid gap-2 pt-1">
        <LienBouton href="/app/simulateur" variante="trait" grand className="w-full">Et si je demandais plus&nbsp;?</LienBouton>
        <LienBouton href="/app/conseils" variante="discret" className="w-full">Comment augmenter mon plafond</LienBouton>
      </div>
    </section>
  );
}
