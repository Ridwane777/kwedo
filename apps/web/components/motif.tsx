/**
 * Marque Kwedo : le cauri (ADR 0012).
 * En fon, akwɛ́ signifie à la fois « cauri » et « argent ». La marque est un K : barre et jambe à l'encre,
 * bras supérieur formé d'un cauri : coquille ovale bombée, fente fine d'une pointe à l'autre, petites dents sur
 * ses deux lèvres. Dessin original, aucun motif historique ou rituel.
 */

/** Géométrie partagée (composant, favicon, icône d'application, image Open Graph). Grille de 32. */
export const CAURI = {
  // Barre et jambe du K (encre).
  barre: "M5 6.5a2.5 2.5 0 0 1 5 0v19a2.5 2.5 0 0 1-5 0z",
  jambe: "M14.2 18.2 25 27.2",
  // Bras supérieur : coquille ovale bombée (ellipse 9,4 × 6,3) posée en diagonale, pointe arrière contre la barre.
  // Chemins calculés par scripts/geometrie-cauri.mjs.
  coquille: "M13.19 16.39A9.4 6.9 -38 1 1 28.01 4.81A9.4 6.9 -38 1 1 13.19 16.39z",
  // Fente centrale fine d'une pointe à l'autre : trait simple sous 24 px, lentille au-delà.
  fente: "M14.67 15.23L26.53 5.97",
  ouverture: "M14.67 15.23Q21.77 12.1 26.53 5.97Q19.43 9.1 14.67 15.23z",
  // Petites dents fines et serrées (13 par lèvre), creusées dans la coquille de part et d'autre de la fente,
  // symétriques : elles partent de la lèvre vers l'extérieur et ne traversent jamais la fente.
  dents: "M16.07 14.57L16.5 15.12M15.65 14.03L15.22 13.48M16.97 14.1L17.41 14.65M16.32 13.27L15.89 12.72M17.86 13.6L18.29 14.16M17.02 12.53L16.59 11.98M18.72 13.08L19.15 13.63M17.74 11.82L17.31 11.27M19.56 12.53L19.99 13.08M18.48 11.14L18.05 10.59M20.38 11.95L20.82 12.5M19.24 10.48L18.8 9.93M21.18 11.35L21.62 11.9M20.02 9.85L19.58 9.3M21.96 10.72L22.4 11.27M20.82 9.25L20.38 8.7M22.72 10.06L23.15 10.61M21.64 8.67L21.21 8.12M23.46 9.38L23.89 9.93M22.48 8.12L22.05 7.57M24.18 8.67L24.61 9.22M23.34 7.6L22.91 7.04M24.88 7.93L25.31 8.48M24.23 7.1L23.79 6.55M25.55 7.17L25.98 7.72M25.13 6.63L24.7 6.08",
  // Canaux : petites encoches rondes aux deux extrémités de la coquille, dans l'axe de la fente.
  canaux: "M26.96 4.81a1.05 1.05 0 1 0 2.1 0a1.05 1.05 0 1 0-2.1 0M12.14 16.39a1.05 1.05 0 1 0 2.1 0a1.05 1.05 0 1 0-2.1 0",
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
            ? <path d={CAURI.fente} stroke="#000" strokeWidth="1.9" strokeLinecap="round" fill="none" />
            : <><path d={CAURI.ouverture} fill="#000" /><path d={CAURI.dents} stroke="#000" strokeWidth=".38" strokeLinecap="round" /><path d={CAURI.canaux} fill="#000" /></>}
        </mask>
      </defs>
      <path d={CAURI.barre} fill={mono ? "currentColor" : "var(--logo-barre)"} />
      <path d={CAURI.jambe} stroke={mono ? "currentColor" : "var(--logo-barre)"} strokeWidth="4.6" strokeLinecap="round" fill="none" />
      <path d={CAURI.coquille} fill={mono ? "currentColor" : "var(--logo-cauri)"} mask={`url(#${id})`} />
    </svg>
  );
}

/** Marque complète : symbole + mot. */
export function Marque({ taille = 28, avecMot = true, mono = false, couleur = "text-encre" }: { taille?: number; avecMot?: boolean; mono?: boolean; inverse?: boolean; couleur?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${couleur}`} aria-label="Kwedo">
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
export function PileCauris({ part, total = 8, className = "", mono = false }: { part: number; total?: number; className?: string; mono?: boolean }) {
  const [plein, vide, fente] = mono ? ["currentColor", "currentColor", "var(--scene)"] : ["var(--logo-cauri)", "var(--trait)", "var(--fond)"];
  const pleins = Math.round(Math.max(0, Math.min(1, part)) * total);
  return (
    <svg aria-hidden="true" viewBox={`0 0 40 ${total * 10 + 6}`} className={className}>
      {Array.from({ length: total }, (_, k) => {
        // Chaque pièce est un petit cauri vu de dessous : coquille ovale, fente d'une pointe à l'autre, dents.
        const cx = 20 + (k % 2 ? 2.5 : -2.5), cy = (total - 1 - k) * 10 + 8;
        const estPlein = k < pleins;
        return (
          <g key={k} className={estPlein ? "cauri-empile" : ""} style={{ animationDelay: `${k * 90}ms` }}>
            <ellipse cx={cx} cy={cy} rx="10" ry="4.6" fill={estPlein ? plein : "none"} stroke={estPlein ? "none" : vide} strokeOpacity={mono ? 0.35 : 1} />
            {estPlein && <>
              <path d={`M${cx - 8} ${cy}Q${cx} ${cy + 1.6} ${cx + 8} ${cy}Q${cx} ${cy - 1.6} ${cx - 8} ${cy}z`} fill={fente} />
              <path d={[-5, -2.5, 0, 2.5, 5].map((dx) => `M${cx + dx} ${cy - 0.75}v.5M${cx + dx + 1.25} ${cy + 0.75}v-.5`).join("")} stroke={plein} strokeWidth=".5" />
            </>}
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
