"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Marque } from "@/components/motif";
import { Simule } from "@/components/ui";
import { deconnecter, GardePro, ROLES, type Utilisateur } from "@/lib/session";

const LIENS = [
  { href: "/console", label: "File de dossiers", touche: "1" },
  { href: "/console/portefeuille", label: "Portefeuille", touche: "2" },
  { href: "/console/parametres", label: "Paramètres du moteur", touche: "3" },
  { href: "/console/journal", label: "Journal d'audit", touche: "4" },
];

export function CadreConsole({ children }: { children: React.ReactNode }) {
  return (
    <GardePro roles={["agent", "responsable"]}>
      {(u) => (
        <div className="min-h-dvh text-[13.5px] md:flex">
          <NavConsole u={u} />
          <main className="min-w-0 flex-1 px-4 py-4 md:px-6 md:py-5">{children}</main>
        </div>
      )}
    </GardePro>
  );
}

/** Barre latérale sur grand écran ; sur téléphone, en-tête compact et onglets défilants. */
function NavConsole({ u }: { u: Utilisateur }) {
  const chemin = usePathname();
  return (
    <nav aria-label="Console" className="border-b border-trait bg-papier-2 px-4 pt-3 md:sticky md:top-0 md:flex md:h-dvh md:w-56 md:shrink-0 md:flex-col md:gap-1 md:border-b-0 md:border-r md:p-4">
      <div className="flex items-start justify-between gap-3 md:block">
        <div>
          <Link href="/console" className="mb-1 inline-block"><Marque taille={24} /></Link>
          <p className="mb-3 text-xs text-encre-2 md:mb-4">{u.institution}<br />{ROLES[u.role]} · {u.login}</p>
        </div>
        <button onClick={() => void deconnecter("pro")} className="min-h-11 shrink-0 rounded-lg border border-trait px-3 text-left hover:bg-papier-3 md:hidden">Changer de profil</button>
      </div>
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-col md:overflow-visible md:px-0 md:pb-0">
        {LIENS.map((l) => {
          const actif = l.href === "/console" ? chemin === "/console" || chemin.startsWith("/console/dossiers") : chemin.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} aria-current={actif ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-2 ${actif ? "bg-indigo text-papier" : "text-encre hover:bg-papier-3"}`}>
              {l.label}
              <kbd title={`Raccourci clavier : ${l.touche}`} className={`hidden text-[11px] md:inline ${actif ? "text-papier" : "text-encre-2"}`}>{l.touche}</kbd>
            </Link>
          );
        })}
      </div>
      <div className="mt-auto hidden space-y-2 md:block">
        <button onClick={() => void deconnecter("pro")} className="w-full rounded-lg border border-trait px-3 py-2 text-left hover:bg-papier-3">Changer de profil</button>
        <Simule quoi="Données simulées" />
        <p className="text-[11px] leading-snug text-encre-2">Personnes et institutions fictives. Aucun score n'est une performance réelle.</p>
      </div>
    </nav>
  );
}
