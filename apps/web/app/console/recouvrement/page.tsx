"use client";

import Link from "next/link";
import { Suspense } from "react";
import { Chargement, Erreur, Simule, Vide } from "@/components/ui";
import { useApi } from "@/lib/api";
import { date, fcfa } from "@/lib/format";
import { Effacer, Filtre, Pagination, Periode, Recherche, useParamsListe, type Page } from "../commun";
import { Reprogrammer } from "./reprogrammer";

type Retard = { id: number; rang: number; date_due: string; montant_attendu: number; montant_recu: number; credit_id: string; commercant_id: string; nom: string; jours_retard: number; relances: number };
type Relance = { id: number; canal: string; message: string; horodatage: string; rang: number; credit_id: string; commercant_id: string; nom: string };
type Commercants = Page<{ id: string; nom: string }>;

function Recouvrement() {
  const { lire, ecrire } = useParamsListe();
  const pr = lire("page_retards", "1"), pl = lire("page", "1");
  const ret = useApi<Page<Retard>>(`/console/retards?taille=10&page=${pr}`);
  const qs = new URLSearchParams({ page: pl, taille: "20" });
  for (const k of ["commercant", "du", "au"]) if (lire(k)) qs.set(k, lire(k));
  const rel = useApi<Page<Relance>>(`/console/relances?${qs}`);
  const coms = useApi<Commercants>("/console/commercants?taille=50");
  const filtre = ["commercant", "du", "au"].some((k) => lire(k));

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titre text-[1.75rem] leading-tight">Recouvrement</h1>
          <p className="text-encre-2">Échéances en retard à traiter, puis l'historique des relances envoyées.</p>
        </div>
        <Simule quoi="Horloge et relances simulées" />
      </header>

      <section aria-labelledby="t-ret" className="space-y-2">
        <h2 id="t-ret" className="titre text-lg">Échéances en retard {ret.donnees && <span className="chiffres text-encre-2">({ret.donnees.total})</span>}</h2>
        {ret.erreur ? <Erreur message={ret.erreur} reessayer={ret.recharger} /> : !ret.donnees ? <Chargement lignes={4} /> : !ret.donnees.total ? (
          <Vide titre="Aucune échéance en retard">Tout est à jour.</Vide>
        ) : (
          <>
            <ul className="divide-y divide-trait rounded-2xl border border-trait bg-surface">
              {ret.donnees.elements.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <Link href={`/console/commercants/${e.commercant_id}`} className="font-semibold hover:underline">{e.nom}</Link>
                    <span className="text-encre-2"> · <Link href={`/console/credits/${e.credit_id}`} className="hover:underline">échéance {e.rang}</Link> du {date(e.date_due)} · reste {fcfa(e.montant_attendu - e.montant_recu)}</span>
                    <span className="block text-sm"><span className={e.jours_retard > 30 ? "font-semibold text-alerte" : "text-ambre-encre"}>{e.jours_retard} jours de retard</span><span className="text-encre-2"> · {e.relances} relance{e.relances > 1 ? "s" : ""}</span></span>
                  </span>
                  <Reprogrammer id={e.id} onFait={async () => { await ret.recharger(); await rel.recharger(); }} />
                </li>
              ))}
            </ul>
            <Pagination p={ret.donnees} aller={(n) => ecrire({ page_retards: String(n) }, true)} />
          </>
        )}
      </section>

      <section aria-labelledby="t-rel" className="space-y-2">
        <h2 id="t-rel" className="titre text-lg">Historique des relances</h2>
        <p className="text-xs text-encre-2">Règles : rappel avant l'échéance, puis J+1, J+3, J+7 ; 3 messages au plus par échéance ; 8 h-20 h ; canal choisi par le commerçant ; jamais l'entourage.</p>
        <div className="flex flex-wrap items-end gap-2" role="group" aria-label="Filtres des relances">
          <Filtre label="Commerçant" valeur={lire("commercant")} changer={(v) => ecrire({ commercant: v || null })}
            options={[["", "Tous"], ...(coms.donnees?.elements ?? []).map((c) => [c.id, c.nom] as [string, string])]} />
          <Periode du={lire("du")} au={lire("au")} changer={(m) => ecrire(m)} />
          <Effacer actif={filtre} effacer={() => ecrire({ commercant: null, du: null, au: null })} />
        </div>
        {rel.erreur ? <Erreur message={rel.erreur} reessayer={rel.recharger} /> : !rel.donnees ? <Chargement lignes={4} /> : !rel.donnees.total ? (
          <Vide titre="Aucune relance">{filtre ? "Aucune relance pour ces filtres." : "Les relances apparaissent quand une échéance approche ou passe."}</Vide>
        ) : (
          <>
            <ul className="space-y-2">
              {rel.donnees.elements.map((r) => (
                <li key={r.id} className="border-l-2 border-marque pl-3">
                  <p className="text-xs text-encre-2">{date(r.horodatage, true)} · <Link href={`/console/commercants/${r.commercant_id}`} className="hover:underline">{r.nom}</Link> · <Link href={`/console/credits/${r.credit_id}`} className="hover:underline">échéance {r.rang}</Link> · {r.canal}</p>
                  <p>{r.message}</p>
                </li>
              ))}
            </ul>
            <Pagination p={rel.donnees} aller={(n) => ecrire({ page: String(n) }, true)} />
          </>
        )}
      </section>
    </section>
  );
}

export default function PageRecouvrement() {
  return <Suspense fallback={<Chargement lignes={6} />}><Recouvrement /></Suspense>;
}
