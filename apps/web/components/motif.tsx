/**
 * Filet : fine règle de séparation. L'ancien motif tissé « Lisière » est retiré (ADR 0010) ;
 * le composant garde son nom pour ne pas toucher aux écrans qui l'importent.
 */
export function Lisiere({ className = "" }: { className?: string; hauteur?: number }) {
  return <div aria-hidden="true" className={`h-px w-full bg-trait ${className}`} />;
}

/**
 * Marque Kwedo : un « K » fait d'une barre et de deux traits de flux, dessiné pour le projet.
 * Elle ne reprend aucun logo existant.
 */
export function Marque({ taille = 28, avecMot = true, inverse = false }: { taille?: number; avecMot?: boolean; inverse?: boolean }) {
  const [plein, creux] = inverse ? ["var(--fond)", "var(--marque)"] : ["var(--marque)", "var(--fond)"];
  return (
    <span className={`inline-flex items-center gap-2 ${inverse ? "text-fond" : "text-encre"}`} aria-label="Kwedo">
      <svg aria-hidden="true" width={taille} height={taille} viewBox="0 0 32 32">
        <rect width="32" height="32" rx="9" fill={plein} />
        <rect x="8" y="7" width="4.5" height="18" rx="1.5" fill={creux} />
        <path d="M15.5 17l7-9" stroke={creux} strokeWidth="4.5" strokeLinecap="round" />
        <path d="M17 17.5l6 7" stroke={creux} strokeWidth="4.5" strokeLinecap="round" opacity=".7" />
      </svg>
      {avecMot && <span className="titre text-[1.35rem] leading-none">Kwedo</span>}
    </span>
  );
}
