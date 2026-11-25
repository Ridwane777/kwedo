"use client";

import { CalendarClock, Save } from "lucide-react";
import { useState } from "react";
import { BoutonIcone } from "@/components/bouton-icone";
import { Bouton } from "@/components/ui";
import { api } from "@/lib/api";

/** Reprogrammer une échéance : nouvelle date et motif tracé au journal (comme avant la refonte). */
export function Reprogrammer({ id, onFait }: { id: number; onFait: () => Promise<void> | void }) {
  const [ouvert, setOuvert] = useState(false);
  const [nd, setNd] = useState("");
  const [motif, setMotif] = useState("");
  const [err, setErr] = useState<string | null>(null);
  if (!ouvert) return <BoutonIcone icone={CalendarClock} label="Reprogrammer l'échéance" className="border border-trait" onClick={() => setOuvert(true)} />;
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={async (ev) => {
      ev.preventDefault(); setErr(null);
      try { await api(`/echeances/${id}/interventions`, { body: { nouvelle_date: nd, motif } }); setOuvert(false); await onFait(); }
      catch (x) { setErr(x instanceof Error ? x.message : "Erreur"); }
    }}>
      <input type="date" required value={nd} onChange={(x) => setNd(x.target.value)} className="min-h-11 rounded-xl border border-trait bg-fond px-2" aria-label="Nouvelle date" />
      <input required minLength={10} value={motif} onChange={(x) => setMotif(x.target.value)} placeholder="Motif (tracé)" className="min-h-11 w-56 rounded-xl border border-trait bg-fond px-2" aria-label="Motif" />
      <Bouton type="submit" icone={Save}>Enregistrer</Bouton>
      {err && <span role="alert" className="text-alerte">{err}</span>}
    </form>
  );
}
