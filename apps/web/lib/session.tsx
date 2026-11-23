"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Chargement } from "@/components/ui";
import { api } from "./api";

export type Utilisateur = { role: "commercant" | "agent" | "responsable" | "admin"; nom: string; login: string; commercant_id: string | null; institution_id: string | null; institution?: string };
export type Session = { commercant: Utilisateur | null; pro: Utilisateur | null };

export const ROLES: Record<Utilisateur["role"], string> = { commercant: "Commerçant", agent: "Agent de crédit", responsable: "Responsable crédit", admin: "Admin général" };

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    void api<Session>("/auth/moi").then(setSession).catch(() => setSession({ commercant: null, pro: null }));
    // Retour arrière après déconnexion : une page restaurée depuis le cache du navigateur est rechargée,
    // donc la session est relue et l'espace fermé ne se rouvre pas.
    const retour = (e: PageTransitionEvent) => { if (e.persisted) window.location.reload(); };
    window.addEventListener("pageshow", retour);
    return () => window.removeEventListener("pageshow", retour);
  }, []);
  return session;
}

export async function deconnecter(espace: "com" | "pro") {
  await api("/auth/deconnexion", { body: { espace } });
  // replace : la page de l'espace fermé quitte l'historique.
  window.location.replace("/connexion");
}

/** Confort d'affichage : renvoie vers la bonne page. La protection des données est faite par l'API. */
export function GardePro({ roles, children }: { roles: Utilisateur["role"][]; children: (u: Utilisateur) => ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const chemin = usePathname();
  const u = session?.pro ?? null;
  const autorise = !!u && roles.includes(u.role);
  useEffect(() => {
    if (!session || autorise) return;
    router.replace(u ? (u.role === "admin" ? "/admin" : "/console") : `/connexion?suite=${encodeURIComponent(chemin)}`);
  }, [session, autorise, u, router, chemin]);
  if (!autorise) return <div className="p-6"><Chargement lignes={5} /></div>;
  return <>{children(u)}</>;
}
