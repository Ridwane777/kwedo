"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Étiquette obligatoire sur tout ce qui est simulé : visible, mais discrète. */
export function Simule({ quoi = "Données simulées", className = "" }: { quoi?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-trait bg-surface px-2.5 py-0.5 text-xs text-encre-2 ${className}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ambre" />
      {quoi}
    </span>
  );
}

type Variante = "plein" | "trait" | "discret" | "danger";
const STYLES: Record<Variante, string> = {
  plein: "bg-marque text-fond shadow-carte hover:brightness-110 active:translate-y-px",
  trait: "border border-trait bg-surface text-encre hover:border-encre-3 active:translate-y-px",
  discret: "text-marque underline-offset-4 hover:underline",
  danger: "border border-alerte bg-surface text-alerte hover:bg-alerte-doux",
};
const BASE = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

export function Bouton({ variante = "plein", grand = false, className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; grand?: boolean }) {
  return <button {...p} className={`${BASE} ${grand ? "min-h-14 px-6 text-[17px]" : "min-h-11 px-4 text-sm"} ${STYLES[variante]} ${className}`} />;
}

export function LienBouton({ href, children, variante = "plein", grand = false, className = "" }: { href: string; children: ReactNode; variante?: Variante; grand?: boolean; className?: string }) {
  return (
    <Link href={href} className={`${BASE} ${grand ? "min-h-14 px-6 text-[17px]" : "min-h-11 px-4 text-sm"} ${STYLES[variante]} ${className}`}>
      {children}
    </Link>
  );
}

export function Chargement({ lignes = 3, label = "Chargement" }: { lignes?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3 py-2">
      {Array.from({ length: lignes }, (_, k) => <div key={k} className="chargement h-5" style={{ width: `${92 - k * 13}%` }} />)}
      <span className="sr-only">{label}…</span>
    </div>
  );
}

export function Erreur({ message, reessayer }: { message: string; reessayer?: () => void }) {
  const reseau = message.toLowerCase().includes("fetch") || message.includes("réseau");
  return (
    <div role="alert" className="flex gap-3 rounded-2xl border border-alerte/40 bg-alerte-doux p-4 text-sm text-encre">
      <svg aria-hidden="true" className="mt-0.5 shrink-0 text-alerte" width="18" height="18" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M10 5.5v5.5M10 13.5v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      <div>
        <p className="font-semibold">{reseau ? "Le service Kwedo ne répond pas." : "L'opération n'a pas abouti."}</p>
        <p className="mt-1 text-encre-2">{message}</p>
        {reseau && <p className="mt-1 text-encre-2">Vérifiez que le serveur Kwedo tourne (127.0.0.1:3460), puis réessayez.</p>}
        {reessayer && <Bouton variante="danger" className="mt-3" onClick={reessayer}>Réessayer</Bouton>}
      </div>
    </div>
  );
}

export function Vide({ titre, children }: { titre: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-trait bg-surface/60 px-6 py-10 text-center">
      <svg aria-hidden="true" className="mx-auto mb-3 text-encre-3" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 7h16v12H4zM4 7l2-3h12l2 3M9 11h6" strokeLinejoin="round" /></svg>
      <p className="titre text-lg">{titre}</p>
      {children && <div className="mx-auto mt-1.5 max-w-sm text-sm text-encre-2">{children}</div>}
    </div>
  );
}

const TONS = {
  neutre: "bg-surface-2 text-encre-2",
  bon: "bg-bon-doux text-bon",
  attention: "bg-ambre-doux text-ambre-encre",
  alerte: "bg-alerte-doux text-alerte",
  info: "bg-marque-doux text-marque",
};
const POINTS = { neutre: "bg-encre-3", bon: "bg-bon", attention: "bg-ambre", alerte: "bg-alerte", info: "bg-marque" };
export function Pastille({ ton = "neutre", children }: { ton?: keyof typeof TONS; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONS[ton]}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${POINTS[ton]}`} />
      {children}
    </span>
  );
}
