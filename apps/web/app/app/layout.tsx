import type { Metadata } from "next";
import { Lisiere } from "@/components/motif";
import { FournisseurCommercant } from "@/lib/commercant";
import { EnteteCommercant, NavCommercant } from "./nav";

export const metadata: Metadata = { title: "Mon crédit" };

export default function LayoutCommercant({ children }: { children: React.ReactNode }) {
  return (
    <FournisseurCommercant>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col">
        <EnteteCommercant />
        <Lisiere hauteur={10} />
        <main className="flex-1 px-5 pb-28 pt-5">{children}</main>
        <NavCommercant />
      </div>
    </FournisseurCommercant>
  );
}
