"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Chargement, Erreur, Pastille, Vide } from "@/components/ui";
import { useApi } from "@/lib/api";
import { useRaccourcis } from "@/lib/clavier";
import { ACTIVITES, date, fcfa, pct, RECO, STATUTS } from "@/lib/format";
import type { LigneDossier } from "@/lib/types";

const TON_STATUT: Record<string, "info" | "attention" | "bon" | "alerte" | "neutre"> = {
  recu: "info", en_analyse: "attention", complement: "attention", accorde: "bon", offre_acceptee: "bon", refuse: "alerte", offre_refusee: "neutre",
};

export default function File() {
  const router = useRouter();
  const [tri, setTri] = useState<"priorite" | "anciennete">("priorite");
  const [filtre, setFiltre] = useState<"a_traiter" | "tous">("a_traiter");
  const { donnees, erreur, charge, recharger } = useApi<LigneDossier[]>(`/dossiers?institution_id=inst-lagune&tri=${tri}`);
  const [sel, setSel] = useState(0);
  const lignes = useMemo(
    () => (donnees ?? []).filter((d) => filtre === "tous" || ["recu", "en_analyse", "complement"].includes(d.statut)),
    [donnees, filtre],
  );
  const raccourcis = useMemo(() => ({
    j: () => setSel((s) => Math.min(s + 1, lignes.length - 1)),
    k: () => setSel((s) => Math.max(s - 1, 0)),
    Enter: () => lignes[sel] && router.push(`/console/dossiers/${lignes[sel]!.id}`),
    t: () => setTri((t) => (t === "priorite" ? "anciennete" : "priorite")),
    f: () => setFiltre((f) => (f === "tous" ? "a_traiter" : "tous")),
    "2": () => router.push("/console/portefeuille"), "3": () => router.push("/console/parametres"), "4": () => router.push("/console/journal"),
  }), [lignes, sel, router]);
  useRaccourcis(raccourcis);

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titre text-2xl">File de dossiers</h1>
          <p className="text-encre-2">{lignes.length} dossier(s) · tri {tri === "priorite" ? "par priorité (alertes d'abord)" : "par ancienneté"}</p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Filtres">
          <button onClick={() => setFiltre(filtre === "tous" ? "a_traiter" : "tous")} className="rounded-lg border border-trait px-3 py-1.5 hover:bg-papier-2">
            {filtre === "tous" ? "Tous les dossiers" : "À traiter"} <kbd className="ml-1 text-[11px] text-encre-2">f</kbd>
          </button>
          <button onClick={() => setTri(tri === "priorite" ? "anciennete" : "priorite")} className="rounded-lg border border-trait px-3 py-1.5 hover:bg-papier-2">
            Trier <kbd className="ml-1 text-[11px] text-encre-2">t</kbd>
          </button>
        </div>
      </header>

      {erreur ? <Erreur message={erreur} reessayer={recharger} /> : charge && !donnees ? <Chargement lignes={6} /> : !lignes.length ? (
        <Vide titre="Aucun dossier à traiter">Les nouveaux dossiers arrivent ici dès qu'un commerçant donne son accord à votre institution.</Vide>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left [&_th]:whitespace-nowrap">
          <thead className="border-b-2 border-encre text-xs uppercase tracking-wide text-encre-2">
            <tr>
              <th className="py-2 pr-3 font-medium">Commerçant</th>
              <th className="py-2 pr-3 font-medium">Activité</th>
              <th className="py-2 pr-3 text-right font-medium">Plafond proposé</th>
              <th className="py-2 pr-3 text-right font-medium">Risque</th>
              <th className="py-2 pr-3 font-medium">Recommandation</th>
              <th className="py-2 pr-3 font-medium">Contrôles</th>
              <th className="py-2 pr-3 font-medium">Statut</th>
              <th className="py-2 font-medium">Reçu le</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((d, k) => (
              <tr key={d.id} onClick={() => router.push(`/console/dossiers/${d.id}`)} aria-selected={k === sel}
                className={`cursor-pointer border-b border-trait ${k === sel ? "bg-indigo-doux" : "hover:bg-papier-2"}`}>
                <td className="py-2 pr-3">
                  <a href={`/console/dossiers/${d.id}`} className="font-medium" onClick={(e) => e.stopPropagation()}>{d.nom}</a>
                  {!d.consentement_actif && <span className="ml-2 text-xs text-terre">accord retiré</span>}
                </td>
                <td className="py-2 pr-3 text-encre-2">{ACTIVITES[d.type_activite] ?? d.type_activite} · {d.semaines} sem.</td>
                <td className="chiffres py-2 pr-3 text-right">{fcfa(d.plafond)}</td>
                <td className="chiffres py-2 pr-3 text-right">{pct(d.risque, 1)}</td>
                <td className="py-2 pr-3">{RECO[d.recommandation]}{d.provisoire && <span className="text-encre-2"> · provisoire</span>}</td>
                <td className="py-2 pr-3">
                  {d.alertes.length ? (
                    <span className="inline-flex items-center gap-1 font-medium text-terre">
                      <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10"><path d="M5 0l5 5-5 5-5-5z" fill="var(--safran)" /></svg>
                      {d.alertes.length} alerte{d.alertes.length > 1 ? "s" : ""}
                    </span>
                  ) : <span className="text-encre-2">—</span>}
                </td>
                <td className="py-2 pr-3"><Pastille ton={TON_STATUT[d.statut]}>{STATUTS[d.statut]}</Pastille></td>
                <td className="chiffres py-2 text-encre-2">{date(d.cree_le, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      <p className="text-xs text-encre-2">Clavier : <kbd>j</kbd>/<kbd>k</kbd> pour se déplacer, <kbd>Entrée</kbd> pour ouvrir.</p>
    </section>
  );
}
