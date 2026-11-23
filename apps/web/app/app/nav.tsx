"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Marque } from "@/components/motif";
import { Simule } from "@/components/ui";

const LIENS = [
  { href: "/app", label: "Estimation", icone: "M4 18l5-6 4 3 7-9" },
  { href: "/app/simulateur", label: "Simuler", icone: "M4 12h16M12 4v16" },
  { href: "/app/dossier", label: "Dossier", icone: "M6 3h9l3 3v15H6zM9 12h6M9 16h6" },
  { href: "/app/credit", label: "Crédit", icone: "M3 7h18v10H3zM3 11h18" },
  { href: "/app/activite", label: "Activité", icone: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
];

export function EnteteCommercant() {
  return (
    <header className="flex items-center justify-between px-5 pb-3 pt-4">
      <Link href="/app" aria-label="Accueil Kwedo"><Marque taille={26} /></Link>
      <Simule quoi="Démo simulée" />
    </header>
  );
}

export function NavCommercant() {
  const chemin = usePathname();
  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-10 border-t border-trait bg-papier/95 backdrop-blur">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {LIENS.map((l) => {
          const actif = l.href === "/app" ? chemin === "/app" : chemin.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link href={l.href} aria-current={actif ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${actif ? "text-indigo" : "text-encre-2"}`}>
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={actif ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round"><path d={l.icone} /></svg>
                {l.label}
                {actif && <span className="h-0.5 w-6 rounded bg-safran" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
