"use client";

import { useState } from "react";
import { Marque } from "@/components/motif";
import { Bouton, Chargement, Erreur, Pastille, Simule, Vide } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { date } from "@/lib/format";
import { deconnecter, GardePro, type Utilisateur } from "@/lib/session";

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
    <header className="border-b border-trait bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
        <div className="flex items-center gap-3"><Marque taille={26} /><span className="rounded-full bg-encre px-2.5 py-0.5 text-xs font-semibold text-fond">Admin général</span></div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-encre-2 sm:inline">{u.login}</span>
          <Bouton variante="trait" onClick={() => void deconnecter("pro")}>Changer de profil</Bouton>
        </div>
      </div>
    </header>
  );

  if (erreur) return <>{entete}<div className="mx-auto max-w-6xl px-5 py-8 sm:px-8"><Erreur message={erreur} reessayer={recharger} /></div></>;
  if (!a) return <>{entete}<div className="mx-auto max-w-6xl px-5 py-8 sm:px-8"><Chargement lignes={8} label="Chargement de la supervision" /></div></>;

  const noms = Object.fromEntries(a.institutions.map((i) => [i.id, i.nom]));
  const chiffres = [["Institutions", a.institutions.length], ["Commerçants", a.commercants], ["Dossiers", a.dossiers], ["Crédits", a.credits]] as const;
  // Logique d'exception : une institution avec des dossiers en attente passe devant.
  const institutions = [...a.institutions].sort((x, y) => y.a_traiter - x.a_traiter);
  const enAttente = a.institutions.reduce((s, i) => s + i.a_traiter, 0);

  return (
    <div className="min-h-dvh text-[14px]">
      {entete}
      <div className="mx-auto max-w-6xl space-y-8 px-5 py-7 sm:px-8">
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

        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="titre text-xl">Institutions</h2>
            <p className="text-encre-2">{enAttente ? `${enAttente} dossier${enAttente > 1 ? "s" : ""} en attente de décision` : "Aucun dossier en attente"}</p>
          </div>
          {!institutions.length ? <Vide titre="Aucune institution">Les institutions apparaissent ici dès leur ouverture sur la plateforme.</Vide> : (
            <ul className="grid gap-3 md:grid-cols-2">
              {institutions.map((i) => (
                <li key={i.id} className="rounded-2xl border border-trait bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{i.nom}</p>
                    {i.a_traiter ? <Pastille ton="attention">{i.a_traiter} à traiter</Pastille> : <Pastille ton="bon">À jour</Pastille>}
                  </div>
                  <dl className="chiffres mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div><dt className="text-encre-2">Dossiers</dt><dd className="text-lg font-semibold">{i.dossiers}</dd></div>
                    <div><dt className="text-encre-2">Crédits</dt><dd className="text-lg font-semibold">{i.credits}</dd></div>
                    <div><dt className="text-encre-2">Réglages</dt><dd className="text-lg font-semibold">{i.versions_parametres} v.</dd></div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0 space-y-3">
            <h2 className="titre text-xl">Activité récente</h2>
            {!a.journal.length ? <Vide titre="Aucune activité">Les événements de la plateforme s'affichent ici au fil de l'eau.</Vide> : (
              <ol className="divide-y divide-trait overflow-hidden rounded-2xl border border-trait bg-surface">
                {(tout ? a.journal : a.journal.slice(0, 8)).map((e, k) => (
                  <li key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-[9.5rem_1fr]">
                    <span className="chiffres text-encre-2">{date(e.horodatage, true)}</span>
                    <span className="min-w-0">
                      <span className="block">{e.detail}</span>
                      <span className="block text-xs text-encre-2">{e.acteur}{e.institution_id ? `, ${noms[e.institution_id] ?? e.institution_id}` : ""}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {a.journal.length > 8 && (
              <Bouton variante="discret" aria-expanded={tout} onClick={() => setTout(!tout)}>
                {tout ? "Afficher moins" : `Afficher les ${a.journal.length} événements`}
              </Bouton>
            )}
          </div>
          <aside className="h-fit space-y-3 rounded-2xl border border-trait bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="titre text-xl">Commandes de démo</h2>
              <Simule quoi="Simulé" />
            </div>
            <p className="text-encre-2">Elles agissent sur toute la plateforme.</p>
            <Bouton variante="trait" className="w-full" disabled={!!occupe} onClick={() => void commande("avancer", "/demo/avancer", { jours: 7 }, "Horloge avancée de 7 jours.")}>
              {occupe === "avancer" ? "Avance en cours…" : "Avancer de 7 jours"}
            </Bouton>
            {confirmer ? (
              <div className="space-y-2 rounded-xl bg-alerte-doux p-3">
                <p className="text-sm">Toutes les données de démo reviennent à l'état initial.</p>
                <div className="flex gap-2">
                  <Bouton variante="danger" className="flex-1" disabled={!!occupe} onClick={() => void commande("reinit", "/demo/reinitialiser", {}, "Démo réinitialisée.")}>Réinitialiser la démo</Bouton>
                  <Bouton variante="trait" onClick={() => setConfirmer(false)}>Annuler</Bouton>
                </div>
              </div>
            ) : (
              <Bouton variante="trait" className="w-full" disabled={!!occupe} onClick={() => setConfirmer(true)}>{occupe === "reinit" ? "Réinitialisation…" : "Réinitialiser…"}</Bouton>
            )}
            {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm font-medium ${msg.ok ? "text-bon" : "text-alerte"}`}>{msg.t}</p>}
          </aside>
        </section>
      </div>
    </div>
  );
}

export default function Admin() {
  return <GardePro roles={["admin"]}>{(u) => <Tableau u={u} />}</GardePro>;
}
