"use client";

import { Suspense } from "react";
import { Chargement, Erreur, Pastille, Vide } from "@/components/ui";
import { useApi } from "@/lib/api";
import { ACTIVITES, date, fcfa } from "@/lib/format";
import { Filtre, Liste, Pagination, Recherche, useParamsListe, type Page } from "../commun";

type Ligne = { id: string; nom: string; type_activite: string; dossiers: number; a_decider: number; derniere_demande: string; credits: number; encours: number; en_retard: number };

function Commercants() {
  const { lire, ecrire, requete } = useParamsListe();
  const { donnees: p, erreur, charge, recharger } = useApi<Page<Ligne>>(`/console/commercants?${requete}`);
  return (
    <section className="space-y-4">
      <header>
        <h1 className="titre text-[1.75rem] leading-tight">Commerçants</h1>
        <p className="text-encre-2">Commerçants ayant déposé au moins une demande chez votre institution.</p>
      </header>
      <div className="flex flex-wrap items-end gap-2" role="group" aria-label="Filtres">
        <Recherche valeur={lire("q")} changer={(v) => ecrire({ q: v || null })} />
        <Filtre label="Tri" valeur={`${p?.tri ?? ""}:${p?.ordre ?? ""}`} changer={(v) => { const [tri, ordre] = v.split(":"); ecrire({ tri: tri ?? null, ordre: ordre ?? null }); }}
          options={[["nom:asc", "Nom (A → Z)"], ["date:desc", "Dernière demande"], ["encours:desc", "Encours décroissant"]]} />
      </div>
      {erreur ? <Erreur message={erreur} reessayer={recharger} /> : charge && !p ? <Chargement lignes={6} /> : !p?.elements.length ? (
        <Vide titre="Aucun commerçant">{lire("q") ? "Aucun nom ne correspond." : "Les commerçants apparaissent à leur première demande."}</Vide>
      ) : (
        <Liste lignes={p.elements} cle={(c) => c.id} lien={(c) => `/console/commercants/${c.id}`}
          entetes={[{ l: "Commerçant" }, { l: "Activité" }, { l: "Demandes", droite: true }, { l: "Crédits", droite: true }, { l: "Encours", droite: true }, { l: "Situation" }, { l: "Dernière demande" }]}
          cellules={(c) => [
            <span key="n" className="font-semibold">{c.nom}</span>, ACTIVITES[c.type_activite] ?? c.type_activite, c.dossiers, c.credits, fcfa(c.encours),
            <span key="s" className="flex gap-1">{c.a_decider > 0 && <Pastille ton="info">à décider</Pastille>}{c.en_retard > 0 && <Pastille ton="alerte">retard</Pastille>}</span>,
            <span key="d" className="chiffres text-encre-2">{date(c.derniere_demande)}</span>,
          ]}
          carte={(c) => (
            <>
              <span className="flex items-baseline justify-between gap-3"><span className="font-semibold">{c.nom}</span><span className="chiffres">{fcfa(c.encours)}</span></span>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-encre-2">
                <span>{ACTIVITES[c.type_activite]}</span><span>{c.dossiers} demande{c.dossiers > 1 ? "s" : ""} · {c.credits} crédit{c.credits > 1 ? "s" : ""}</span>
                {c.a_decider > 0 && <Pastille ton="info">à décider</Pastille>}{c.en_retard > 0 && <Pastille ton="alerte">retard</Pastille>}
              </span>
            </>
          )} />
      )}
      {p && <Pagination p={p} aller={(n) => ecrire({ page: String(n) }, true)} />}
    </section>
  );
}

export default function PageCommercants() {
  return <Suspense fallback={<Chargement lignes={6} />}><Commercants /></Suspense>;
}
