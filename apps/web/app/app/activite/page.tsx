"use client";

import { Link2 } from "lucide-react";
import Link from "next/link";
import { CourbeFlux } from "@/components/courbe-flux";
import { Chargement, Erreur, LienBouton, Simule } from "@/components/ui";
import { useApi } from "@/lib/api";
import { useCommercant } from "@/lib/commercant";
import { date, fcfa, pct } from "@/lib/format";
import type { TableauDeBord } from "@/lib/types";

export default function Activite() {
  const { id } = useCommercant();
  const { donnees, erreur, recharger } = useApi<TableauDeBord>(`/commercants/${id}`);
  if (erreur) return <Erreur message={erreur} reessayer={recharger} />;
  if (!donnees) return <Chargement lignes={6} />;
  const e = donnees.estimation;
  if (!e) return <div className="space-y-4"><h1 className="titre text-3xl">Mon activité</h1><LienBouton href="/app/flux" grand icone={Link2} className="w-full">Connecter mes encaissements</LienBouton></div>;
  const s = e.serie_hebdo;
  const d4 = s.slice(-4).reduce((a, b) => a + b, 0) / 4;
  const p4 = s.slice(-8, -4).reduce((a, b) => a + b, 0) / 4;
  const evol = p4 ? d4 / p4 - 1 : 0;
  const prochaines = donnees.credits.flatMap((c) => c.echeances.filter((x) => x.statut !== "payee").slice(0, 3).map((x) => ({ ...x, inst: c.institution })));

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="titre text-3xl">Mon activité</h1>
        <Simule quoi="Flux simulés" />
      </div>
      <dl className="grid grid-cols-2 gap-4">
        <div><dt className="text-sm text-encre-2">Encaissé ces 4 semaines</dt><dd className="montant text-2xl">{fcfa(d4 * 4)}</dd></div>
        <div>
          <dt className="text-sm text-encre-2">Par rapport aux 4 précédentes</dt>
          <dd className={`montant text-2xl ${evol < 0 ? "text-alerte" : "text-bon"}`}>{evol >= 0 ? "+" : ""}{pct(evol)}</dd>
        </div>
      </dl>
      <CourbeFlux serie={s.slice(-26)} prudent={e.encaissement_prudent} median={e.indicateurs.encaissement_median} hauteur={190}
        debut={e.indicateurs.debut ? new Date(new Date(`${e.indicateurs.debut}T12:00:00`).getTime() + Math.max(0, s.length - 26) * 7 * 864e5).toISOString().slice(0, 10) : null} />

      <div className="space-y-2">
        <h2 className="titre text-xl">Mon crédit</h2>
        {donnees.credits.length ? (
          <>
            <p>Restant à rembourser : <strong className="chiffres">{fcfa(donnees.credits.reduce((a, c) => a + c.restant, 0))}</strong></p>
            <ul className="divide-y divide-trait border-y border-trait">
              {prochaines.map((x) => (
                <li key={x.id} className="flex justify-between py-2.5"><span>{date(x.date_due)}</span><span className={`chiffres ${x.statut === "en_retard" ? "text-alerte" : ""}`}>{fcfa(x.montant_attendu - x.montant_recu)}</span></li>
              ))}
            </ul>
            <Link href="/app/credit" className="inline-block min-h-10 py-2 font-medium text-marque">Payer ou voir l'échéancier</Link>
          </>
        ) : <p className="text-encre-2">Pas de crédit en cours. Votre plafond estimé : <strong className="chiffres text-encre">{fcfa(e.plafond)}</strong>.</p>}
      </div>

      <div className="space-y-2">
        <h2 className="titre text-xl">Pour augmenter mon plafond</h2>
        <ul className="space-y-2">{e.conseils.slice(0, 2).map((c) => <li key={c} className="border-l-2 border-ambre pl-3">{c}</li>)}</ul>
        <Link href="/app/conseils" className="inline-block min-h-10 py-2 font-medium text-marque">Tous mes conseils</Link>
      </div>
    </section>
  );
}
