"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bouton, Simule } from "@/components/ui";
import { api } from "@/lib/api";
import { useCommercant } from "@/lib/commercant";

export default function Flux() {
  const { id } = useCommercant();
  const router = useRouter();
  const [accord, setAccord] = useState(false);
  const [etat, setEtat] = useState<"idle" | "envoi" | "fait" | "erreur">("idle");
  const [msg, setMsg] = useState("");

  async function connecter() {
    setEtat("envoi");
    try {
      const r = await api<{ transactions: number }>(`/commercants/${id}/connexion-flux`, { body: { semaines: 30 } });
      setMsg(`${r.transactions} opérations importées.`);
      setEtat("fait");
      setTimeout(() => router.push("/app"), 900);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erreur"); setEtat("erreur");
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="titre text-3xl">Connecter mes encaissements</h1>
      <Simule quoi="Opérateur simulé : import d'un jeu de démonstration" />
      <ul className="space-y-3 text-[16px]">
        <li><strong>Ce que Kwedo lit :</strong> les paiements reçus et envoyés sur votre compte marchand (date, montant, payeur anonymisé).</li>
        <li><strong>Ce que Kwedo ne lit pas :</strong> vos messages, vos contacts, votre compte personnel.</li>
        <li><strong>Qui le voit :</strong> personne d'autre, tant que vous n'envoyez pas votre dossier à une institution.</li>
      </ul>
      <label className="flex min-h-14 items-start gap-3 rounded-xl border border-trait p-4">
        <input type="checkbox" checked={accord} onChange={(e) => setAccord(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--indigo)]" />
        <span>J'autorise mon opérateur à transmettre l'historique de mon compte marchand à Kwedo. Je peux retirer cet accord à tout moment.</span>
      </label>
      {etat === "fait" && <p role="status" className="text-feuille">{msg}</p>}
      {etat === "erreur" && <p role="alert" className="text-terre">{msg}</p>}
      <Bouton grand className="w-full" disabled={!accord || etat === "envoi" || etat === "fait"} onClick={connecter}>
        {etat === "envoi" ? "Connexion…" : "Autoriser et connecter"}
      </Bouton>
      <p className="text-sm text-encre-2">Factures e-MECeF : prévues plus tard (phase 2).</p>
    </section>
  );
}
