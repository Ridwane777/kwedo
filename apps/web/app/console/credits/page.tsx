"use client";

import { Suspense } from "react";
import { Chargement, Erreur, Vide } from "@/components/ui";
import { useApi } from "@/lib/api";
import { date, fcfa, FREQ, type Frequence } from "@/lib/format";
import { Effacer, Filtre, IndicateursCredits, Liste, OngletsListe, Pagination, Periode, Recherche, StatutCredit, useParamsListe, type Indicateurs, type Page } from "../commun";

export type LigneCredit = {
  id: string; dossier_id: string; commercant_id: string; nom: string; montant: number; decaisse_le: string; frequence: Frequence;
  statut: string; restant: number; jours_retard: number; echeances: number; payees: number; en_retard: number; relances: number; prochaine: string | null;
};
type Reponse = Page<LigneCredit> & { onglet: string; compteurs: Record<string, number>; indicateurs: Indicateurs };

const ONGLETS = [{ cle: "en_cours", label: "En cours" }, { cle: "en_retard", label: "En retard" }, { cle: "rembourses", label: "Remboursés" }, { cle: "en_defaut", label: "En défaut" }];
const FILTRES = ["q", "du", "au", "tri", "ordre"];

function Credits() {
  const { lire, ecrire, requete } = useParamsListe();
  const onglet = lire("onglet", "en_cours");
  const { donnees: p, erreur, charge, recharger } = useApi<Reponse>(`/console/credits?${requete}`);
  const filtre = FILTRES.some((k) => lire(k));
  return (
    <section className="space-y-4">
      <header>
        <h1 className="titre text-[1.75rem] leading-tight">Crédits</h1>
        <p className="text-encre-2">Crédits décaissés par votre institution. En défaut : une échéance impayée depuis plus de 90 jours.</p>
      </header>
      {p && <IndicateursCredits i={p.indicateurs} />}
      <OngletsListe onglets={ONGLETS.map((o) => ({ ...o, n: p?.compteurs[o.cle] }))} actif={onglet} choisir={(c) => ecrire({ onglet: c === "en_cours" ? null : c })} />
      <div className="flex flex-wrap items-end gap-2" role="group" aria-label="Filtres">
        <Recherche valeur={lire("q")} changer={(v) => ecrire({ q: v || null })} />
        <Periode du={lire("du")} au={lire("au")} changer={(m) => ecrire(m)} />
        <Filtre label="Tri" valeur={`${p?.tri ?? ""}:${p?.ordre ?? ""}`} changer={(v) => { const [tri, ordre] = v.split(":"); ecrire({ tri: tri ?? null, ordre: ordre ?? null }); }}
          options={[["date:desc", "Décaissés récemment"], ["date:asc", "Décaissés il y a longtemps"], ["retard:desc", "Retard le plus long"],
            ["restant:desc", "Restant dû décroissant"], ["montant:desc", "Montant décroissant"], ["montant:asc", "Montant croissant"]]} />
        <Effacer actif={filtre} effacer={() => ecrire(Object.fromEntries(FILTRES.map((k) => [k, null])))} />
      </div>
      {erreur ? <Erreur message={erreur} reessayer={recharger} /> : charge && !p ? <Chargement lignes={6} /> : !p?.elements.length ? (
        <Vide titre={filtre ? "Aucun crédit ne correspond" : "Aucun crédit dans cet onglet"}>Les crédits apparaissent dès qu'un commerçant accepte une offre.</Vide>
      ) : (
        <div className={charge ? "opacity-60" : ""}>
          <Liste lignes={p.elements} cle={(c) => c.id} lien={(c) => `/console/credits/${c.id}`}
            entetes={[{ l: "Commerçant" }, { l: "Montant", droite: true }, { l: "Restant dû", droite: true }, { l: "Échéances payées", droite: true },
              { l: "Retard (jours)", droite: true }, { l: "Statut" }, { l: "Décaissé le" }]}
            cellules={(c) => [
              <span key="n" className="font-semibold">{c.nom}</span>, fcfa(c.montant), fcfa(c.restant), `${c.payees}/${c.echeances}`,
              <span key="j" className={c.jours_retard ? "font-semibold text-alerte" : ""}>{c.jours_retard || "—"}</span>,
              <StatutCredit key="s" s={c.statut} />, <span key="d" className="chiffres text-encre-2">{date(c.decaisse_le)} · {FREQ[c.frequence].chaque}</span>,
            ]}
            carte={(c) => (
              <>
                <span className="flex items-baseline justify-between gap-3"><span className="font-semibold">{c.nom}</span><span className="chiffres font-semibold">{fcfa(c.montant)}</span></span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-encre-2">
                  <StatutCredit s={c.statut} /><span>reste {fcfa(c.restant)}</span><span>{c.payees}/{c.echeances} payées</span>
                  {c.jours_retard > 0 && <span className="text-alerte">{c.jours_retard} j de retard</span>}
                </span>
              </>
            )} />
        </div>
      )}
      {p && <Pagination p={p} aller={(n) => ecrire({ page: String(n) }, true)} />}
    </section>
  );
}

export default function PageCredits() {
  return <Suspense fallback={<Chargement lignes={6} />}><Credits /></Suspense>;
}
