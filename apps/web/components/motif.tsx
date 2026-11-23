/**
 * Lisière : motif géométrique original (losanges à gradins et peignes), inspiré des bordures tissées
 * d'Afrique de l'Ouest sans reprendre un motif existant. Utilisé en fine bande, jamais en fond plein.
 */
export function Lisiere({ className = "", hauteur = 14 }: { className?: string; hauteur?: number }) {
  const id = "lisiere";
  return (
    <svg aria-hidden="true" className={className} width="100%" height={hauteur} preserveAspectRatio="none">
      <defs>
        <pattern id={id} width="28" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 13h28" stroke="var(--indigo)" strokeWidth="1" opacity=".55" />
          <path d="M7 2l5 5-5 5-5-5z" fill="none" stroke="var(--indigo)" strokeWidth="1.2" />
          <path d="M7 5l2 2-2 2-2-2z" fill="var(--terre)" />
          <path d="M17 12V8h2V5h2v3h2v4" fill="none" stroke="var(--indigo)" strokeWidth="1" opacity=".8" />
          <circle cx="21" cy="2.5" r="1" fill="var(--safran)" />
        </pattern>
      </defs>
      <rect width="100%" height={hauteur} fill={`url(#${id})`} />
    </svg>
  );
}

/** Marque Kwedo : un losange tissé + le mot, dessinés pour le projet. */
export function Marque({ taille = 28, avecMot = true }: { taille?: number; avecMot?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label="Kwedo">
      <svg aria-hidden="true" width={taille} height={taille} viewBox="0 0 32 32">
        <path d="M16 2l14 14-14 14L2 16z" fill="var(--indigo)" />
        <path d="M16 8l8 8-8 8-8-8z" fill="none" stroke="var(--papier)" strokeWidth="2" />
        <path d="M6 20c4-1 6-6 10-6s6 3 10 2" fill="none" stroke="var(--safran)" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      {avecMot && <span className="titre text-xl font-semibold tracking-tight">Kwedo</span>}
    </span>
  );
}
