"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fcfa } from "@/lib/format";

type Props = {
  serie: number[];          // encaissements vérifiés par semaine
  prudent: number;          // C_p, avant choc
  median: number;
  choc?: number;            // 0 à -0.9 : « mes ventes baissent de X % »
  debut?: string | null;    // lundi de la première semaine
  hauteur?: number;
  dense?: boolean;          // version console : axes chiffrés, sans légende grand format
  titre?: string;
};

const L = 640;

function lisse(points: [number, number][]): string {
  if (points.length < 2) return "";
  let d = `M${points[0]![0].toFixed(1)},${points[0]![1].toFixed(1)}`;
  for (let k = 0; k < points.length - 1; k++) {
    const p0 = points[Math.max(0, k - 1)]!, p1 = points[k]!, p2 = points[k + 1]!, p3 = points[Math.min(points.length - 1, k + 2)]!;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/**
 * La courbe d'encaissements : signature de Kwedo. Elle se trace à l'arrivée, montre la bande prudente
 * (entre le niveau prudent et le niveau habituel) et réagit en direct au curseur de baisse des ventes.
 */
export function CourbeFlux({ serie, prudent, median, choc = 0, debut, hauteur = 220, dense = false, titre }: Props) {
  const id = useId().replace(/:/g, "");
  const ref = useRef<SVGPathElement>(null);
  const [longueur, setLongueur] = useState(2000);
  const H = hauteur;
  const haut = 14, bas = dense ? 22 : 26, droite = dense ? 64 : 8;
  const max = useMemo(() => Math.max(1, ...serie) * 1.08, [serie]);
  const x = (k: number) => (serie.length <= 1 ? 0 : (k / (serie.length - 1)) * (L - droite));
  const y = (v: number) => haut + (1 - v / max) * (H - haut - bas);
  const f = 1 + choc;
  const pts = serie.map((v, k) => [x(k), y(v * f)] as [number, number]);
  const ptsBase = serie.map((v, k) => [x(k), y(v)] as [number, number]);
  const d = lisse(pts);
  const aire = d ? `${d} L${x(serie.length - 1)},${H - bas} L0,${H - bas} Z` : "";

  useLayoutEffect(() => {
    if (ref.current) setLongueur(Math.ceil(ref.current.getTotalLength()));
  }, [serie.length]);
  const [trace, setTrace] = useState(false);
  useEffect(() => { setTrace(true); }, []);

  const mois = useMemo(() => {
    if (!debut) return [];
    const d0 = new Date(`${debut}T12:00:00`);
    const out: { k: number; label: string }[] = [];
    let dernier = -1;
    serie.forEach((_, k) => {
      const d = new Date(d0.getTime() + k * 7 * 864e5);
      if (d.getMonth() !== dernier && d.getDate() <= 7) {
        dernier = d.getMonth();
        out.push({ k, label: d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "") });
      }
    });
    return out;
  }, [debut, serie]);

  if (!serie.length) {
    return <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-trait text-sm text-encre-2">Pas encore d'encaissements vérifiés.</div>;
  }

  const yP = y(prudent * f), yM = y(median * f);
  const resume = `${titre ?? "Encaissements vérifiés par semaine"} sur ${serie.length} semaines. Niveau prudent ${fcfa(prudent * f)}, niveau habituel ${fcfa(median * f)} par semaine${choc ? `, avec une baisse simulée de ${Math.round(-choc * 100)} %` : ""}.`;

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${L} ${H}`} className="block h-auto w-full overflow-visible" role="img" aria-label={resume}>
        <defs>
          <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--indigo)" stopOpacity=".16" />
            <stop offset="1" stopColor="var(--indigo)" stopOpacity="0" />
          </linearGradient>
          <pattern id={`h${id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0v6" stroke="var(--feuille)" strokeWidth="1.4" opacity=".35" />
          </pattern>
        </defs>
        {/* Bande prudente : ce sur quoi on peut compter, même une mauvaise semaine. */}
        <rect x="0" width={L - droite} y={Math.min(yM, yP)} height={Math.abs(yP - yM)} fill={`url(#h${id})`} style={{ transition: "all .35s ease" }} />
        <line x1="0" x2={L - droite} y1={yP} y2={yP} stroke="var(--feuille)" strokeWidth="1.5" style={{ transition: "all .35s ease" }} />
        <line x1="0" x2={L - droite} y1={yM} y2={yM} stroke="var(--encre-3)" strokeWidth="1" strokeDasharray="3 4" style={{ transition: "all .35s ease" }} />
        {choc !== 0 && <path d={lisse(ptsBase)} fill="none" stroke="var(--encre-3)" strokeWidth="1.2" strokeDasharray="2 4" opacity=".7" />}
        <path d={aire} fill={`url(#g${id})`} style={{ transition: "d .35s ease" }} />
        <path
          ref={ref}
          d={d}
          fill="none"
          stroke="var(--indigo)"
          strokeWidth={dense ? 1.8 : 2.4}
          strokeLinejoin="round"
          className={trace ? "trace" : ""}
          style={{ ["--longueur" as string]: longueur, transition: "d .35s ease" }}
        />
        <circle cx={pts[pts.length - 1]![0]} cy={pts[pts.length - 1]![1]} r="4" fill="var(--safran)" stroke="var(--papier)" strokeWidth="2" style={{ transition: "all .35s ease" }} />
        {mois.map((m) => (
          <text key={m.k} x={x(m.k)} y={H - 6} fontSize="11" fill="var(--encre-2)">{m.label}</text>
        ))}
        {dense && (
          <>
            <text x={L - droite + 6} y={yP + 4} fontSize="11" fill="var(--feuille)" className="chiffres">{Math.round((prudent * f) / 1000)} k</text>
            <text x={L - droite + 6} y={yM + 4} fontSize="11" fill="var(--encre-2)" className="chiffres">{Math.round((median * f) / 1000)} k</text>
          </>
        )}
      </svg>
      {!dense && (
        <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-encre-2">
          <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-indigo" />Vos encaissements vérifiés, par semaine</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-feuille" />Niveau prudent : {fcfa(prudent * f)}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-0 w-4 border-t border-dashed border-encre-3" />Niveau habituel : {fcfa(median * f)}</span>
        </figcaption>
      )}
    </figure>
  );
}
