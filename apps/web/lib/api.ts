"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export class ErreurApi extends Error {
  constructor(public statut: number, message: string) {
    super(message);
  }
}

export async function api<T>(chemin: string, init?: { method?: string; body?: unknown; acteur?: string }): Promise<T> {
  const r = await fetch(`/api${chemin}`, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(init?.acteur ? { "X-Acteur": init.acteur } : {}) },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const corps = await r.json().catch(() => ({ erreur: "Réponse illisible du serveur." }));
  if (!r.ok) throw new ErreurApi(r.status, corps.erreur ?? "Erreur inconnue.");
  return corps as T;
}

/** Chargement avec états explicites ; `recharger` pour rafraîchir après une action. */
export function useApi<T>(chemin: string | null) {
  const [donnees, setDonnees] = useState<T | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [charge, setCharge] = useState(true);
  const seq = useRef(0);
  const recharger = useCallback(async () => {
    if (!chemin) return;
    const n = ++seq.current;
    setCharge(true);
    try {
      const d = await api<T>(chemin);
      if (n === seq.current) { setDonnees(d); setErreur(null); }
    } catch (e) {
      if (n === seq.current) setErreur(e instanceof Error ? e.message : "Erreur réseau.");
    } finally {
      if (n === seq.current) setCharge(false);
    }
  }, [chemin]);
  useEffect(() => { void recharger(); }, [recharger]);
  return { donnees, erreur, charge, recharger };
}

export const COMMERCANT_DEMO = "com-afiavi";
