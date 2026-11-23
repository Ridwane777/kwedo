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
  const { donnees, erreur, charge, recharger } = useApi<LigneDossier[]>(`/dossiers?tri=${tri}`);
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
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titre text-[1.75rem] leading-tight">File de dossiers</h1>
          <p className="text-encre-2">{lignes.length} dossier{lignes.length > 1 ? "s" : ""}, {tri === "priorite" ? "alertes d'abord" : "les plus anciens d'abord"}</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtres">
          <div className="inline-flex rounded-xl border border-trait bg-surface p-1">
            {(["a_traiter", "tous"] as const).map((f) => (
              <button key={f} onClick={() => setFiltre(f)} aria-pressed={filtre === f}
                className={`min-h-9 rounded-lg px-3 font-medium ${filtre === f ? "bg-encre text-fond" : "text-encre-2 hover:text-encre"}`}>
                {f === "tous" ? "Tous" : "À traiter"}
              </button>
            ))}
            <kbd className="hidden self-center px-2 text-[11px] text-encre-2 md:inline" title="Raccourci clavier">f</kbd>
          </div>
          <button onClick={() => setTri(tri === "priorite" ? "anciennete" : "priorite")} className="min-h-11 rounded-xl border border-trait bg-surface px-3 font-medium hover:border-encre-3">
            Trier : {tri === "priorite" ? "priorité" : "ancienneté"} <kbd className="ml-1 hidden text-[11px] font-normal text-encre-2 md:inline">t</kbd>
          </button>
        </div>
      </header>

      {donnees && (
        <dl className="grid grid-cols-3 gap-2 sm:max-w-xl">
          {[
            ["À décider", donnees.filter((d) => ["recu", "en_analyse", "complement"].includes(d.statut)).length, ""],
            ["Avec alertes", donnees.filter((d) => d.alertes.length && ["recu", "en_analyse", "complement"].includes(d.statut)).length, "ambre"],
            ["Accord retiré", donnees.filter((d) => !d.consentement_actif).length, "alerte"],
          ].map(([l, n, ton]) => (
            <div key={l as string} className="rounded-2xl border border-trait bg-surface p-3">
              <dt className="flex items-center gap-1.5 text-xs text-encre-2">
                {ton && <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${ton === "ambre" ? "bg-ambre" : "bg-alerte"}`} />}{l}
              </dt>
              <dd className="montant text-2xl">{n}</dd>
            </div>
          ))}
        </dl>
      )}

      {erreur ? <Erreur message={erreur} reessayer={recharger} /> : charge && !donnees ? <Chargement lignes={6} /> : !lignes.length ? (
        <Vide titre="Aucun dossier à traiter">Les nouveaux dossiers arrivent ici dès qu'un commerçant donne son accord à votre institution.</Vide>
      ) : (
        <>
        {/* Téléphone : une carte par dossier, l'essentiel visible sans défilement horizontal. */}
        <ul className="divide-y divide-trait overflow-hidden rounded-2xl border border-trait bg-surface md:hidden">
          {lignes.map((d) => (
            <li key={d.id} className={d.alertes.length ? "border-l-4 border-l-ambre" : ""}>
              <a href={`/console/dossiers/${d.id}`} className="block min-h-12 space-y-1.5 px-4 py-3">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{d.nom}</span>
                  <span className="chiffres font-semibold">{fcfa(d.plafond)}</span>
                </span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-encre-2">
                  <Pastille ton={TON_STATUT[d.statut]}>{STATUTS[d.statut]}</Pastille>
                  <span>{RECO[d.recommandation]} · risque {pct(d.risque, 1)}</span>
                  {d.alertes.length > 0 && <span className="font-medium text-encre">◆ {d.alertes.length} alerte{d.alertes.length > 1 ? "s" : ""}</span>}
                  {!d.consentement_actif && <span className="text-alerte">accord retiré</span>}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto rounded-2xl border border-trait bg-surface md:block">
        <table className="w-full min-w-[900px] border-collapse text-left [&_th]:whitespace-nowrap [&_th]:py-2.5 [&_td]:px-3 [&_td]:py-2.5">
          <thead className="border-b border-trait bg-surface-2/60 text-xs font-semibold text-encre-2 [&_th]:px-3 [&_th]:font-semibold">
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
                className={`cursor-pointer border-b border-trait last:border-b-0 ${k === sel ? "bg-marque-doux shadow-[inset_3px_0_0_var(--marque)]" : "hover:bg-surface-2"}`}>
                <td className="py-2 pr-3">
                  <a href={`/console/dossiers/${d.id}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>{d.nom}</a>
                  {!d.consentement_actif && <span className="ml-2 text-xs text-alerte">accord retiré</span>}
                </td>
                <td className="py-2 pr-3 text-encre-2">{ACTIVITES[d.type_activite] ?? d.type_activite} · {d.semaines} sem.</td>
                <td className="chiffres py-2 pr-3 text-right">{fcfa(d.plafond)}</td>
                <td className="chiffres py-2 pr-3 text-right">{pct(d.risque, 1)}</td>
                <td className="py-2 pr-3">{RECO[d.recommandation]}{d.provisoire && <span className="text-encre-2"> · provisoire</span>}</td>
                <td className="py-2 pr-3">
                  {d.alertes.length ? (
                    <span className="inline-flex items-center gap-1 font-medium text-encre">
                      <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10"><path d="M5 0l5 5-5 5-5-5z" fill="var(--ambre)" /></svg>
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
        </>
      )}
      <p className="text-xs text-encre-2">Clavier : <kbd>j</kbd>/<kbd>k</kbd> pour se déplacer, <kbd>Entrée</kbd> pour ouvrir.</p>
    </section>
  );
}
