"use client";

import { useEffect, useState } from "react";
import { CourbeFlux } from "@/components/courbe-flux";
import { Erreur, LienBouton, Simule } from "@/components/ui";
import { api } from "@/lib/api";
import { useCommercant } from "@/lib/commercant";
import { fcfa, nombre } from "@/lib/format";
import type { Estimation } from "@/lib/types";

export default function Simulateur() {
  const { id } = useCommercant();
  const [souhait, setSouhait] = useState<number | null>(null);
  const [baisse, setBaisse] = useState(0);
  const [a, setA] = useState<Estimation | null>(null);
  const [base, setBase] = useState<Estimation | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    api<Estimation>(`/commercants/${id}/estimation`).then((r) => {
      setBase(r);
      setSouhait((s) => s ?? (Math.round((r.plafond * 1.5) / 50_000) * 50_000 || 100_000));
    }).catch((e) => setErreur(e.message));
  }, [id]);

  useEffect(() => {
    if (souhait === null) return;
    const t = setTimeout(() => {
      api<Estimation>(`/commercants/${id}/estimation?choc_ventes=${-baisse / 100}&montant_souhaite=${souhait}`)
        .then((r) => { setA(r); setErreur(null); })
        .catch((e) => setErreur(e.message));
    }, 180);
    return () => clearTimeout(t);
  }, [id, souhait, baisse]);

  if (erreur) return <Erreur message={erreur} />;
  const s = a?.souhait;

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="titre text-3xl">Et si je demandais plus&nbsp;?</h1>
        <Simule quoi="Simulation sur flux simulés" />
      </div>

      <label className="block">
        <span className="text-encre-2">Le montant que je souhaite</span>
        <span className="mt-1 flex items-center rounded-xl border border-trait bg-surface-2 focus-within:outline focus-within:outline-3 focus-within:outline-[var(--focus)]">
          <input inputMode="numeric" value={souhait === null ? "" : nombre(souhait)}
            onChange={(e) => { const v = Number(e.target.value.replace(/\D/g, "")); setSouhait(Number.isFinite(v) ? Math.min(v, 50_000_000) : 0); }}
            className="montant min-h-16 w-full bg-transparent px-4 text-3xl outline-none" aria-describedby="aide-montant" />
          <span className="pr-4 text-encre-2">FCFA</span>
        </span>
        <span id="aide-montant" className="mt-1 block text-sm text-encre-2">Votre plafond actuel : {fcfa(base?.plafond)}</span>
      </label>

      {!s && <p role="status" className="chargement h-24 rounded-2xl"><span className="sr-only">Calcul en cours</span></p>}
      {s && (
        <div aria-live="polite" className={`apparait rounded-2xl p-5 ${s.atteignable ? "bg-bon-doux" : "bg-surface-2"}`}>
          {s.atteignable ? (
            <p className="text-lg"><strong className="text-bon">C'est possible.</strong> Échéance de {fcfa(s.echeance)} par semaine.</p>
          ) : (
            <>
              <p className="text-lg">Pour obtenir <strong className="chiffres">{fcfa(s.montant)}</strong>, il manque :</p>
              <ul className="mt-3 space-y-2 text-[15px]">
                {s.manque.map((m) => (
                  <li key={m} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-alerte" />{m}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="space-y-3 border-t border-trait pt-5">
        <h2 className="titre text-xl">Test de résistance</h2>
        <label className="block text-[15px]">
          Et si mes ventes baissaient de <strong className="chiffres text-alerte">{baisse} %</strong> ?
          <input type="range" min={0} max={60} step={5} value={baisse} onChange={(e) => setBaisse(Number(e.target.value))}
            className="mt-3 h-8 w-full accent-[var(--alerte)]" aria-valuetext={`${baisse} pour cent de baisse`} />
        </label>
        {a && (
          <>
            <CourbeFlux serie={a.serie_hebdo} prudent={base?.encaissement_prudent ?? a.encaissement_prudent} median={a.indicateurs.encaissement_median} choc={-baisse / 100} debut={a.indicateurs.debut} hauteur={180} />
            <dl className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <dt className="text-sm text-encre-2">Plafond</dt>
                <dd className="montant text-2xl">{fcfa(a.plafond)}</dd>
                {base && baisse > 0 && <dd className="text-xs text-alerte">{fcfa(a.plafond - base.plafond)}</dd>}
              </div>
              <div>
                <dt className="text-sm text-encre-2">Au montant souhaité</dt>
                <dd className={`titre text-2xl ${s?.au_dessus_du_seuil ? "text-alerte" : "text-bon"}`}>{s ? (s.au_dessus_du_seuil ? "Trop risqué" : "Supportable") : "—"}</dd>
                <dd className="text-xs text-encre-2">selon la limite de risque de l'institution</dd>
              </div>
            </dl>
          </>
        )}
      </div>

      <LienBouton href="/app/conseils" grand variante="trait" className="w-full">Voir mes conseils</LienBouton>
    </section>
  );
}
