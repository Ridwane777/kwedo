"use client";

import { TriangleAlert } from "lucide-react";
import { Suspense } from "react";
import { Chargement, Erreur, Pastille, Vide } from "@/components/ui";
import { useApi } from "@/lib/api";
import { date, fcfa, pct, STATUTS } from "@/lib/format";
import type { LigneDossier } from "@/lib/types";
import { DECISIONS, Effacer, Filtre, Liste, OngletsListe, Pagination, Periode, Recherche, TON_STATUT, useParamsListe, type Page } from "../commun";

export type LigneDemande = LigneDossier & { tranche: string; decision: string | null; decide_par: string | null; decide_le: string | null; montant_decide: number | null };
type Reponse = Page<LigneDemande> & { onglet: string; compteurs: Record<string, number> };

const ONGLETS = [
  { cle: "a_decider", label: "À décider" }, { cle: "complement", label: "Complément demandé" },
  { cle: "attente", label: "En attente du commerçant" }, { cle: "traitees", label: "Traitées" },
];
const STATUTS_ONGLET: Record<string, string[]> = {
  a_decider: ["recu", "en_analyse"], complement: [], attente: [], traitees: ["refuse", "offre_acceptee", "offre_refusee"],
};
const FILTRES = ["q", "statut", "decision", "tranche", "hors_tolerance", "alertes", "du", "au", "tri", "ordre"];

function Alertes({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="inline-flex items-center gap-1 font-medium text-encre">
      <TriangleAlert aria-hidden="true" size={16} strokeWidth={1.75} className="text-ambre-encre" />{n} alerte{n > 1 ? "s" : ""}
    </span>
  );
}

