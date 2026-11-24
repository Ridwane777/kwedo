"use client";

import { useState } from "react";
import { Marque } from "@/components/motif";
import { Bouton, Chargement, Erreur, Pastille, Simule, Vide } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { date } from "@/lib/format";
import { UserButton } from "@/components/user-button";
import { AvecIcone, BoutonIcone } from "@/components/bouton-icone";
import { ChevronDown, ChevronUp, FastForward, RotateCcw } from "lucide-react";
import { GardePro, type Utilisateur } from "@/lib/session";

type Ligne = { id: string; nom: string; dossiers: number; a_traiter: number; credits: number; versions_parametres: number };
type Evenement = { type: string; horodatage: string; acteur: string; institution_id: string | null; detail: string };
type Apercu = { maintenant: string; version_moteur: string; commercants: number; dossiers: number; credits: number; institutions: Ligne[]; journal: Evenement[] };

function Tableau({ u }: { u: Utilisateur }) {
  const { donnees: a, erreur, recharger } = useApi<Apercu>("/admin/apercu");
  const [occupe, setOccupe] = useState<string | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  const [tout, setTout] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  async function commande(cle: string, chemin: string, body: object, fait: string) {
    setOccupe(cle); setMsg(null); setConfirmer(false);
    try { await api(chemin, { body }); await recharger(); setMsg({ ok: true, t: fait }); }
    catch (e) { setMsg({ ok: false, t: e instanceof Error ? e.message : "Erreur" }); }
    finally { setOccupe(null); }
  }

  const entete = (
    <header className="relative z-20 border-b border-trait bg-surface">
      <div className="gouttiere flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-3"><Marque taille={26} /><span className="rounded-full bg-encre px-2.5 py-0.5 text-xs font-semibold text-fond">Admin général</span></div>
        <UserButton u={u} espace="pro" />
      </div>
    </header>
  );

  if (erreur) return <>{entete}<div className="gouttiere py-8"><Erreur message={erreur} reessayer={recharger} /></div></>;
  if (!a) return <>{entete}<div className="gouttiere py-8"><Chargement lignes={8} label="Chargement de la supervision" /></div></>;

  const noms = Object.fromEntries(a.institutions.map((i) => [i.id, i.nom]));
  const chiffres = [["Institutions", a.institutions.length], ["Commerçants", a.commercants], ["Dossiers", a.dossiers], ["Crédits", a.credits]] as const;
  // Logique d'exception : une institution avec des dossiers en attente passe devant.
  const institutions = [...a.institutions].sort((x, y) => y.a_traiter - x.a_traiter);
  const enAttente = a.institutions.reduce((s, i) => s + i.a_traiter, 0);
  // Événements identiques et consécutifs regroupés : « 6 × Consentement modifié » au lieu de six lignes.
  const groupes: (Evenement & { n: number; acteurs: Set<string>; insts: Set<string> })[] = [];
  for (const e of a.journal) {
    const g = groupes[groupes.length - 1];
    if (g && g.detail === e.detail && g.type === e.type) { g.n++; g.acteurs.add(e.acteur); if (e.institution_id) g.insts.add(e.institution_id); }
    else groupes.push({ ...e, n: 1, acteurs: new Set([e.acteur]), insts: new Set(e.institution_id ? [e.institution_id] : []) });
  }

  return (
    <div className="min-h-dvh text-[14px]">
      {entete}
      <div className="gouttiere space-y-8 py-7">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="titre text-[2rem] leading-tight">Supervision de la plateforme</h1>
            <p className="mt-1 max-w-2xl text-encre-2">Volumes et traçabilité. Les dossiers, les noms des commerçants et les réglages restent chez chaque institution.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-encre-2">
            <Pastille ton="bon">Service en ligne</Pastille>
            <span>Moteur {a.version_moteur}</span>
            <span className="chiffres">{date(a.maintenant, true)}</span>
          </div>
        </section>

        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {chiffres.map(([l, v]) => (
            <div key={l} className="rounded-2xl border border-trait bg-surface p-4">
              <dt className="text-encre-2">{l}</dt>
              <dd className="montant mt-1 text-[2rem] leading-none">{v}</dd>
            </div>
          ))}
        </dl>

        {/* Grand écran : institutions à gauche, activité et commandes à droite, sur toute la largeur. */}
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:items-start">
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="titre text-xl">Institutions</h2>
            <p className="text-encre-2">{enAttente ? `${enAttente} dossier${enAttente > 1 ? "s" : ""} en attente de décision` : "Aucun dossier en attente"}</p>
          </div>
          {!institutions.length ? <Vide titre="Aucune institution">Les institutions apparaissent ici dès leur ouverture sur la plateforme.</Vide> : (
            <ul className="divide-y divide-trait overflow-hidden rounded-2xl border border-trait bg-surface">
              <li aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_8rem_6rem_6rem_7rem] gap-4 bg-surface-2/60 px-4 py-2 text-xs font-semibold text-encre-2 md:grid">
                <span>Institution</span><span>État</span><span className="text-right">Dossiers</span><span className="text-right">Crédits</span><span className="text-right">Réglages</span>
              </li>
              {institutions.map((i) => (
                <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 md:grid-cols-[minmax(0,1fr)_8rem_6rem_6rem_7rem]">
                  <span className="font-semibold">{i.nom}</span>
                  <span>{i.a_traiter ? <Pastille ton="attention">{i.a_traiter} à traiter</Pastille> : <Pastille ton="bon">À jour</Pastille>}</span>
                  <span className="chiffres col-span-2 text-encre-2 md:col-span-1 md:text-right md:text-encre">
                    <span className="md:hidden">{i.dossiers} dossiers, {i.credits} crédits, {i.versions_parametres} version(s) de réglages</span>
                    <span className="hidden md:inline">{i.dossiers}</span>
                  </span>
                  <span className="chiffres hidden text-right md:inline">{i.credits}</span>
                  <span className="chiffres hidden text-right md:inline">{i.versions_parametres} v.</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 space-y-3">
            <h2 className="titre text-xl">Activité récente</h2>
            {!a.journal.length ? <Vide titre="Aucune activité">Les événements de la plateforme s'affichent ici au fil de l'eau.</Vide> : (
              <ol className="divide-y divide-trait overflow-hidden rounded-2xl border border-trait bg-surface">
                {(tout ? groupes : groupes.slice(0, 8)).map((e, k) => (
                  <li key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-[9.5rem_1fr]">
                    <span className="chiffres text-encre-2">{date(e.horodatage, true)}</span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        {e.detail}
                        {e.n > 1 && <span className="chiffres rounded-full bg-surface-2 px-2 text-xs font-semibold text-encre-2">{e.n} fois</span>}
                      </span>
                      <span className="block text-xs text-encre-2">
                        {[...e.acteurs].join(", ")}{e.insts.size ? `, ${[...e.insts].map((i) => noms[i] ?? i).join(", ")}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {groupes.length > 8 && (
              <BoutonIcone icone={tout ? ChevronUp : ChevronDown} aria-expanded={tout} onClick={() => setTout(!tout)}
                label={tout ? "Replier l'activité" : `Afficher toute l'activité (${a.journal.length} événements)`} className="border border-trait" infobulle="haut" ancre="gauche" />
            )}
          </div>
          <aside className="h-fit space-y-3 rounded-2xl border border-trait bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="titre text-xl">Commandes de démo</h2>
              <Simule quoi="Simulé" />
            </div>
            <p className="text-encre-2">Elles agissent sur toute la plateforme.</p>
            <div className="flex gap-2">
              <BoutonIcone icone={FastForward} label="Avancer l'horloge de 7 jours" ancre="gauche" className="border border-trait" disabled={!!occupe} aria-busy={occupe === "avancer"}
                onClick={() => void commande("avancer", "/demo/avancer", { jours: 7 }, "Horloge avancée de 7 jours.")} />
              <BoutonIcone icone={RotateCcw} label="Réinitialiser la démo…" className="border border-trait" disabled={!!occupe} aria-expanded={confirmer}
                onClick={() => setConfirmer(true)} />
            </div>
            {confirmer && (
              <div className="space-y-2 rounded-xl bg-alerte-doux p-3">
                <p className="text-sm">Toutes les données de démo reviennent à l'état initial.</p>
                <div className="flex gap-2">
                  <Bouton variante="danger" className="flex-1" disabled={!!occupe} onClick={() => void commande("reinit", "/demo/reinitialiser", {}, "Démo réinitialisée.")}>
                    <AvecIcone icone={RotateCcw}>{occupe === "reinit" ? "Réinitialisation…" : "Réinitialiser la démo"}</AvecIcone>
                  </Bouton>
                  <Bouton variante="trait" onClick={() => setConfirmer(false)}>Annuler</Bouton>
                </div>
              </div>
            )}
            {occupe === "avancer" && <p role="status" className="text-sm text-encre-2">Avance de l'horloge en cours…</p>}
            {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm font-medium ${msg.ok ? "text-bon" : "text-alerte"}`}>{msg.t}</p>}
          </aside>
        </section>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  return <GardePro roles={["admin"]}>{(u) => <Tableau u={u} />}</GardePro>;
}
