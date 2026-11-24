"use client";

import { BarChart3, Calculator, CreditCard, FileText, Lightbulb, TrendingUp, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Marque } from "@/components/motif";
import { Simule } from "@/components/ui";
import { BoutonTheme, UserButton } from "@/components/user-button";
import { useCommercant } from "@/lib/commercant";

const LIENS: { href: string; label: string; icone: LucideIcon }[] = [
  { href: "/app", label: "Estimation", icone: TrendingUp },
  { href: "/app/simulateur", label: "Simuler", icone: Calculator },
  { href: "/app/dossier", label: "Dossier", icone: FileText },
  { href: "/app/credit", label: "Crédit", icone: CreditCard },
  { href: "/app/activite", label: "Activité", icone: BarChart3 },
];

export function EnteteCommercant() {
  const { u } = useCommercant();
  return (
    <header className="gouttiere relative z-20 flex items-center justify-between gap-2 border-trait pb-3 pt-4 lg:border-b lg:py-3">
      <Link href="/app" aria-label="Accueil Kwedo"><Marque taille={26} /></Link>
      <div className="flex items-center gap-2">
        <Simule quoi="Démo simulée" />
        {u ? <UserButton u={u} espace="com" /> : <BoutonTheme />}
      </div>
    </header>
  );
}

/** Ordinateur : navigation latérale, mêmes destinations que la barre du bas. */
export function NavLaterale() {
  const chemin = usePathname();
  return (
    <nav aria-label="Navigation de l'espace commerçant" className="sticky top-0 hidden h-[calc(100dvh-4.5rem)] w-60 shrink-0 flex-col gap-1 border-r border-trait p-4 lg:flex">
      {LIENS.map((l) => {
        const actif = l.href === "/app" ? chemin === "/app" : chemin.startsWith(l.href);
        const Icone = l.icone;
        return (
          <Link key={l.href} href={l.href} aria-current={actif ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium ${actif ? "bg-marque-doux text-marque" : "text-encre-2 hover:bg-surface-2 hover:text-encre"}`}>
            <Icone aria-hidden="true" size={20} strokeWidth={1.75} />{l.label}
          </Link>
        );
      })}
      <Link href="/app/conseils" className={`flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium ${chemin.startsWith("/app/conseils") ? "bg-marque-doux text-marque" : "text-encre-2 hover:bg-surface-2 hover:text-encre"}`}>
        <Lightbulb aria-hidden="true" size={20} strokeWidth={1.75} />Conseils
      </Link>
    </nav>
  );
}

export function NavCommercant() {
  const chemin = usePathname();
  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-10 border-t border-trait bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5">
        {LIENS.map((l) => {
          const actif = l.href === "/app" ? chemin === "/app" : chemin.startsWith(l.href);
          const Icone = l.icone;
          return (
            <li key={l.href}>
              <Link href={l.href} aria-current={actif ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${actif ? "text-marque" : "text-encre-2"}`}>
                <span className={`flex h-8 w-14 items-center justify-center rounded-full transition ${actif ? "bg-marque-doux" : ""}`}>
                  <Icone aria-hidden="true" size={20} strokeWidth={actif ? 2.25 : 1.75} />
                </span>
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
