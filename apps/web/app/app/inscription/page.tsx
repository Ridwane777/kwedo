"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bouton, Simule } from "@/components/ui";
import { api } from "@/lib/api";
import { useCommercant } from "@/lib/commercant";
import { ACTIVITES } from "@/lib/format";
import type { Commercant } from "@/lib/types";

export default function Inscription() {
  const router = useRouter();
  const { changer } = useCommercant();
  const [f, setF] = useState({ nom: "", telephone: "+229 ", type_activite: "tissus", piece: "" });
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const champ = "mt-1 block min-h-14 w-full rounded-xl border border-trait bg-papier-2 px-4 text-lg";

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true); setErreur(null);
    try {
      const c = await api<Commercant>("/commercants", { body: { nom: f.nom, telephone: f.telephone, type_activite: f.type_activite, compte_separe: true } });
      changer(c.id);
      router.push("/app/compte");
    } catch (er) {
      setErreur(er instanceof Error ? er.message : "Erreur");
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={valider} className="space-y-5">
      <div className="space-y-1">
        <h1 className="titre text-3xl">Créer mon profil</h1>
        <p className="text-encre-2">Gratuit. Aucun frais de dossier, jamais.</p>
      </div>
      <label className="block">Nom et prénom<input required value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} className={champ} autoComplete="name" /></label>
      <label className="block">Téléphone<input required value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} className={champ} inputMode="tel" autoComplete="tel" /></label>
      <label className="block">Mon activité
        <select value={f.type_activite} onChange={(e) => setF({ ...f, type_activite: e.target.value })} className={champ}>
          {Object.entries(ACTIVITES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label className="block">Numéro de pièce d'identité
        <input value={f.piece} onChange={(e) => setF({ ...f, piece: e.target.value })} className={champ} />
        <span className="mt-1 flex items-center gap-2 text-sm text-encre-2"><Simule quoi="Vérification simulée" /> rien n'est transmis, le numéro n'est pas conservé.</span>
      </label>
      {erreur && <p role="alert" className="text-terre">{erreur}</p>}
      <Bouton type="submit" grand className="w-full" disabled={envoi}>{envoi ? "Création…" : "Créer mon profil"}</Bouton>
    </form>
  );
}
