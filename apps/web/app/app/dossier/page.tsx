"use client";

import { Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Bouton, Chargement, Erreur, Pastille, Vide } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { useCommercant } from "@/lib/commercant";
import { date, fcfa, STATUTS } from "@/lib/format";
import type { TableauDeBord } from "@/lib/types";

type Consentement = { id: string; nom: string; actif: boolean; historique: { action: string; horodatage: string }[] };

const SUIVI = ["recu", "en_analyse", "accorde"];

export default function Dossier() {
  const { id } = useCommercant();
  const cons = useApi<Consentement[]>(`/commercants/${id}/consentements`);
  const tdb = useApi<TableauDeBord>(`/commercants/${id}`);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function basculer(inst: string, actif: boolean) {
    setOccupe(inst); setErreur(null);
    try {
      await api(`/commercants/${id}/consentements`, { body: { institution_id: inst, action: actif ? "retire" : "accorde" } });
      await cons.recharger();
    } catch (e) { setErreur(e instanceof Error ? e.message : "Erreur"); } finally { setOccupe(null); }
  }
  async function envoyer() {
    setOccupe("envoi"); setErreur(null);
    try {
      for (const c of cons.donnees ?? []) {
        const deja = tdb.donnees?.dossiers.some((d) => d.institution_id === c.id && !["refuse", "offre_refusee"].includes(d.statut));
        if (c.actif && !deja) await api("/dossiers", { body: { commercant_id: id, institution_id: c.id } });
      }
      await tdb.recharger();
    } catch (e) { setErreur(e instanceof Error ? e.message : "Erreur"); } finally { setOccupe(null); }
  }

  if (cons.erreur || tdb.erreur) return <Erreur message={(cons.erreur ?? tdb.erreur)!} reessayer={() => { void cons.recharger(); void tdb.recharger(); }} />;
  if (!cons.donnees || !tdb.donnees) return <Chargement lignes={5} />;
  const dossiers = tdb.donnees.dossiers;
  const aEnvoyer = cons.donnees.filter((c) => c.actif && !dossiers.some((d) => d.institution_id === c.id && !["refuse", "offre_refusee"].includes(d.statut)));
  const offres = dossiers.filter((d) => d.statut === "accorde");

  return (
    <section className="space-y-7">
      <div>
        <h1 className="titre text-3xl">Mon dossier</h1>
        <p className="text-encre-2">Vous choisissez qui voit votre dossier. Chaque institution décide de son côté.</p>
      </div>

      <div className="space-y-2">
        <h2 className="titre text-xl">Qui peut voir mon dossier</h2>
        <ul className="divide-y divide-trait border-y border-trait">
          {cons.donnees.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{c.nom}</p>
                <p className="text-xs text-encre-2">{c.actif ? `Accord donné le ${date(c.historique.at(-1)?.horodatage, true)}` : c.historique.length ? "Accord retiré" : "Pas d'accord"}</p>
              </div>
              <button role="switch" aria-checked={c.actif} aria-label={`Accord pour ${c.nom}`} disabled={occupe === c.id} onClick={() => basculer(c.id, c.actif)}
                className={`relative h-8 w-14 shrink-0 rounded-full transition ${c.actif ? "bg-bon" : "bg-surface-3"}`}>
                <span className={`absolute top-1 h-6 w-6 rounded-full bg-fond shadow transition-all ${c.actif ? "left-7" : "left-1"}`} />
              </button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-encre-2">Retirer l'accord coupe l'accès aux nouvelles données. L'historique d'un crédit en cours reste chez le prêteur, comme la loi l'y oblige.</p>
      </div>

      {erreur && <p role="alert" className="text-alerte">{erreur}</p>}
      <Bouton grand icone={Send} className="w-full" disabled={!aEnvoyer.length || occupe === "envoi"} onClick={envoyer}>
        {occupe === "envoi" ? "Envoi…" : aEnvoyer.length ? `Envoyer à ${aEnvoyer.length} institution${aEnvoyer.length > 1 ? "s" : ""}` : "Donnez votre accord pour envoyer"}
      </Bouton>

      <div className="space-y-3">
        <h2 className="titre text-xl">Suivi</h2>
        {!dossiers.length ? <Vide titre="Aucun dossier envoyé">Vos demandes apparaîtront ici avec leur état.</Vide> : (
          <ul className="space-y-4">
            {dossiers.map((d) => (
              <li key={d.id} className="border-l-2 border-marque pl-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{d.institution}</p>
                  <Pastille ton={d.statut === "accorde" ? "bon" : d.statut === "refuse" ? "alerte" : "info"}>{STATUTS[d.statut]}</Pastille>
                </div>
                <ol className="mt-2 flex gap-1" aria-label="Étapes">
                  {SUIVI.map((s, k) => {
                    const fait = SUIVI.indexOf(d.statut) >= k || ["offre_acceptee", "refuse", "offre_refusee", "accorde"].includes(d.statut);
                    return <li key={s} className={`h-1.5 flex-1 rounded ${fait ? "bg-marque" : "bg-surface-3"}`} title={STATUTS[s]} />;
                  })}
                </ol>
                <p className="mt-1 text-xs text-encre-2">Envoyé le {date(d.cree_le, true)}</p>
                {["accorde", "refuse", "offre_acceptee", "complement"].includes(d.statut) && (
                  <Link href={`/app/offre/${d.id}`} className="mt-1 inline-block min-h-10 py-2 font-medium text-marque underline-offset-4 hover:underline">
                    {d.statut === "accorde" ? `Voir l'offre : ${fcfa(d.montant_offre)}` : "Voir la réponse"}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
        {offres.length > 1 && <p className="rounded-xl bg-marque-doux p-3 text-marque">Vous avez {offres.length} offres : comparez-les avant d'accepter.</p>}
      </div>
    </section>
  );
}
