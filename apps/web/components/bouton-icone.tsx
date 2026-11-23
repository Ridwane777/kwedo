"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

/** Taille et trait uniques pour toutes les icônes de l'interface. */
export const ICONE = { size: 20, strokeWidth: 1.75 } as const;

type Commun = {
  icone: LucideIcon; label: string; infobulle?: "haut" | "bas"; className?: string; actif?: boolean;
  /** Bord du bouton sur lequel l'infobulle s'aligne : « droite » (défaut) pour les boutons en bout de ligne, « gauche » en début. */
  ancre?: "gauche" | "droite";
};
const CLASSES = (actif?: boolean) =>
  `group/bi relative inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl transition sm:min-h-11 sm:min-w-11 disabled:cursor-not-allowed disabled:opacity-50 ${
    actif ? "bg-marque-doux text-marque" : "text-encre-2 hover:bg-surface-2 hover:text-encre"}`;

/** Infobulle visible au survol et au focus clavier ; le nom accessible reste l'aria-label. */
// Hors survol et focus, l'infobulle est retirée de la mise en page (display: none) : elle ne peut pas élargir la page.
function Infobulle({ texte, cote = "bas", ancre = "droite" }: { texte: string; cote?: "haut" | "bas"; ancre?: "gauche" | "droite" }) {
  return (
    <span aria-hidden="true"
      className={`pointer-events-none absolute z-50 hidden w-max max-w-[16rem] rounded-lg bg-encre px-2 py-1 text-left text-xs font-medium text-fond shadow-carte group-hover/bi:block group-focus-visible/bi:block ${ancre === "droite" ? "right-0" : "left-0"} ${cote === "bas" ? "top-full mt-1.5" : "bottom-full mb-1.5"}`}>
      {texte}
    </span>
  );
}

/** Bouton à icône seule : actions courantes et secondaires (retour, filtrer, exporter, réinitialiser…). */
export const BoutonIcone = forwardRef<HTMLButtonElement, Commun & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">>(
  function BoutonIcone({ icone: Icone, label, infobulle = "bas", ancre, className = "", actif, ...p }, ref) {
    return (
      <button ref={ref} type="button" aria-label={label} {...p} className={`${CLASSES(actif)} ${className}`}>
        <Icone aria-hidden="true" {...ICONE} />
        <Infobulle texte={label} cote={infobulle} ancre={ancre} />
      </button>
    );
  },
);

/** Lien à icône seule (ex. retour à la file). */
export function LienIcone({ href, icone: Icone, label, infobulle = "bas", ancre, className = "", actif }: Commun & { href: string }) {
  return (
    <Link href={href} aria-label={label} className={`${CLASSES(actif)} ${className}`}>
      <Icone aria-hidden="true" {...ICONE} />
      <Infobulle texte={label} cote={infobulle} ancre={ancre} />
    </Link>
  );
}

/** Icône + libellé court, pour les actions engageantes (payer, accepter, enregistrer…). */
export function AvecIcone({ icone: Icone, children }: { icone: LucideIcon; children: ReactNode }) {
  return <><Icone aria-hidden="true" {...ICONE} className="shrink-0" />{children}</>;
}
