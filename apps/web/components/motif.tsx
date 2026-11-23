/**
 * Marque Kwedo : le cauri (ADR 0012).
 * En fon, akwɛ́ signifie à la fois « cauri » et « argent ». La marque est un K : barre et jambe à l'encre,
 * bras supérieur formé d'un cauri en amande avec sa fente dentée. Dessin original, aucun motif historique ou rituel.
 */

/** Géométrie partagée (composant, favicon, icône d'application, image Open Graph). Grille de 32. */
export const CAURI = {
  // Barre et jambe du K (encre).
  barre: "M5 6.5a2.5 2.5 0 0 1 5 0v19a2.5 2.5 0 0 1-5 0z",
  jambe: "M14.2 18.2 25 27.2",
  // Bras supérieur : un cauri en amande posé en diagonale, pointe contre la barre.
  coquille: "M12.5 16.5C20.67 21.26 31.15 13.08 28.5 4 20.33-.76 9.85 7.42 12.5 16.5z",
  // Ouverture du cauri dans l'axe de la coquille, évidée : trait aux petites tailles, lentille au-delà,
  // traversée de dents (ponts de coquille) qui restent à l'intérieur de l'ouverture.
  fente: "M16 13.7 25.6 6.3",
  ouverture: "M14.2 15.1C19.52 12.88 23.92 9.48 27.4 4.9 22.08 7.12 17.68 10.52 14.2 15.1z",
  dents: "M16.24 12.29 17.44 13.83M18.22 10.76 19.42 12.3M20.2 9.23 21.4 10.77M22.18 7.7 23.38 9.24M24.16 6.17 25.36 7.71",
} as const;

/** Les trois pistes étudiées (documentées dans l'ADR 0012 et sur /design). */
export const PISTES = [
  { id: "k-cauri", titre: "Cauri-K", retenue: true,
    dessin: <><path d={CAURI.barre} /><path d={CAURI.jambe} stroke="currentColor" strokeWidth="4.6" strokeLinecap="round" /><path d={CAURI.coquille} /></> },
  { id: "deux-cauris", titre: "Deux demi-cauris", retenue: false,
    dessin: <><path d={CAURI.barre} /><path d="M12 15.5 26 4.5c2 3.6.4 8.6-4 11z" /><path d="M12 16.5 26 27.5c2-3.6.4-8.6-4-11z" /></> },
  { id: "cauri-pointe", titre: "Cauri en pointe", retenue: false,
    dessin: <><path d={CAURI.barre} /><path d="M11.5 16C14.5 9.6 19.2 5 24.6 5 28.6 5 30 9.8 30 16s-1.4 11-5.4 11C19.2 27 14.5 22.4 11.5 16z" /></> },
] as const;

/** Symbole seul. `mono` : une seule couleur (currentColor), pour les petits formats et l'impression. */
export function Cauri({ taille = 28, mono = false, className = "" }: { taille?: number; mono?: boolean; className?: string }) {
  const id = `fente-${taille}-${mono ? "m" : "c"}`;
  return (
    <svg aria-hidden="true" width={taille} height={taille} viewBox="0 0 32 32" className={className}>
      <defs>
        <mask id={id}>
          <rect width="32" height="32" fill="#fff" />
          {taille < 24
            ? <path d={CAURI.fente} stroke="#000" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            : <><path d={CAURI.ouverture} fill="#000" /><path d={CAURI.dents} stroke="#fff" strokeWidth=".75" strokeLinecap="round" /></>}
        </mask>
      </defs>
      <path d={CAURI.barre} fill={mono ? "currentColor" : "var(--logo-barre)"} />
      <path d={CAURI.jambe} stroke={mono ? "currentColor" : "var(--logo-barre)"} strokeWidth="4.6" strokeLinecap="round" fill="none" />
      <path d={CAURI.coquille} fill={mono ? "currentColor" : "var(--logo-cauri)"} mask={`url(#${id})`} />
    </svg>
  );
}

/** Marque complète : symbole + mot. */
export function Marque({ taille = 28, avecMot = true, mono = false }: { taille?: number; avecMot?: boolean; mono?: boolean; inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-encre" aria-label="Kwedo">
      <Cauri taille={taille} mono={mono} />
      {avecMot && <span className="titre text-[1.4rem] leading-none tracking-tight">Kwedo</span>}
    </span>
  );
}

/** Filet de séparation (nom historique conservé pour les écrans qui l'importent). */
export function Lisiere({ className = "" }: { className?: string; hauteur?: number }) {
  return <div aria-hidden="true" className={`h-px w-full bg-trait ${className}`} />;
}

/**
 * Pile de cauris : un cauri par part remboursée, qui s'empile de bas en haut.
 * `part` entre 0 et 1 ; animation d'empilement en CSS (transform + opacity), coupée sous prefers-reduced-motion.
 */
export function PileCauris({ part, total = 8, className = "" }: { part: number; total?: number; className?: string }) {
  const pleins = Math.round(Math.max(0, Math.min(1, part)) * total);
  return (
    <svg aria-hidden="true" viewBox={`0 0 40 ${total * 9 + 6}`} className={className}>
      {Array.from({ length: total }, (_, k) => {
        const y = (total - 1 - k) * 9 + 3;
        const plein = k < pleins;
        return (
          <g key={k} className={plein ? "cauri-empile" : ""} style={{ animationDelay: `${k * 90}ms` }}>
            <ellipse cx={20 + (k % 2 ? 3 : -3)} cy={y + 4} rx="11" ry="4" fill={plein ? "var(--logo-cauri)" : "none"} stroke={plein ? "none" : "var(--trait)"} />
            {plein && <path d={`M${12 + (k % 2 ? 3 : -3)} ${y + 4}h16`} stroke="var(--fond)" strokeWidth="1" strokeLinecap="round" />}
          </g>
        );
      })}
    </svg>
  );
}

/** Indicateur de chargement : un cauri qui pivote doucement (fixe sous prefers-reduced-motion). */
export function CauriChargement({ taille = 28 }: { taille?: number }) {
  return <span className="inline-block animate-[cauri-tourne_1.6s_ease-in-out_infinite]"><Cauri taille={taille} /></span>;
}
