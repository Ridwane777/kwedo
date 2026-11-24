"use client";

import { useId, useMemo, useState } from "react";
import { CourbeFlux } from "@/components/courbe-flux";
import { Simule } from "@/components/ui";
import { fcfa } from "@/lib/format";

// Exemple : forme d'une année d'encaissements (simulée), mise à l'échelle par le curseur « ventes ».
const FORME = [0.82, 0.9, 0.78, 1.02, 0.95, 0.88, 1.08, 1.15, 0.98, 0.93, 0.87, 1.04, 1.12, 1.22, 1.06, 0.99, 0.92, 1.03, 1.25, 1.34, 1.13, 1.06, 1.01, 1.09, 1.14, 0.97];
// Réglages d'exemple, ceux de l'institution fictive de la démo : part de marge m, part prélevable s, durée n, taux i.
const M = 0.3, S = 0.4, N = 26, I = 0.0035;

const percentile = (v: number[], p: number) => { const t = [...v].sort((a, b) => a - b); const k = (t.length - 1) * p; const b = Math.floor(k); return t[b]! + (t[Math.ceil(k)]! - t[b]!) * (k - b); };

/**
 * Simulateur de la page d'accueil : formule simplifiée du plafond, sans les 2 000 scénarios ni les contrôles.
 * Chiffres d'exemple, étiquetés comme tels ; le vrai calcul est fait par le moteur dans l'application.
 */
export function SimulateurVitrine() {
  const [ventes, setVentes] = useState(250_000);
  const [baisse, setBaisse] = useState(0);
  const idV = useId(), idB = useId();
  const r = useMemo(() => {
    const serie = FORME.map((f) => f * ventes);
    const prudentBase = percentile(serie, 0.2); // la courbe applique elle-même la baisse
    const echeance = prudentBase * (1 - baisse / 100) * M * S;
    const plafond = Math.floor((echeance * (1 - (1 + I) ** -N)) / I / 5000) * 5000;
    return { serie, prudent: prudentBase, echeance, plafond, median: percentile(serie, 0.5) };
  }, [ventes, baisse]);

  return (
    <div className="grid gap-6 rounded-3xl border border-trait bg-surface p-5 sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2"><Simule quoi="Exemple, formule simplifiée" /></div>
        <label htmlFor={idV} className="block">
          <span className="flex items-baseline justify-between gap-3"><span className="font-semibold">Ventes d'une semaine habituelle</span><output htmlFor={idV} className="chiffres font-semibold">{fcfa(ventes)}</output></span>
          <input id={idV} type="range" min={50_000} max={800_000} step={10_000} value={ventes} onChange={(e) => setVentes(Number(e.target.value))}
            className="mt-3 h-12 w-full accent-[var(--marque)]" />
        </label>
        <label htmlFor={idB} className="block">
          <span className="flex items-baseline justify-between gap-3"><span className="font-semibold">Et si mes ventes baissaient de</span><output htmlFor={idB} className="chiffres font-semibold">{baisse} %</output></span>
          <input id={idB} type="range" min={0} max={50} step={5} value={baisse} onChange={(e) => setBaisse(Number(e.target.value))}
            className="mt-3 h-12 w-full accent-[var(--alerte)]" />
        </label>
        <div aria-live="polite" className="rounded-2xl bg-fond p-4">
          <p className="text-encre-2">Plafond d'exemple</p>
          <p className="montant text-[clamp(2.2rem,5vw,3.4rem)] leading-none text-montant">{fcfa(r.plafond)}</p>
          <p className="mt-2 text-encre-2" data-testid="plafond-conditions">Jusqu'à {fcfa(r.plafond)}, remboursés chaque semaine pendant {N} semaines (6 mois), soit {fcfa(r.echeance)} par semaine, aux conditions d'une institution d'exemple. Ce n'est pas un crédit accordé : l'institution décide.</p>
        </div>
        <p className="max-w-[60ch] text-sm text-encre-2">
          Calcul simplifié : une mauvaise semaine (20ᵉ centile) × part de marge {String(M).replace(".", ",")} × part prélevable {String(S).replace(".", ",")}, sur {N} semaines au taux de 0,35 % par semaine.
          Le moteur de l'application y ajoute 2 000 scénarios de ventes et des contrôles de cohérence.
        </p>
      </div>
      <div className="min-w-0 self-center">
        <CourbeFlux serie={r.serie} prudent={r.prudent} median={r.median} choc={-baisse / 100} debut="2026-05-25" />
      </div>
    </div>
  );
}
