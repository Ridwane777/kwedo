"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Étiquette obligatoire sur tout ce qui est simulé. */
export function Simule({ quoi = "Données simulées", className = "" }: { quoi?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-dashed border-safran bg-safran-doux px-2.5 py-0.5 text-xs font-medium text-safran-encre ${className}`}>
      <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10"><path d="M5 0l5 5-5 5-5-5z" fill="currentColor" /></svg>
      {quoi}
    </span>
  );
}

type Variante = "plein" | "trait" | "discret" | "danger";
const STYLES: Record<Variante, string> = {
  plein: "bg-indigo text-papier hover:opacity-90",
  trait: "border border-indigo text-indigo hover:bg-indigo-doux",
  discret: "text-indigo underline-offset-4 hover:underline",
  danger: "border border-terre text-terre hover:bg-terre-doux",
};

export function Bouton({ variante = "plein", grand = false, className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; grand?: boolean }) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${grand ? "min-h-14 px-6 text-lg" : "min-h-10 px-4 text-sm"} ${STYLES[variante]} ${className}`}
    />
  );
}

export function LienBouton({ href, children, variante = "plein", grand = false, className = "" }: { href: string; children: ReactNode; variante?: Variante; grand?: boolean; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition ${grand ? "min-h-14 px-6 text-lg" : "min-h-10 px-4 text-sm"} ${STYLES[variante]} ${className}`}>
      {children}
    </Link>
  );
}

export function Chargement({ lignes = 3, label = "Chargement" }: { lignes?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3 py-2">
      {Array.from({ length: lignes }, (_, k) => <div key={k} className="chargement h-5" style={{ width: `${90 - k * 17}%` }} />)}
      <span className="sr-only">{label}…</span>
    </div>
  );
}

export function Erreur({ message, reessayer }: { message: string; reessayer?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-terre bg-terre-doux p-4 text-sm text-encre">
      <p className="font-medium text-terre">Quelque chose n'a pas fonctionné.</p>
      <p className="mt-1">{message}</p>
      {message.toLowerCase().includes("fetch") || message.includes("réseau") ? (
        <p className="mt-1 text-encre-2">Le serveur Kwedo est peut-être arrêté (127.0.0.1:3460).</p>
      ) : null}
      {reessayer && <Bouton variante="danger" className="mt-3" onClick={reessayer}>Réessayer</Bouton>}
    </div>
  );
}

export function Vide({ titre, children }: { titre: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-trait p-6 text-center">
      <p className="titre text-lg">{titre}</p>
      {children && <div className="mt-2 text-sm text-encre-2">{children}</div>}
    </div>
  );
}

const TONS = {
  neutre: "bg-papier-2 text-encre-2",
  bon: "bg-feuille-doux text-feuille",
  attention: "bg-safran-doux text-safran-encre",
  alerte: "bg-terre-doux text-terre",
  info: "bg-indigo-doux text-indigo",
};
export function Pastille({ ton = "neutre", children }: { ton?: keyof typeof TONS; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${TONS[ton]}`}>{children}</span>;
}