function Demandes() {
  const { lire, ecrire, requete } = useParamsListe();
  const onglet = lire("onglet", "a_decider");
  const { donnees: p, erreur, charge, recharger } = useApi<Reponse>(`/console/demandes?${requete}`);
  const filtre = FILTRES.some((k) => lire(k));
  const traitees = onglet === "traitees";

  return (
    <section className="space-y-4">
      <header>
        <h1 className="titre text-[1.75rem] leading-tight">Demandes</h1>
        <p className="text-encre-2">Toutes les demandes déposées chez votre institution, à décider comme déjà traitées.</p>
      </header>
      <OngletsListe onglets={ONGLETS.map((o) => ({ ...o, n: p?.compteurs[o.cle] }))} actif={onglet}
        choisir={(c) => ecrire({ onglet: c === "a_decider" ? null : c, statut: null, decision: null })} />
      <div className="flex flex-wrap items-end gap-2" role="group" aria-label="Filtres">
        <Recherche valeur={lire("q")} changer={(v) => ecrire({ q: v || null })} />
        {(STATUTS_ONGLET[onglet] ?? []).length > 0 && (
          <Filtre label="Statut" valeur={lire("statut")} changer={(v) => ecrire({ statut: v || null })}
            options={[["", "Tous"], ...(STATUTS_ONGLET[onglet] ?? []).map((s) => [s, STATUTS[s]!] as [string, string])]} />
        )}
        {traitees && (
          <Filtre label="Décision" valeur={lire("decision")} changer={(v) => ecrire({ decision: v || null })}
            options={[["", "Toutes"], ["valide", "Accordées"], ["ajuste", "Contre-proposées"], ["refuse", "Refusées"]]} />
        )}
        <Filtre label="Risque" valeur={lire("tranche")} changer={(v) => ecrire({ tranche: v || null })}
          options={[["", "Toutes tranches"], ["faible", "Faible (≤ ½ tolérance)"], ["proche", "Proche de la tolérance"], ["au_dessus", "Au-dessus de la tolérance"]]} />
        <Filtre label="Contrôles" valeur={lire("alertes") ? "1" : ""} changer={(v) => ecrire({ alertes: v || null })}
          options={[["", "Tous"], ["1", "Avec alertes"]]} />
        <Periode du={lire("du")} au={lire("au")} changer={(m) => ecrire(m)} />
        <Filtre label="Tri" valeur={`${p?.tri ?? ""}:${p?.ordre ?? ""}`} changer={(v) => { const [tri, ordre] = v.split(":"); ecrire({ tri: tri ?? null, ordre: ordre ?? null }); }}
          options={[
            ...(onglet === "a_decider" ? [["priorite:asc", "Priorité (alertes d'abord)"] as [string, string]] : []),
            ["risque:desc", "Risque décroissant"], ["risque:asc", "Risque croissant"],
            ["date:desc", "Plus récentes"], ["date:asc", "Plus anciennes"],
            ["montant:desc", "Montant décroissant"], ["montant:asc", "Montant croissant"],
          ]} />
        <Effacer actif={filtre} effacer={() => ecrire(Object.fromEntries(FILTRES.map((k) => [k, null])))} />
      </div>

      {erreur ? <Erreur message={erreur} reessayer={recharger} /> : charge && !p ? <Chargement lignes={6} /> : !p?.elements.length ? (
        <Vide titre={filtre ? "Aucune demande ne correspond" : "Rien dans cet onglet"}>
          {filtre ? "Élargissez la recherche ou effacez les filtres." : "Les demandes y apparaîtront au fil des dépôts et des décisions."}
        </Vide>
      ) : (
        <div className={charge ? "opacity-60" : ""}>
          <Liste lignes={p.elements} cle={(d) => d.id} lien={(d) => `/console/dossiers/${d.id}`}
            entetes={[{ l: "Commerçant" }, { l: "Montant demandé", droite: true }, { l: "Risque", droite: true }, { l: "Contrôles" }, { l: "Statut" },
              { l: traitees ? "Décision" : "Reçue le" }, ...(traitees ? [{ l: "Montant décidé", droite: true }] : [])]}
            cellules={(d) => [
              <span key="n" className="font-semibold">{d.nom}{!d.consentement_actif && <span className="ml-2 text-xs font-normal text-alerte">accord retiré</span>}</span>,
              fcfa(d.montant_demande),
              <span key="r" className={d.dans_tolerance ? "" : "font-semibold text-alerte"}>{pct(d.risque_demande, 1)}{d.dans_tolerance ? "" : " ▲"}</span>,
              d.alertes.length ? <Alertes n={d.alertes.length} /> : <span className="text-encre-2">—</span>,
              <Pastille key="s" ton={TON_STATUT[d.statut]}>{STATUTS[d.statut]}</Pastille>,
              traitees ? <span key="d">{d.decision ? DECISIONS[d.decision] : "—"} <span className="text-encre-2">· {date(d.decide_le, true)}</span></span>
                : <span key="d" className="chiffres text-encre-2">{date(d.cree_le, true)}</span>,
              ...(traitees ? [fcfa(d.montant_decide)] : []),
            ]}
            carte={(d) => (
              <>
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{d.nom}</span>
                  <span className="chiffres font-semibold">{fcfa(d.montant_demande)}</span>
                </span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-encre-2">
                  <Pastille ton={TON_STATUT[d.statut]}>{STATUTS[d.statut]}</Pastille>
                  <span className={d.dans_tolerance ? "" : "text-alerte"}>risque {pct(d.risque_demande, 1)}</span>
                  <Alertes n={d.alertes.length} />
                  <span>{traitees && d.decision ? `${DECISIONS[d.decision]} le ${date(d.decide_le)}` : `reçue le ${date(d.cree_le)}`}</span>
                </span>
              </>
            )} />
        </div>
      )}
      {p && <Pagination p={p} aller={(n) => ecrire({ page: String(n) }, true)} />}
    </section>
  );
}

export default function PageDemandes() {
  return <Suspense fallback={<Chargement lignes={6} />}><Demandes /></Suspense>;
}
