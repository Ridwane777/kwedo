"use client";

import { Calculator, Lightbulb, Link2, Send } from "lucide-react";
import { useState } from "react";
import { CourbeFlux } from "@/components/courbe-flux";
import { ChaineCalcul, ChoixInstitution, ChoixModalites, MentionPrudente, prudentHebdo, Raisons, requeteModalites } from "@/components/estimation";
import { Chargement, Erreur, LienBouton, Simule } from "@/components/ui";
import { useApi } from "@/lib/api";
import { useCommercant } from "@/lib/commercant";
import { duree, fcfa, FREQ, phraseEcheance, type Frequence } from "@/lib/format";
import type { Estimation as VueEstimation, Commercant, InstitutionPublique } from "@/lib/types";

function Actions() {
  return (
    <>
      <LienBouton href="/app/simulateur" variante="trait" grand icone={Calculator} className="w-full">Et si je demandais plus&nbsp;?</LienBouton>
      <LienBouton href="/app/conseils" variante="discret" icone={Lightbulb} className="w-full">Comment augmenter mon plafond</LienBouton>
    </>
  );
}

export default function Estimation() {
  const { id } = useCommercant();
  const [inst, setInst] = useState("inst-lagune");
  // Fréquence et durée : rien tant que le commerçant garde la formule par défaut de l'institution.
  const [choix, setChoix] = useState<{ frequence: Frequence; duree: number } | null>(null);
  const insts = useApi<InstitutionPublique[]>("/institutions");
  const com = useApi<{ commercant: Commercant }>(`/commercants/${id}`);
  const nbTx = com.donnees?.commercant.nb_transactions ?? 0;
  // Lancée en parallèle du profil : le montant (LCP) n'attend pas une seconde requête.
  const est = useApi<VueEstimation>(`/commercants/${id}/estimation?institution_id=${inst}${requeteModalites(choix)}`);

  if (com.erreur) return <Erreur message={com.erreur} reessayer={com.recharger} />;
  if (!com.donnees) return <Chargement lignes={5} label="Chargement de votre estimation" />;
  const prenom = com.donnees.commercant.nom.split(" ")[0];

  if (!nbTx) {
    return (
      <section className="space-y-5">
        <h1 className="titre text-3xl">Bonjour {prenom}</h1>
        <p className="text-lg">Pour calculer ce que vous pouvez emprunter, Kwedo a besoin des encaissements de votre compte marchand.</p>
        <LienBouton href="/app/flux" grand icone={Link2} className="w-full">Connecter mes encaissements</LienBouton>
      </section>
    );
  }

  const a = est.donnees;
  return (
    // Téléphone : une colonne. Ordinateur : montant et actions à gauche, courbe et raisons à droite.
    <section className="grid gap-6 lg:grid-cols-[minmax(20rem,28rem)_minmax(0,1fr)] lg:items-start lg:gap-x-[clamp(2rem,4vw,4rem)]">
      <div className="space-y-6 lg:sticky lg:top-6 lg:col-start-1 lg:row-start-1">
      {/* Combien, à quel prix, que faire : tout tient dans ce bloc, au-dessus de la ligne de flottaison. */}
      <div className="rounded-3xl bg-surface p-5 shadow-carte lg:p-7">
        <p className="text-encre-2">Bonjour {prenom}, vous pouvez emprunter jusqu'à</p>
        {a ? (
          <p className="montant apparait mt-1 text-[3.1rem] leading-none text-montant" aria-live="polite">{fcfa(a.plafond)}</p>
        ) : est.erreur ? <div className="mt-2"><Erreur message={est.erreur} reessayer={est.recharger} /></div> : <div className="chargement mt-2 h-12 w-4/5" />}
        {a && (
          <>
            <dl className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-fond p-3">
                <dt className="text-sm text-encre-2">{FREQ[a.frequence].nom}</dt>
                <dd className="chiffres text-lg font-semibold">{fcfa(a.echeance)}</dd>
              </div>
              <div className="rounded-2xl bg-fond p-3">
                <dt className="text-sm text-encre-2">Pendant</dt>
                <dd className="chiffres text-lg font-semibold">{duree({ duree_mois: a.parametres.duree_mois, duree_semaines: a.duree_semaines })}</dd>
              </div>
              <div className="col-span-2 flex items-baseline justify-between gap-3 rounded-2xl bg-fond p-3">
                <dt className="text-sm text-encre-2">Coût total du crédit</dt>
                <dd className="chiffres text-right font-semibold">{fcfa(a.cout_total)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-sm text-encre-2" data-testid="phrase-echeance">
              {phraseEcheance(a.echeance, a.frequence, { duree_mois: a.parametres.duree_mois, duree_semaines: a.duree_semaines })} ({a.nb_echeances} échéances).
              Intérêts de l'institution choisie. Aucun frais Kwedo.
            </p>
            <MentionPrudente a={a} />
            <LienBouton href={`/app/dossier?institution=${inst}${choix ? `&frequence=${choix.frequence}&duree=${choix.duree}` : ""}`} grand icone={Send} className="mt-5 w-full">Envoyer mon dossier</LienBouton>
          </>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Simule quoi="Estimation sur flux simulés" />
          {a?.provisoire && <span className="rounded-full bg-ambre-doux px-2.5 py-0.5 text-xs font-semibold text-ambre-encre">Provisoire : historique court</span>}
        </div>
      </div>

      {insts.donnees && <ChoixInstitution institutions={insts.donnees} valeur={inst} onChange={(v) => { setChoix(null); setInst(v); }} />}
      {a && a.institution_id === inst && <ChoixModalites a={a} desactive={est.charge} onChange={(frequence, d) => setChoix({ frequence, duree: d })} />}
      {/* Ordinateur : les actions suivent le sélecteur, sans trou ; sur téléphone elles restent en bas de page. */}
      <div className="hidden gap-2 lg:grid"><Actions /></div>
      </div>

      <div className="min-w-0 space-y-6 lg:col-start-2 lg:row-start-1">
      {a && (
        <div className="space-y-2 lg:rounded-3xl lg:border lg:border-trait lg:bg-surface lg:p-6">
          <h2 className="titre text-xl">Vos ventes, semaine par semaine</h2>
          <CourbeFlux serie={a.serie_hebdo} prudent={prudentHebdo(a)} median={a.indicateurs.encaissement_median} debut={a.indicateurs.debut} hauteur={240} />
        </div>
      )}

      {a && (
        <div className="space-y-3">
          <h2 className="titre text-xl">Pourquoi ce montant</h2>
          <Raisons raisons={a.raisons} />
          <ChaineCalcul a={a} />
        </div>
      )}
      </div>

      <div className="grid gap-2 pt-1 lg:hidden"><Actions /></div>
    </section>
  );
}
