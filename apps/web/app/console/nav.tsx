"use client";

import { ClipboardList, Inbox, ScrollText, SlidersHorizontal, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ICONE } from "@/components/bouton-icone";
import { Marque } from "@/components/motif";
import { Simule } from "@/components/ui";
import { UserButton } from "@/components/user-button";
import { GardePro, ROLES, type Utilisateur } from "@/lib/session";

const LIENS: { href: string; label: string; touche: string; icone: LucideIcon }[] = [
  { href: "/console", label: "File de dossiers", touche: "1", icone: Inbox },
  { href: "/console/portefeuille", label: "Portefeuille", touche: "2", icone: ClipboardList },
  { href: "/console/parametres", label: "Paramètres du moteur", touche: "3", icone: SlidersHorizontal },
  { href: "/console/journal", label: "Journal d'audit", touche: "4", icone: ScrollText },
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
    <div className="relative z-20 border-b border-trait bg-surface md:w-64 md:shrink-0 md:self-stretch md:border-b-0 md:border-r">
    <nav aria-label="Console" className="px-4 pt-3 md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:gap-1 md:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link href="/console"><Marque taille={26} /></Link>
        <UserButton u={u} espace="pro" ancrage="right-0 md:left-0 md:right-auto" />
      </div>
      <div className="mb-3 rounded-xl md:mb-5 md:bg-fond md:p-3">
        <p className="font-semibold leading-snug">{u.institution}</p>
        <p className="text-xs text-encre-2">{ROLES[u.role]}, {u.login}</p>
      </div>
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-col md:overflow-visible md:px-0 md:pb-0">
        {LIENS.map((l) => {
          const actif = l.href === "/console" ? chemin === "/console" || chemin.startsWith("/console/dossiers") : chemin.startsWith(l.href);
          const Icone = l.icone;
          return (
            <Link key={l.href} href={l.href} aria-current={actif ? "page" : undefined}
              className={`flex min-h-12 shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 font-medium md:min-h-11 ${actif ? "bg-marque-doux text-marque" : "text-encre-2 hover:bg-surface-2 hover:text-encre"}`}>
              <Icone aria-hidden="true" {...ICONE} className="hidden shrink-0 md:block" />
              <span className="min-w-0 flex-1 md:whitespace-normal">{l.label}</span>
              <kbd title={`Raccourci clavier : ${l.touche}`} className="hidden shrink-0 rounded border border-trait px-1.5 text-[11px] font-normal text-encre-2 md:inline">{l.touche}</kbd>
            </Link>
          );
        })}
      </div>
      <div className="mt-auto hidden space-y-3 md:block">
        <Simule quoi="Données simulées" />
        <p className="text-xs leading-snug text-encre-2">Personnes et institutions fictives. Aucun score n'est une performance réelle.</p>
      </div>
    </nav>
    </div>
  );
}
