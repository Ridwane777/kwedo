"use client";

import { Link2, TrendingUp, X } from "lucide-react";
import { useState } from "react";
import { Bouton, Chargement, Erreur, LienBouton, Pastille } from "@/components/ui";
import { api, useApi } from "@/lib/api";
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
        <p className="rounded-xl bg-ambre-doux p-4 text-ambre-encre">Vos encaissements sont mélangés à des flux personnels. Ouvrez un compte marchand auprès de votre opérateur : la période de constitution de votre historique démarre dès l'ouverture.</p>
      )}
      {c.nb_transactions ? <LienBouton href="/app" grand icone={TrendingUp} className="w-full">Voir mon estimation</LienBouton>
        : <LienBouton href="/app/flux" grand icone={Link2} className="w-full">Connecter mes encaissements</LienBouton>}
      <AccordsDonnes />
    </section>
  );
}

type Consentement = { id: string; nom: string; actif: boolean; historique: { action: string; horodatage: string }[] };

/** Institutions qui ont reçu le dossier : l'accord se retire ici, discrètement (il se donne dans « Mon dossier »). */
function AccordsDonnes() {
  const { id } = useCommercant();
  const cons = useApi<Consentement[]>(`/commercants/${id}/consentements`);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  if (cons.erreur) return <Erreur message={cons.erreur} reessayer={cons.recharger} />;
  if (!cons.donnees) return null;
  const actifs = cons.donnees.filter((x) => x.actif);

  async function retirer(inst: string) {
    setOccupe(inst); setErreur(null);
    try { await api(`/commercants/${id}/consentements`, { body: { institution_id: inst, action: "retire" } }); await cons.recharger(); }
    catch (e) { setErreur(e instanceof Error ? e.message : "Erreur"); } finally { setOccupe(null); }
  }

  return (
    <div className="space-y-2 border-t border-trait pt-5">
      <h2 className="titre text-lg">Institutions qui consultent mon dossier</h2>
      {!actifs.length ? <p className="text-sm text-encre-2">Aucune pour l'instant. L'accord se donne au moment de déposer votre dossier.</p> : (
        <ul className="divide-y divide-trait border-y border-trait">
          {actifs.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{x.nom}</p>
                <p className="text-xs text-encre-2">Accord donné le {date(x.historique.at(-1)?.horodatage, true)}</p>
              </div>
              <Bouton variante="discret" icone={X} aria-label={`Retirer l'accord pour ${x.nom}`} disabled={occupe === x.id} onClick={() => retirer(x.id)}>Retirer</Bouton>
            </li>
          ))}
        </ul>
      )}
      {erreur && <p role="alert" className="text-alerte">{erreur}</p>}
      <p className="text-xs text-encre-2">Retirer l'accord coupe l'accès aux nouvelles données. L'historique d'un crédit en cours reste chez le prêteur, comme la loi l'y oblige.</p>
    </div>
  );
}
