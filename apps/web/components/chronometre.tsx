"use client";

import { useEffect, useState } from "react";

// Chronomètre de traitement d'un dossier (C5). Il ne mesure que ce qu'un humain déclenche lui-même :
// rien n'est démarré automatiquement, aucune valeur n'est estimée. Sans mesure : « non mesuré ».
// Stockage local au navigateur (prototype), export CSV ou JSON pour l'analyse (protocole-temps.md).

export type Mesure = { dossier: string; agent: string; condition: "avec_outil" | "sans_outil"; debut: string; fin: string; duree_s: number };
const CLE = "kwedo.chronos.v1";

export function lireMesures(): Mesure[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CLE) || "[]") as Mesure[]; } catch { return []; }
}

function ecrire(m: Mesure[]) { localStorage.setItem(CLE, JSON.stringify(m)); }

function telecharger(nom: string, contenu: string, type: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement("a"); a.href = url; a.download = nom; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exporter(m: Mesure[], format: "csv" | "json") {
  if (format === "json") return telecharger("kwedo-chronos.json", JSON.stringify(m, null, 1), "application/json");
  const lignes = ["dossier;agent;condition;debut;fin;duree_s", ...m.map((x) => [x.dossier, x.agent, x.condition, x.debut, x.fin, x.duree_s].join(";"))];
  telecharger("kwedo-chronos.csv", lignes.join("\n"), "text/csv");
}

export function resume(m: Mesure[], condition: Mesure["condition"]): string {
  const d = m.filter((x) => x.condition === condition).map((x) => x.duree_s).sort((a, b) => a - b);
  if (!d.length) return "non mesuré";
  const at = (k: number) => d[k] ?? 0;
  const med = d.length % 2 ? at((d.length - 1) / 2) : (at(d.length / 2 - 1) + at(d.length / 2)) / 2;
  return `médiane ${Math.floor(med / 60)} min ${Math.round(med % 60)} s sur ${d.length} mesure${d.length > 1 ? "s" : ""}`;
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function Chronometre({ dossier, agent = "agent.demo" }: { dossier: string; agent?: string }) {
  const [mesures, setMesures] = useState<Mesure[]>([]);
  const [debut, setDebut] = useState<number | null>(null);
  const [maintenant, setMaintenant] = useState(0);
  const [condition, setCondition] = useState<Mesure["condition"]>("avec_outil");

  useEffect(() => { setMesures(lireMesures()); }, []);
  useEffect(() => {
    if (debut === null) return;
    const t = setInterval(() => setMaintenant(Date.now()), 500);
    return () => clearInterval(t);
  }, [debut]);

  function arreter() {
    if (debut === null) return;
    const fin = Date.now();
    const m = [...lireMesures(), { dossier, agent, condition, debut: new Date(debut).toISOString(), fin: new Date(fin).toISOString(), duree_s: Math.round((fin - debut) / 1000) }];
    ecrire(m); setMesures(m); setDebut(null);
  }

  return (
    <section aria-labelledby="t-chrono" className="rounded-xl border border-trait p-3">
      <h2 id="t-chrono" className="mb-1 text-sm font-semibold text-encre">Chronomètre de traitement</h2>
      <div className="flex flex-wrap items-center gap-2">
        <span className="chiffres text-lg" aria-live="off">{debut === null ? "--:--" : fmt((maintenant - debut) / 1000)}</span>
        <label className="text-[12px]">
          <span className="sr-only">Condition</span>
          <select value={condition} onChange={(e) => setCondition(e.target.value as Mesure["condition"])} disabled={debut !== null}
            className="rounded border border-trait bg-fond px-1 py-0.5">
            <option value="avec_outil">avec l'outil</option>
            <option value="sans_outil">sans l'outil</option>
          </select>
        </label>
        {debut === null
          ? <button type="button" onClick={() => { setDebut(Date.now()); setMaintenant(Date.now()); }} className="rounded border border-marque px-2 py-0.5 text-marque">Démarrer</button>
          : <button type="button" onClick={arreter} className="rounded border border-marque bg-marque px-2 py-0.5 text-fond">Arrêter et enregistrer</button>}
      </div>
      <p className="mt-1 text-[12px] text-encre-2">
        Temps humain avec l'outil : <strong>{resume(mesures, "avec_outil")}</strong> · sans l'outil : <strong>{resume(mesures, "sans_outil")}</strong>
      </p>
      <div className="mt-1 flex gap-2 text-[12px]">
        <button type="button" onClick={() => exporter(mesures, "csv")} disabled={!mesures.length} className="text-marque underline disabled:text-encre-2 disabled:no-underline">Exporter CSV</button>
        <button type="button" onClick={() => exporter(mesures, "json")} disabled={!mesures.length} className="text-marque underline disabled:text-encre-2 disabled:no-underline">Exporter JSON</button>
      </div>
      <p className="mt-1 text-[11px] text-encre-2">Démarré et arrêté par l'agent uniquement ; rien n'est estimé. Protocole : docs/evaluation/protocole-temps.md.</p>
    </section>
  );
}
