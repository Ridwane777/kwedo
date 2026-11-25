"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BoutonIcone } from "@/components/bouton-icone";
import { Pastille } from "@/components/ui";
import { fcfa, pct } from "@/lib/format";

/** Page renvoyée par toutes les listes de la console (pagination côté serveur). */
export type Page<T> = { elements: T[]; total: number; page: number; taille: number; pages: number; tri?: string; ordre?: string };

/** Paramètres de liste lus et écrits dans l'URL : une vue filtrée se partage et survit au retour arrière. */
export function useParamsListe() {
  const sp = useSearchParams();
  const router = useRouter();
  const chemin = usePathname();
  const lire = (k: string, d = "") => sp.get(k) ?? d;
  const ecrire = (maj: Record<string, string | null>, garderPage = false) => {
    const n = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(maj)) { if (v) n.set(k, v); else n.delete(k); }
    if (!garderPage) n.delete("page");
    const s = n.toString();
    router.replace(s ? `${chemin}?${s}` : chemin, { scroll: false });
  };
  return { lire, ecrire, requete: sp.toString() };
}

/** Fil d'Ariane : dernier élément = page courante. */
export function Ariane({ etapes }: { etapes: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="text-sm text-encre-2">
      <ol className="flex flex-wrap items-center gap-1">
        {etapes.map((e, k) => (
          <li key={k} className="flex items-center gap-1">
            {k > 0 && <ChevronRight aria-hidden="true" size={14} />}
            {e.href ? <Link href={e.href} className="hover:text-encre hover:underline">{e.label}</Link>
              : <span aria-current="page" className="font-medium text-encre">{e.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Onglets de liste (liens d'état) : défilants sur téléphone. */
export function OngletsListe({ onglets, actif, choisir }: { onglets: { cle: string; label: string; n?: number }[]; actif: string; choisir: (c: string) => void }) {
  return (
    <div role="tablist" aria-label="Onglets" className="-mx-4 flex gap-1 overflow-x-auto border-b border-trait px-4 md:mx-0 md:px-0">
      {onglets.map((o) => (
        <button key={o.cle} role="tab" aria-selected={actif === o.cle} onClick={() => choisir(o.cle)}
          className={`flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 font-medium ${actif === o.cle ? "border-marque text-marque" : "border-transparent text-encre-2 hover:text-encre"}`}>
          {o.label}
          {o.n !== undefined && <span className="chiffres rounded-full bg-surface-2 px-2 text-xs text-encre-2">{o.n}</span>}
        </button>
      ))}
    </div>
  );
}

/** Recherche par nom, envoyée au serveur après une courte pause de frappe. */
export function Recherche({ valeur, changer, label = "Rechercher un commerçant" }: { valeur: string; changer: (v: string) => void; label?: string }) {
  const [v, setV] = useState(valeur);
  useEffect(() => setV(valeur), [valeur]);
  useEffect(() => {
    if (v === valeur) return;
    const t = setTimeout(() => changer(v), 300);
    return () => clearTimeout(t);
  }, [v, valeur, changer]);
  return (
    <label className="relative flex min-w-0 basis-full items-center self-end sm:basis-64 sm:max-w-xs">
      <span className="sr-only">{label}</span>
      <Search aria-hidden="true" size={18} className="pointer-events-none absolute left-3 text-encre-3" />
      <input type="search" value={v} onChange={(e) => setV(e.target.value)} placeholder="Nom du commerçant"
        className="min-h-11 w-full rounded-xl border border-trait bg-surface pl-9 pr-3" />
    </label>
  );
}

/** Liste déroulante de filtre, valeur vide = tous. */
export function Filtre({ label, valeur, options, changer }: { label: string; valeur: string; options: [string, string][]; changer: (v: string) => void }) {
  return (
    <label className="flex flex-col text-xs font-semibold text-encre-2">
      {label}
      <select value={valeur} onChange={(e) => changer(e.target.value)} className="mt-1 min-h-11 rounded-xl border border-trait bg-surface px-2 text-sm font-normal text-encre">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

export function Periode({ du, au, changer }: { du: string; au: string; changer: (m: Record<string, string | null>) => void }) {
  return (
    <div className="flex gap-2">
      <label className="flex flex-col text-xs font-semibold text-encre-2">Du
        <input type="date" value={du} onChange={(e) => changer({ du: e.target.value || null })} className="mt-1 min-h-11 rounded-xl border border-trait bg-surface px-2 text-sm font-normal text-encre" />
      </label>
      <label className="flex flex-col text-xs font-semibold text-encre-2">Au
        <input type="date" value={au} onChange={(e) => changer({ au: e.target.value || null })} className="mt-1 min-h-11 rounded-xl border border-trait bg-surface px-2 text-sm font-normal text-encre" />
      </label>
    </div>
  );
}

export function Effacer({ actif, effacer }: { actif: boolean; effacer: () => void }) {
  if (!actif) return null;
  return <BoutonIcone icone={X} label="Effacer les filtres" onClick={effacer} className="self-end border border-trait bg-surface" />;
}

export function Pagination({ p, aller }: { p: Page<unknown>; aller: (n: number) => void }) {
  if (p.total === 0) return null;
  const debut = (p.page - 1) * p.taille + 1;
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 text-sm text-encre-2">
      <span className="chiffres">{debut}–{Math.min(p.total, p.page * p.taille)} sur {p.total}</span>
      <span className="flex items-center gap-1">
        <BoutonIcone icone={ChevronLeft} label="Page précédente" disabled={p.page <= 1} onClick={() => aller(p.page - 1)} className="border border-trait bg-surface" />
        <span className="chiffres px-2">Page {p.page} / {p.pages}</span>
        <BoutonIcone icone={ChevronRight} label="Page suivante" disabled={p.page >= p.pages} onClick={() => aller(p.page + 1)} className="border border-trait bg-surface" />
      </span>
    </nav>
  );
}

export function Indicateur({ l, v, ton, href }: { l: string; v: string; ton?: string; href?: string }) {
  // Carte cliquable : lien étiré depuis le <dt> (un <dl> ne peut contenir que dt/dd dans des div).
  return (
    <div className={`relative rounded-2xl border border-trait bg-surface p-3 ${href ? "hover:border-encre-3" : ""}`}>
      <dt className="text-xs font-semibold text-encre-2">
        {href ? <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl">{l}</Link> : l}
      </dt>
      <dd className={`montant text-2xl ${ton ?? ""}`}>{v}</dd>
    </div>
  );
}

export type Indicateurs = { encours: number; part_en_retard: number; par30: number; taux_recouvrement: number | null };

export function IndicateursCredits({ i, liens = false }: { i: Indicateurs; liens?: boolean }) {
  return (
    <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <Indicateur l="Encours" v={fcfa(i.encours)} href={liens ? "/console/credits" : undefined} />
      <Indicateur l="Part en retard" v={pct(i.part_en_retard, 1)} ton={i.part_en_retard > 0 ? "text-alerte" : ""} href={liens ? "/console/credits?onglet=en_retard" : undefined} />
      <Indicateur l="PAR 30 jours" v={pct(i.par30, 1)} href={liens ? "/console/credits?onglet=en_retard&tri=retard" : undefined} />
      <Indicateur l="Taux de recouvrement" v={i.taux_recouvrement === null ? "—" : pct(i.taux_recouvrement, 1)} href={liens ? "/console/recouvrement" : undefined} />
    </dl>
  );
}

export const STATUTS_CREDIT: Record<string, { l: string; ton: "info" | "alerte" | "bon" | "attention" | "neutre" }> = {
  en_cours: { l: "En cours", ton: "info" }, en_retard: { l: "En retard", ton: "attention" },
  rembourse: { l: "Remboursé", ton: "bon" }, en_defaut: { l: "En défaut", ton: "alerte" },
};
export function StatutCredit({ s }: { s: string }) {
  const x = STATUTS_CREDIT[s] ?? { l: s, ton: "neutre" as const };
  return <Pastille ton={x.ton}>{x.l}</Pastille>;
}

export const TON_STATUT: Record<string, "info" | "attention" | "bon" | "alerte" | "neutre"> = {
  recu: "info", en_analyse: "attention", complement: "attention", accorde: "bon", offre_acceptee: "bon", refuse: "alerte", offre_refusee: "neutre",
};
export const DECISIONS: Record<string, string> = { valide: "Accordée", ajuste: "Contre-proposée", refuse: "Refusée", complement: "Complément demandé" };

/** Tableau sur grand écran, cartes sur téléphone : les deux rendus reçoivent les mêmes lignes. */
export function Liste<T>({ lignes, cle, entetes, cellules, carte, lien }: {
  lignes: T[]; cle: (x: T) => string | number; entetes: { l: string; droite?: boolean }[];
  cellules: (x: T) => ReactNode[]; carte: (x: T) => ReactNode; lien: (x: T) => string;
}) {
  const router = useRouter();
  return (
    <>
      <ul className="divide-y divide-trait overflow-hidden rounded-2xl border border-trait bg-surface md:hidden">
        {lignes.map((x) => <li key={cle(x)}><Link href={lien(x)} className="block min-h-12 space-y-1.5 px-4 py-3">{carte(x)}</Link></li>)}
      </ul>
      <div className="hidden overflow-x-auto rounded-2xl border border-trait bg-surface md:block">
        <table className="w-full min-w-[820px] border-collapse text-left [&_td]:px-3 [&_td]:py-2.5">
          <thead className="border-b border-trait bg-surface-2/60 text-xs text-encre-2">
            <tr>{entetes.map((e) => <th key={e.l} className={`whitespace-nowrap px-3 py-2.5 font-semibold ${e.droite ? "text-right" : ""}`}>{e.l}</th>)}</tr>
          </thead>
          <tbody>
            {lignes.map((x) => (
              <tr key={cle(x)} onClick={() => router.push(lien(x))} className="cursor-pointer border-b border-trait last:border-b-0 hover:bg-surface-2">
                {cellules(x).map((c, k) => (
                  <td key={k} className={entetes[k]?.droite ? "chiffres text-right" : ""}>
                    {k === 0 ? <Link href={lien(x)} onClick={(e) => e.stopPropagation()} className="hover:underline">{c}</Link> : c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
