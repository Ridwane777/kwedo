"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Marque } from "@/components/motif";
import { Simule } from "@/components/ui";

const LIENS = [
  { href: "/console", label: "File de dossiers", touche: "1" },
  { href: "/console/portefeuille", label: "Portefeuille", touche: "2" },
  { href: "/console/parametres", label: "Paramètres du moteur", touche: "3" },
  { href: "/console/journal", label: "Journal d'audit", touche: "4" },
];

export function NavConsole() {
  const chemin = usePathname();
  return (
    <nav aria-label="Console" className="sticky top-0 flex h-dvh w-56 shrink-0 flex-col gap-1 border-r border-trait bg-papier-2 p-4">
      <Link href="/console" className="mb-1"><Marque taille={24} /></Link>
      <p className="mb-4 text-xs text-encre-2">Caisse Lagune Microfinance (fictive) · agent.demo</p>
      {LIENS.map((l) => {
        const actif = l.href === "/console" ? chemin === "/console" || chemin.startsWith("/console/dossiers") : chemin.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={actif ? "page" : undefined}
            className={`flex items-center justify-between rounded-lg px-3 py-2 ${actif ? "bg-indigo text-papier" : "text-encre hover:bg-papier-3"}`}>
            {l.label}
            <kbd className={`rounded border px-1 text-[11px] ${actif ? "border-papier/40" : "border-trait text-encre-2"}`}>{l.touche}</kbd>
          </Link>
        );
      })}
      <div className="mt-auto space-y-2">
        <Simule quoi="Données simulées" />
        <p className="text-[11px] leading-snug text-encre-2">Personnes et institutions fictives. Aucun score n'est une performance réelle.</p>
      </div>
    </nav>
  );
}
