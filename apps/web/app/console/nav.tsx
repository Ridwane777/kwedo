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
        <div className="flex min-h-dvh text-[13.5px]">
          <NavConsole u={u} />
          <main className="min-w-0 flex-1 px-6 py-5">{children}</main>
        </div>
      )}
    </GardePro>
  );
}

function NavConsole({ u }: { u: Utilisateur }) {
  const chemin = usePathname();
  return (
    <nav aria-label="Console" className="sticky top-0 flex h-dvh w-56 shrink-0 flex-col gap-1 border-r border-trait bg-papier-2 p-4">
      <Link href="/console" className="mb-1"><Marque taille={24} /></Link>
      <p className="mb-4 text-xs text-encre-2">{u.institution}<br />{ROLES[u.role]} · {u.login}</p>
      {LIENS.map((l) => {
        const actif = l.href === "/console" ? chemin === "/console" || chemin.startsWith("/console/dossiers") : chemin.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={actif ? "page" : undefined}
            className={`flex items-center justify-between rounded-lg px-3 py-2 ${actif ? "bg-indigo text-papier" : "text-encre hover:bg-papier-3"}`}>
            {l.label}
            <kbd title={`Raccourci clavier : ${l.touche}`} className={`text-[11px] ${actif ? "text-papier" : "text-encre-2"}`}>{l.touche}</kbd>
          </Link>
        );
      })}
      <div className="mt-auto space-y-2">
        <button onClick={() => void deconnecter("pro")} className="w-full rounded-lg border border-trait px-3 py-2 text-left hover:bg-papier-3">Changer de profil</button>
        <Simule quoi="Données simulées" />
        <p className="text-[11px] leading-snug text-encre-2">Personnes et institutions fictives. Aucun score n'est une performance réelle.</p>
      </div>
    </nav>
  );
}
