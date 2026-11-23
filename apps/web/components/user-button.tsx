"use client";

import { LogOut, Monitor, Moon, Repeat, Sun, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { BoutonIcone, ICONE } from "@/components/bouton-icone";
import { deconnecter, ROLES, type Utilisateur } from "@/lib/session";
import { THEMES, useTheme, type Theme } from "@/lib/theme";

const ICONES_THEME: Record<Theme, LucideIcon> = { light: Sun, dark: Moon, system: Monitor };

const initiales = (nom: string) => nom.split(/[\s.]+/).filter((m) => m.length > 1).map((m) => m[0]!.toUpperCase()).slice(0, 2).join("") || "?";

/** Vrai quand la page est affichée dans un cadre de la démo guidée : le menu y est masqué. */
function useDansCadre() {
  const [cadre, setCadre] = useState<boolean | null>(null);
  useEffect(() => { setCadre(window.self !== window.top); }, []);
  return cadre;
}

/**
 * Menu de compte unique (commerçant, console, admin) : pastille aux initiales qui ouvre un menu
 * avec l'identité, le thème, « Changer de profil » et « Se déconnecter ».
 */
export function UserButton({ u, espace, ancrage = "right-0" }: {
  u: Pick<Utilisateur, "nom" | "role" | "login"> & { institution?: string | null };
  espace: "com" | "pro";
  /** Bord d'ancrage du menu (ex. « right-0 md:left-0 md:right-auto » dans la barre latérale). */
  ancrage?: string;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [sortie, setSortie] = useState(false);
  const [theme, setTheme] = useTheme();
  const bouton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const cadre = useDansCadre();

  const fermer = (rendreFocus = true) => { setOuvert(false); if (rendreFocus) bouton.current?.focus(); };

  useEffect(() => {
    if (!ouvert) return;
    menu.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
    const dehors = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node) && !bouton.current?.contains(e.target as Node)) fermer(false);
    };
    document.addEventListener("pointerdown", dehors);
    return () => document.removeEventListener("pointerdown", dehors);
  }, [ouvert]);

  if (cadre !== false) return null; // pas de menu de compte dans les iframes de /demo (ni avant le montage)

  function clavier(e: KeyboardEvent) {
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])];
    const k = items.indexOf(document.activeElement as HTMLElement);
    const aller = (n: number) => items[(n + items.length) % items.length]?.focus();
    if (e.key === "Escape") { e.preventDefault(); fermer(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); aller(k + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); aller(k - 1); }
    else if (e.key === "Home") { e.preventDefault(); aller(0); }
    else if (e.key === "End") { e.preventDefault(); aller(items.length - 1); }
    else if (e.key === "Tab") fermer(false);
  }

  const nom = u.role === "commercant" ? u.nom : ROLES[u.role];
  const item = "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left font-medium hover:bg-surface-2 focus:bg-surface-2 focus:outline-none";

  return (
    <div className="relative">
      <button ref={bouton} type="button" aria-haspopup="menu" aria-expanded={ouvert} aria-controls={ouvert ? id : undefined}
        aria-label={`Compte : ${nom}`} onClick={() => setOuvert((o) => !o)}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-trait bg-marque-doux text-sm font-bold text-marque transition hover:border-marque">
        {initiales(u.role === "commercant" ? u.nom : u.login)}
      </button>
      {ouvert && (
        <div ref={menu} id={id} role="menu" aria-label="Compte" onKeyDown={clavier}
          className={`apparait absolute ${ancrage} top-full z-50 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-trait bg-surface p-2 shadow-carte`}>
          <div className="border-b border-trait px-3 pb-3 pt-2">
            <p className="font-semibold">{nom}</p>
            <p className="text-sm text-encre-2">{u.role === "commercant" ? ROLES[u.role] : u.login}</p>
            {u.institution && <p className="text-sm text-encre-2">{u.institution}</p>}
          </div>
          <div role="group" aria-label="Thème" className="flex gap-1 border-b border-trait p-2">
            {THEMES.map((t) => {
              const Icone = ICONES_THEME[t.v];
              return (
                <button key={t.v} type="button" role="menuitemradio" aria-checked={theme === t.v} aria-label={`Thème ${t.label.toLowerCase()}`}
                  onClick={() => setTheme(t.v)}
                  className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-marque ${theme === t.v ? "bg-marque-doux text-marque" : "text-encre-2 hover:bg-surface-2"}`}>
                  <Icone aria-hidden="true" {...ICONE} />{t.label}
                </button>
              );
            })}
          </div>
          <div className="pt-2">
            <button type="button" role="menuitem" className={item} onClick={() => { setOuvert(false); router.push("/connexion"); }}>
              <Repeat aria-hidden="true" {...ICONE} className="text-encre-2" />Changer de profil
            </button>
            <button type="button" role="menuitem" disabled={sortie} className={`${item} text-alerte`}
              onClick={() => { setSortie(true); deconnecter(espace).catch(() => setSortie(false)); }}>
              <LogOut aria-hidden="true" {...ICONE} />{sortie ? "Déconnexion…" : "Se déconnecter"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Bouton de thème des pages sans session (accueil, connexion, inscription) : Système → Clair → Sombre. */
export function BoutonTheme() {
  const [theme, setTheme] = useTheme();
  const suivant: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
  const libelle = THEMES.find((t) => t.v === theme)!.label;
  const prochain = THEMES.find((t) => t.v === suivant[theme])!.label;
  return (
    <BoutonIcone icone={ICONES_THEME[theme]} label={`Thème : ${libelle}. Passer en ${prochain.toLowerCase()}`} onClick={() => setTheme(suivant[theme])} />
  );
}
