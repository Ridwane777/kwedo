"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Marque } from "@/components/motif";
import { Simule } from "@/components/ui";
import { deconnecter, GardePro, ROLES, type Utilisateur } from "@/lib/session";

const LIENS = [
  { href: "/console", label: "File de dossiers", touche: "1", icone: "M4 6h16M4 12h16M4 18h10" },
  { href: "/console/portefeuille", label: "Portefeuille", touche: "2", icone: "M3 7h18v12H3zM3 11h18M8 7V5h8v2" },
  { href: "/console/parametres", label: "Paramètres du moteur", touche: "3", icone: "M5 6h14M5 12h14M5 18h14M9 4v4M15 10v4M11 16v4" },
  { href: "/console/journal", label: "Journal d'audit", touche: "4", icone: "M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h4" },
];

export function CadreConsole({ children }: { children: React.ReactNode }) {
  return (
    <GardePro roles={["agent", "responsable"]}>
      {(u) => (
        <div className="min-h-dvh text-[14px] md:flex">
          <NavConsole u={u} />
          <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-7">{children}</main>
        </div>
      )}
    </GardePro>
  );
}

/** Barre latérale sur grand écran ; sur téléphone, en-tête compact et onglets défilants. */
function NavConsole({ u }: { u: Utilisateur }) {
  const chemin = usePathname();
  return (
    // Le fond et le filet sont portés par la colonne (pleine hauteur de la page) ; seul le contenu reste collé en haut.
    <div className="border-b border-trait bg-surface md:w-64 md:shrink-0 md:self-stretch md:border-b-0 md:border-r">
    <nav aria-label="Console" className="px-4 pt-3 md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:gap-1 md:p-4">
      <div className="flex items-start justify-between gap-3 md:block">
        <div className="min-w-0">
          <Link href="/console" className="mb-3 inline-block"><Marque taille={26} /></Link>
          <div className="mb-3 rounded-xl md:mb-5 md:bg-fond md:p-3">
            <p className="font-semibold leading-snug">{u.institution}</p>
            <p className="text-xs text-encre-2">{ROLES[u.role]} · {u.login}</p>
          </div>
        </div>
        <button onClick={() => void deconnecter("pro")} className="min-h-11 shrink-0 rounded-xl border border-trait px-3 text-left text-sm font-medium hover:bg-surface-2 md:hidden">Changer de profil</button>
      </div>
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-col md:overflow-visible md:px-0 md:pb-0">
        {LIENS.map((l) => {
          const actif = l.href === "/console" ? chemin === "/console" || chemin.startsWith("/console/dossiers") : chemin.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} aria-current={actif ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 font-medium ${actif ? "bg-marque-doux text-marque" : "text-encre-2 hover:bg-surface-2 hover:text-encre"}`}>
              <svg aria-hidden="true" className="hidden shrink-0 md:block" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={l.icone} /></svg>
              <span className="min-w-0 flex-1 md:whitespace-normal">{l.label}</span>
              <kbd title={`Raccourci clavier : ${l.touche}`} className="hidden shrink-0 rounded border border-trait px-1.5 text-[11px] font-normal text-encre-2 md:inline">{l.touche}</kbd>
            </Link>
          );
        })}
      </div>
      <div className="mt-auto hidden space-y-3 md:block">
        <Simule quoi="Données simulées" />
        <p className="text-xs leading-snug text-encre-2">Personnes et institutions fictives. Aucun score n'est une performance réelle.</p>
        <button onClick={() => void deconnecter("pro")} className="min-h-11 w-full rounded-xl border border-trait px-3 text-left font-medium hover:bg-surface-2">Changer de profil</button>
      </div>
    </nav>
    </div>
  );
}
