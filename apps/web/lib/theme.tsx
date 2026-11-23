"use client";

import { useEffect, useState } from "react";

import { CLE_THEME } from "./theme-script";

export type Theme = "light" | "dark" | "system";
export const THEMES: { v: Theme; label: string }[] = [
  { v: "light", label: "Clair" },
  { v: "dark", label: "Sombre" },
  { v: "system", label: "Système" },
];

function lire(): Theme {
  if (typeof document === "undefined") return "system";
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : "system";
}

export function appliquerTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(CLE_THEME, t); } catch { /* stockage indisponible : le choix vaut pour la page */ }
  window.dispatchEvent(new CustomEvent("kwedo-theme", { detail: t }));
}

/** Thème courant, synchronisé entre composants, onglets et iframes de la démo (même origine). */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    setTheme(lire());
    const local = (e: Event) => setTheme((e as CustomEvent<Theme>).detail);
    const autre = (e: StorageEvent) => {
      if (e.key !== CLE_THEME) return;
      const t: Theme = e.newValue === "light" || e.newValue === "dark" ? e.newValue : "system";
      document.documentElement.dataset.theme = t;
      setTheme(t);
    };
    window.addEventListener("kwedo-theme", local);
    window.addEventListener("storage", autre);
    return () => { window.removeEventListener("kwedo-theme", local); window.removeEventListener("storage", autre); };
  }, []);
  return [theme, appliquerTheme];
}

/** Monté une fois dans le layout : suit les changements faits dans un autre onglet ou dans la page parente de la démo. */
export function SynchroTheme() {
  useTheme();
  return null;
}
