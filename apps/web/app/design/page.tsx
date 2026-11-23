"use client";

import { useState } from "react";
import { CourbeFlux } from "@/components/courbe-flux";
import { Lisiere, Marque } from "@/components/motif";
import { Bouton, Chargement, Erreur, Pastille, Simule, Vide } from "@/components/ui";
import { fcfa } from "@/lib/format";

const SERIE = [210, 232, 198, 260, 240, 225, 275, 300, 255, 240, 230, 265, 290, 310, 280, 260, 245, 270, 330, 360, 300, 285, 270, 290]
  .map((v) => v * 1000);

export default function Design() {
  const [choc, setChoc] = useState(0);
  return (
    <main className="mx-auto max-w-4xl space-y-10 p-6">
      <header className="space-y-3">
        <Marque />
        <h1 className="titre text-4xl">Système de design</h1>
        <Simule quoi="Page interne · exemple simulé" />
      </header>
      <Lisiere />
      <section className="space-y-3">
        <h2 className="titre text-2xl">Palette</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {["fond", "surface", "encre", "marque", "bon", "ambre", "alerte"].map((c) => (
            <div key={c} className="space-y-1 text-xs">
              <div className="h-14 rounded-lg border border-trait" style={{ background: `var(--${c})` }} />
              <p>{c}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-2">
        <h2 className="titre text-2xl">Typographie</h2>
        <p className="montant text-6xl">{fcfa(865000)}</p>
        <p className="text-base">Titres et montants en Bricolage Grotesque, interface en Instrument Sans, chiffres tabulaires : 1 234 567 / 7 654 321.</p>
      </section>
      <section className="space-y-4">
        <h2 className="titre text-2xl">Courbe de flux</h2>
        <CourbeFlux serie={SERIE} prudent={225000} median={268000} choc={choc} debut="2026-05-04" />
        <label className="block text-sm">
          Mes ventes baissent de <strong className="chiffres">{Math.round(-choc * 100)} %</strong>
          <input type="range" min={-60} max={0} step={5} value={Math.round(choc * 100)} onChange={(e) => setChoc(Number(e.target.value) / 100)} className="mt-2 w-full accent-[var(--alerte)]" />
        </label>
        <CourbeFlux serie={SERIE} prudent={225000} median={268000} dense hauteur={140} debut="2026-05-04" />
      </section>
      <section className="flex flex-wrap items-center gap-3">
        <Bouton>Action principale</Bouton>
        <Bouton variante="trait">Secondaire</Bouton>
        <Bouton variante="danger">Refuser</Bouton>
        <Pastille ton="bon">Payée</Pastille>
        <Pastille ton="attention">Examen renforcé</Pastille>
        <Pastille ton="alerte">En retard</Pastille>
        <Pastille ton="info">Reçu</Pastille>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        <Chargement />
        <Vide titre="Aucun dossier">La file est vide pour l'instant.</Vide>
        <Erreur message="Exemple d'erreur." />
      </section>
    </main>
  );
}
