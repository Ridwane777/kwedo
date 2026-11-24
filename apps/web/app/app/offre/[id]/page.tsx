"use client";

import { Check, CreditCard, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Raisons } from "@/components/estimation";
import { Bouton, Chargement, Erreur, Simule } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { useCommercant } from "@/lib/commercant";
import { fcfa, nombre, pct, STATUTS } from "@/lib/format";
import type { Raison } from "@/lib/types";

type Offre = {
  id: string; institution: string; statut: string; montant_offre: number | null; duree_offre: number | null; plafond_estime: number;
  echeance?: number; cout_total?: number; taux_periode?: number; raisons: Raison[]; conseils: string[];
  decision: { type: string; motif: string } | null; credit: { id: string } | null;
};

export default function PageOffre() {
  const { id: did } = useParams<{ id: string }>();
  const { id } = useCommercant();
  const router = useRouter();
  const { donnees: o, erreur, recharger } = useApi<Offre>(`/commercants/${id}/dossiers/${did}`);
  const [contre, setContre] = useState<number | null>(null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [acceptee, setAcceptee] = useState(false);
  // L'écran suivant est chargé d'avance : l'ouverture du crédit ne dépend pas d'un aller-retour après l'accord.
  useEffect(() => { router.prefetch("/app/credit"); }, [router]);

  if (erreur) return <Erreur message={erreur} reessayer={recharger} />;
  if (!o) return <Chargement lignes={5} />;

  if (acceptee) {
    return (
      <section role="status" className="space-y-4">
        <h1 className="titre text-3xl">Offre acceptée</h1>
        <p className="text-lg">Votre crédit auprès de {o.institution} est ouvert. Ouverture de votre échéancier…</p>
        <Bouton grand icone={CreditCard} className="w-full" onClick={() => router.push("/app/credit")}>Voir mon crédit</Bouton>
      </section>
    );
  }

  async function repondre(reponse: "accepte" | "refuse") {
    setEnvoi(reponse); setErr(null);
    try {
      await api(`/dossiers/${did}/offre`, { body: { reponse, montant: reponse === "accepte" && contre ? contre : undefined } });
      if (reponse === "accepte") {
        // L'accord est enregistré : on ne réaffiche jamais le bouton « Accepter » (un second clic renverrait une erreur 409).
        setAcceptee(true);
        router.push("/app/credit");
        return;
      }
      await recharger();
    } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); }
    setEnvoi(null);
  }

  if (o.statut === "refuse") {
    return (
      <section className="space-y-5">
        <h1 className="titre text-3xl">{o.institution}</h1>
        <p className="text-lg">L'institution n'a pas accordé de crédit cette fois.</p>
        {o.decision && <p className="border-l-2 border-alerte pl-3 italic">« {o.decision.motif} »</p>}
        <h2 className="titre text-xl">Ce qui améliorerait votre situation</h2>
        <ul className="list-disc space-y-2 pl-5">{o.conseils.map((c) => <li key={c}>{c}</li>)}</ul>
      </section>
    );
  }
  if (o.statut !== "accorde") {
    return (
      <section className="space-y-4">
        <h1 className="titre text-3xl">{o.institution}</h1>
        <p className="text-lg">État : {STATUTS[o.statut]}.</p>
        {o.decision?.type === "complement" && <p className="border-l-2 border-ambre pl-3">« {o.decision.motif} »</p>}
        {o.credit && <Bouton grand icone={CreditCard} className="w-full" onClick={() => router.push("/app/credit")}>Voir mon crédit</Bouton>}
      </section>
    );
  }

  const montant = contre ?? o.montant_offre!;
  const ratio = montant / o.montant_offre!;
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <p className="text-encre-2">{o.institution} vous propose</p>
        <p className="montant text-5xl text-montant">{fcfa(o.montant_offre)}</p>
        <Simule quoi="Offre fictive" />
      </div>
      <dl className="divide-y divide-trait border-y border-trait text-[16px]">
        <div className="flex justify-between py-3"><dt>Durée</dt><dd>{o.duree_offre} semaines</dd></div>
        <div className="flex justify-between py-3"><dt>Échéance chaque semaine</dt><dd className="chiffres font-medium">{fcfa((o.echeance ?? 0) * ratio)}</dd></div>
        <div className="flex justify-between py-3"><dt>Taux par semaine</dt><dd className="chiffres">{pct(o.taux_periode, 2)}</dd></div>
        <div className="flex justify-between py-3"><dt>Coût total du crédit</dt><dd className="chiffres">{fcfa((o.cout_total ?? 0) * ratio)}</dd></div>
        <div className="flex justify-between py-3"><dt>Frais Kwedo</dt><dd>0 FCFA</dd></div>
      </dl>
      {o.decision?.motif && o.decision.type === "ajuste" && (
        <p className="text-sm text-encre-2">Votre estimation était de {fcfa(o.plafond_estime)}. Motif de l'agent : « {o.decision.motif} »</p>
      )}
      <label className="block">
        <span className="text-encre-2">Je préfère emprunter moins (facultatif)</span>
        <input inputMode="numeric" value={contre === null ? "" : nombre(contre)} placeholder={nombre(o.montant_offre!)}
          onChange={(e) => { const v = Number(e.target.value.replace(/\D/g, "")); setContre(v ? Math.min(v, o.montant_offre!) : null); }}
          className="montant mt-1 block min-h-14 w-full rounded-xl border border-trait bg-surface-2 px-4 text-2xl" />
      </label>
      {err && <Erreur message={err} reessayer={recharger} />}
      <Bouton grand icone={Check} className="w-full" disabled={!!envoi} onClick={() => repondre("accepte")}>
        {envoi === "accepte" ? "Acceptation…" : `Accepter ${fcfa(montant)}`}
      </Bouton>
      <Bouton variante="discret" icone={X} className="w-full" disabled={!!envoi} onClick={() => repondre("refuse")}>Décliner l'offre</Bouton>
      <details>
        <summary className="cursor-pointer text-marque">Pourquoi ce montant</summary>
        <div className="mt-2"><Raisons raisons={o.raisons} /></div>
      </details>
    </section>
  );
}
