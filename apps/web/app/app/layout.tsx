import type { Metadata } from "next";
import { FournisseurCommercant } from "@/lib/commercant";
import { EnteteCommercant, NavCommercant, NavLaterale } from "./nav";

export const metadata: Metadata = { title: "Mon crédit" };

/**
 * Téléphone : en-tête, contenu, barre de navigation en bas.
 * Ordinateur (≥ 1024 px) : navigation latérale et contenu sur toute la largeur restante.
 */
export default function LayoutCommercant({ children }: { children: React.ReactNode }) {
  return (
    <FournisseurCommercant>
      <div className="flex min-h-dvh flex-col">
        <EnteteCommercant />
        <div className="flex flex-1">
          <NavLaterale />
          <main className="gouttiere min-w-0 flex-1 pb-28 pt-5 lg:pb-12 lg:pt-8">{children}</main>
        </div>
        <NavCommercant />
      </div>
    </FournisseurCommercant>
  );
}
