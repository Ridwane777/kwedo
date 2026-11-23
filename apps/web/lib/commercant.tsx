"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Chargement } from "@/components/ui";
import { COMMERCANT_DEMO } from "./api";
import { useSession } from "./session";

const Ctx = createContext<{ id: string; changer: (id: string) => void }>({ id: COMMERCANT_DEMO, changer: () => {} });

/** Identité du commerçant connecté, lue dans la session signée (ADR 0009). */
export function FournisseurCommercant({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const chemin = usePathname();
  const [id, setId] = useState<string | null>(null);
  const inscription = chemin === "/app/inscription";
  useEffect(() => {
    if (!session) return;
    if (session.commercant?.commercant_id) setId(session.commercant.commercant_id);
    else if (!inscription) router.replace(`/connexion?suite=${encodeURIComponent(chemin)}`);
  }, [session, inscription, router, chemin]);
  if (!id && !inscription) return <Chargement lignes={5} />;
  return <Ctx.Provider value={{ id: id ?? "", changer: setId }}>{children}</Ctx.Provider>;
}

export const useCommercant = () => useContext(Ctx);
