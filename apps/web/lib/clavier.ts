"use client";

import { useEffect } from "react";

/** Raccourcis clavier, ignorés pendant la saisie dans un champ. */
export function useRaccourcis(table: Record<string, () => void>, actif = true) {
  useEffect(() => {
    if (!actif) return;
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      const f = table[e.key];
      if (f) { e.preventDefault(); f(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [table, actif]);
}
