"use client";

import { useState } from "react";
import { Marque } from "@/components/motif";
import { Bouton, Chargement, Erreur, Pastille, Simule } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { date } from "@/lib/format";
import { deconnecter, GardePro, type Utilisateur } from "@/lib/session";

type Ligne = { id: string; nom: string; dossiers: number; a_traiter: number; credits: number; versions_parametres: number };
type Evenement = { type: string; horodatage: string; acteur: string; institution_id: string | null; detail: string };
type Apercu = { maintenant: string; version_moteur: string; commercants: number; dossiers: number; credits: number; institutions: Ligne[]; journal: Evenement[] };

function Tableau({ u }: { u: Utilisateur }) {
  const { donnees: a, erreur, recharger } = useApi<Apercu>("/admin/apercu");
  const [occupe, setOccupe] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  async function commande(chemin: string, body: object, fait: string) {
    setOccupe(true); setMsg(null);
    try { await api(chemin, { body }); await recharger(); setMsg({ ok: true, t: fait }); }
    catch (e) { setMsg({ ok: false, t: e instanceof Error ? e.message : "Erreur" }); }
    finally { setOccupe(false); }
  }

  if (erreur) return <Erreur message={erreur} reessayer={recharger} />;
  if (!a) return <Chargement lignes={8} />;
  const noms = Object.fromEntries(a.institutions.map((i) => [i.id, i.nom]));
  const chiffres = [["Institutions", a.institutions.length], ["Commerçants", a.commercants], ["Dossiers", a.dossiers], ["Crédits", a.credits]] as const;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-5 text-[13.5px] sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-trait pb-4">
        <div className="flex items-center gap-4"><Marque taille={24} /><span className="text-encre-2">Admin général · {u.login}</span></div>
        <div className="flex items-center gap-3">
          <Simule quoi="Données simulées" />
          <Bouton variante="trait" onClick={() => void deconnecter("pro")}>Changer de profil</Bouton>
        </div>
      </header>

      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="titre text-3xl">Supervision de la plateforme</h1>
          <p className="mt-1 max-w-2xl text-encre-2">Volumes et traçabilité. Les dossiers, les noms des commerçants et les réglages restent chez chaque institution.</p>
        </div>
        <p className="text-encre-2"><Pastille ton="bon">Service en ligne</Pastille> <span className="ml-2">Moteur {a.version_moteur} · {date(a.maintenant, true)}</span></p>
      </section>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-trait py-4 md:grid-cols-4">
        {chiffres.map(([l, v]) => <div key={l}><dt className="text-encre-2">{l}</dt><dd className="montant text-3xl">{v}</dd></div>)}
      </dl>

      <section>
        <h2 className="titre mb-2 text-xl">Institutions</h2>
        <ul className="divide-y divide-trait border-y border-trait md:hidden">
          {a.institutions.map((i) => (
            <li key={i.id} className="py-3">
              <p className="font-medium">{i.nom}</p>
              <p className="chiffres text-sm text-encre-2">{i.dossiers} dossiers · {i.a_traiter} à traiter · {i.credits} crédits · {i.versions_parametres} version(s) de réglages</p>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] text-left">
            <thead className="border-b-2 border-encre text-xs uppercase tracking-wide text-encre-2">
              <tr><th className="py-2">Institution</th><th className="text-right">Dossiers</th><th className="text-right">À traiter</th><th className="text-right">Crédits</th><th className="text-right">Versions de réglages</th></tr>
            </thead>
            <tbody className="chiffres">
              {a.institutions.map((i) => (
                <tr key={i.id} className="border-b border-trait"><td className="py-2 font-medium">{i.nom}</td><td className="text-right">{i.dossiers}</td><td className="text-right">{i.a_traiter}</td><td className="text-right">{i.credits}</td><td className="text-right">{i.versions_parametres}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          <h2 className="titre mb-2 text-xl">Journal global</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="border-b-2 border-encre text-xs uppercase tracking-wide text-encre-2"><tr><th className="py-1.5">Date</th><th>Acteur</th><th>Institution</th><th>Événement</th></tr></thead>
              <tbody>
                {a.journal.map((e, k) => (
                  <tr key={k} className="border-b border-trait"><td className="chiffres whitespace-nowrap py-1.5 pr-3 text-encre-2">{date(e.horodatage, true)}</td><td className="pr-3">{e.acteur}</td><td className="pr-3">{e.institution_id ? noms[e.institution_id] : "—"}</td><td>{e.detail}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="space-y-3">
          <h2 className="titre text-xl">Commandes de démo</h2>
          <p className="text-encre-2">Elles agissent sur toute la plateforme.</p>
          <Bouton variante="trait" className="w-full" disabled={occupe} onClick={() => void commande("/demo/avancer", { jours: 7 }, "Horloge avancée de 7 jours.")}>Avancer de 7 jours</Bouton>
          <Bouton variante="trait" className="w-full" disabled={occupe} onClick={() => void commande("/demo/reinitialiser", {}, "Démo réinitialisée.")}>Réinitialiser la démo</Bouton>
          {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-feuille" : "text-terre"}>{msg.t}</p>}
        </aside>
      </section>
    </div>
  );
}

export default function Admin() {
  return <GardePro roles={["admin"]}>{(u) => <Tableau u={u} />}</GardePro>;
}
