"use client";

import { Wallet, FileText } from "lucide-react";
import { useState } from "react";
import { Bouton, Chargement, Erreur, LienBouton, Pastille, Simule, Vide } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { useCommercant } from "@/lib/commercant";
import { date, fcfa, FREQ } from "@/lib/format";
import type { Credit, TableauDeBord } from "@/lib/types";

const STATUT_ECH = { a_venir: ["À venir", "neutre"], payee: ["Payée", "bon"], partielle: ["Partielle", "attention"], en_retard: ["En retard", "alerte"] } as const;
const CANAUX = [{ v: "sms", l: "SMS" }, { v: "whatsapp", l: "WhatsApp" }, { v: "appli", l: "Dans l'appli" }] as const;

function CarteCredit({ c, canal, onChange }: { c: Credit; canal: string; onChange: () => Promise<void> }) {
  const [envoi, setEnvoi] = useState(false);
  const [recu, setRecu] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const p = c.prochaine;
  const du = p ? c.echeances.filter((e) => e.statut === "en_retard" || e.id === p.id).reduce((s, e) => s + e.montant_attendu - e.montant_recu, 0) : 0;
  const avance = (c.total_recu / c.total_du) * 100;

  async function payer() {
    setEnvoi(true); setErr(null);
    try {
      const r = await api<{ recu: string }>(`/credits/${c.id}/paiements`, { body: { montant: du } });
      setRecu(r.recu); await onChange();
    } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); } finally { setEnvoi(false); }
  }

  return (
    <article className="space-y-5">
      <div>
        <p className="text-encre-2">{c.institution} · {fcfa(c.montant)} · {c.echeances.length} échéances, {FREQ[c.frequence ?? "hebdomadaire"].chaque}</p>
        <p className="montant text-4xl">{fcfa(c.restant)} <span className="text-base text-encre-2">restant</span></p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={Math.round(avance)} aria-valuemin={0} aria-valuemax={100} aria-label="Remboursé">
          <div className="h-full bg-bon transition-all" style={{ width: `${avance}%` }} />
        </div>
      </div>
      {p ? (
        <div className={`space-y-3 rounded-2xl p-5 ${c.echeances.some((e) => e.statut === "en_retard") ? "bg-alerte-doux" : "bg-surface-2"}`}>
          <p>Prochaine {c.frequence === "mensuelle" ? "mensualité" : "échéance"} le <strong>{date(p.date_due)}</strong></p>
          <p className="montant text-3xl">{fcfa(du)}</p>
          {recu && <p role="status" className="text-bon">Paiement reçu. Reçu n° {recu}</p>}
          {err && <p role="alert" className="text-alerte">{err}</p>}
          <Bouton grand icone={Wallet} className="w-full" disabled={envoi || du <= 0} onClick={payer}>{envoi ? "Paiement…" : `Payer ${fcfa(du)} par mobile money`}</Bouton>
          <Simule quoi="Paiement simulé : aucun argent ne circule" />
        </div>
      ) : <p className="rounded-2xl bg-bon-doux p-5 text-bon">Crédit entièrement remboursé. Bravo.</p>}

      <details>
        <summary className="cursor-pointer font-medium text-marque">Échéancier ({c.echeances.filter((e) => e.statut === "payee").length}/{c.echeances.length} payées)</summary>
        <ol className="mt-2 divide-y divide-trait">
          {c.echeances.map((e) => (
            <li key={e.id} className="flex items-center justify-between py-2 text-sm">
              <span className="chiffres w-8 text-encre-2">{e.rang}</span>
              <span className="flex-1">{date(e.date_due)}</span>
              <span className="chiffres w-28 text-right">{fcfa(e.montant_attendu)}</span>
              <span className="ml-3 w-20 text-right"><Pastille ton={STATUT_ECH[e.statut][1]}>{STATUT_ECH[e.statut][0]}</Pastille></span>
            </li>
          ))}
        </ol>
      </details>
      {c.paiements.length > 0 && (
        <details>
          <summary className="cursor-pointer font-medium text-marque">Mes reçus ({c.paiements.length})</summary>
          <ul className="mt-2 space-y-1 text-sm">{c.paiements.map((x) => <li key={x.id} className="flex justify-between"><span>{date(x.horodatage, true)} · {x.recu}</span><span className="chiffres">{fcfa(x.montant)}</span></li>)}</ul>
        </details>
      )}
      {c.relances.length > 0 && (
        <div className="space-y-2">
          <h3 className="titre text-lg">Messages reçus <Simule quoi={`${canal} simulé`} className="ml-1 align-middle" /></h3>
          <ul className="space-y-2">{c.relances.map((r) => <li key={r.id} className="rounded-xl rounded-tl-none bg-marque-doux px-3 py-2 text-sm text-marque">{r.message}<span className="block pt-1 text-[11px] opacity-80">{date(r.horodatage, true)} · {r.canal}</span></li>)}</ul>
        </div>
      )}
    </article>
  );
}

export default function PageCredit() {
  const { id } = useCommercant();
  const { donnees, erreur, recharger } = useApi<TableauDeBord>(`/commercants/${id}`);
  const [majCanal, setMajCanal] = useState(false);
  if (erreur) return <Erreur message={erreur} reessayer={recharger} />;
  if (!donnees) return <Chargement lignes={5} />;
  const canal = donnees.commercant.canal;

  async function choisir(v: string) {
    setMajCanal(true);
    try { await api(`/commercants/${id}/canal`, { body: { canal: v } }); await recharger(); } finally { setMajCanal(false); }
  }

  return (
    <section className="space-y-7">
      <h1 className="titre text-3xl">Mon crédit</h1>
      {!donnees.credits.length ? (
        <Vide titre="Pas de crédit en cours"><p>Quand vous acceptez une offre, votre échéancier apparaît ici.</p><LienBouton href="/app/dossier" variante="trait" icone={FileText} className="mt-3">Voir mes demandes</LienBouton></Vide>
      ) : donnees.credits.map((c) => <CarteCredit key={c.id} c={c} canal={canal} onChange={recharger} />)}
      <fieldset className="space-y-2 border-t border-trait pt-5" disabled={majCanal}>
        <legend className="titre text-lg">Comment recevoir mes rappels</legend>
        <div className="grid grid-cols-3 gap-2">
          {CANAUX.map((c) => (
            <label key={c.v} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border text-sm ${canal === c.v ? "border-marque bg-marque-doux text-marque" : "border-trait"}`}>
              <input type="radio" name="canal" className="sr-only" checked={canal === c.v} onChange={() => choisir(c.v)} />{c.l}
            </label>
          ))}
        </div>
        <p className="text-xs text-encre-2">Au plus 3 messages par échéance, entre 8 h et 20 h, à vous seulement. Jamais à vos proches.</p>
      </fieldset>
    </section>
  );
}
