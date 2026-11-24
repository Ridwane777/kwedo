"use client";

/** Politique de palier (crédit progressif, ADR 0018) : versionnée, modifiable par le responsable, avec aperçu. */
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Bouton, Chargement, Erreur } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { date, fcfa } from "@/lib/format";
import type { PolitiquePalier } from "@/lib/types";

type Version = PolitiquePalier & { id: number; auteur: string; cree_le: string };
type Avant = { avant: number | null; apres: number | null };
type ApercuR = { nb_dossiers: number; accordable_moyen: Avant; au_dessus_du_palier: Avant };

const CHAMPS: { k: "palier_initial" | "multiplicateur" | "retard_grave_jours"; l: string; aide: string; min: number; max: number; pas: number }[] = [
  { k: "palier_initial", l: "Montant du premier crédit (FCFA)", aide: "Plafond d'un premier crédit chez vous, quelles que soient les ventes.", min: 5000, max: 5_000_000, pas: 5000 },
  { k: "multiplicateur", l: "Progression après un crédit remboursé", aide: "Le palier suivant = palier précédent × ce nombre (1,5 : +50 %).", min: 1, max: 3, pas: 0.05 },
  { k: "retard_grave_jours", l: "Retard grave à partir de (jours)", aide: "Une échéance réglée plus tard que cela après sa date fait perdre le palier.", min: 1, max: 90, pas: 1 },
];

export function PolitiquePalierSection({ inst, modifiable }: { inst: string; modifiable: boolean }) {
  const hist = useApi<{ actifs: Version; historique: Version[] }>(`/institutions/${inst}/palier`);
  const [f, setF] = useState<PolitiquePalier | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [r, setR] = useState<ApercuR | null>(null);
  const [calcul, setCalcul] = useState(false);
  useEffect(() => { if (hist.donnees) setF(hist.donnees.actifs); }, [hist.donnees]);
  const cle = f ? [f.palier_initial, f.multiplicateur, f.retard_grave_jours, f.apres_defaut].join("|") : "";
  useEffect(() => { setR(null); }, [cle]);

  if (hist.erreur) return <Erreur message={hist.erreur} />;
  if (!hist.donnees || !f) return <Chargement lignes={3} />;
  const corps = { palier_initial: f.palier_initial, multiplicateur: f.multiplicateur, retard_grave_jours: f.retard_grave_jours, apres_defaut: f.apres_defaut };

  async function apercu() {
    setCalcul(true); setMsg(null);
    try { setR(await api<ApercuR>(`/institutions/${inst}/palier/apercu`, { body: corps })); }
    catch (e) { setMsg({ ok: false, t: e instanceof Error ? e.message : "Erreur" }); } finally { setCalcul(false); }
  }
  async function enregistrer(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    try {
      await api(`/institutions/${inst}/palier`, { body: corps });
      setMsg({ ok: true, t: "Nouvelle version de la politique de palier enregistrée." });
      await hist.recharger();
    } catch (er) { setMsg({ ok: false, t: er instanceof Error ? er.message : "Erreur" }); }
  }
  const p2 = Math.floor((f.palier_initial * f.multiplicateur) / 5000) * 5000;
  const p3 = Math.floor((f.palier_initial * f.multiplicateur ** 2) / 5000) * 5000;

  return (
    <section aria-labelledby="t-palier" className="space-y-3" data-testid="politique-palier">
      <h2 id="t-palier" className="titre text-xl">Crédit progressif</h2>
      <p className="max-w-3xl text-encre-2">Par-dessus le plafond prudent, le palier limite le montant accordable : petit au premier crédit, il monte à chaque crédit remboursé à l'heure. Le montant accordé ne dépasse jamais le plafond prudent.</p>
      <form onSubmit={enregistrer} className="grid max-w-3xl gap-x-6 gap-y-3 md:grid-cols-2">
        {CHAMPS.map((c) => (
          <label key={c.k} className="block">
            <span className="font-medium">{c.l}</span>
            <input type="number" disabled={!modifiable} min={c.min} max={c.max} step={c.pas} value={f[c.k]}
              onChange={(e) => setF({ ...f, [c.k]: Number(e.target.value) })}
              className="chiffres mt-1 block w-full rounded-lg border border-trait bg-fond px-2 py-1.5 disabled:bg-surface-2" />
            <span className="text-[11px] text-encre-2">{c.aide}</span>
          </label>
        ))}
        <label className="block">
          <span className="font-medium">Après un retard grave</span>
          <select disabled={!modifiable} value={f.apres_defaut} onChange={(e) => setF({ ...f, apres_defaut: e.target.value as PolitiquePalier["apres_defaut"] })}
            className="mt-1 block min-h-9 w-full rounded-lg border border-trait bg-fond px-2 disabled:bg-surface-2">
            <option value="redescendre">Redescendre d'un palier</option>
            <option value="bloquer">Bloquer (examen au cas par cas)</option>
          </select>
          <span className="text-[11px] text-encre-2">L'agent peut toujours dépasser le palier avec un motif tracé.</span>
        </label>
        <p className="text-sm md:col-span-2">Paliers : <span className="chiffres">{fcfa(f.palier_initial)} → {fcfa(p2)} → {fcfa(p3)}</span> …</p>
        {modifiable && (
          <div className="space-y-2 rounded-xl border border-trait bg-surface p-3 md:col-span-2" data-testid="apercu-palier">
            <Bouton type="button" variante="trait" onClick={() => void apercu()} disabled={calcul}>{calcul ? "Calcul en cours…" : "Calculer l'aperçu"}</Bouton>
            {r && (r.nb_dossiers === 0 ? <p className="text-encre-2">Aucun dossier en attente.</p> : (
              <table className="w-full max-w-lg text-sm" aria-live="polite">
                <thead className="text-encre-2"><tr><th className="text-left font-medium">{r.nb_dossiers} dossier(s) en attente</th><th className="pr-3 text-right font-medium">Avant</th><th className="text-right font-medium">Après</th></tr></thead>
                <tbody>
                  <tr className="border-t border-trait"><th scope="row" className="py-1.5 pr-3 text-left font-normal">Montant accordable moyen</th><td className="chiffres pr-3 text-right">{fcfa(r.accordable_moyen.avant)}</td><td className="chiffres text-right font-semibold">{fcfa(r.accordable_moyen.apres)}</td></tr>
                  <tr className="border-t border-trait"><th scope="row" className="py-1.5 pr-3 text-left font-normal">Demandes au-dessus du palier</th><td className="chiffres pr-3 text-right">{r.au_dessus_du_palier.avant}</td><td className="chiffres text-right font-semibold">{r.au_dessus_du_palier.apres}</td></tr>
                </tbody>
              </table>
            ))}
            <p className="text-xs text-encre-2">Calculé sur l'historique de crédits de chaque commerçant chez vous ; rien n'est enregistré.</p>
          </div>
        )}
        <div className="md:col-span-2">
          {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-bon" : "text-alerte"}>{msg.t}</p>}
          {modifiable && <Bouton type="submit" icone={Save} className="mt-2">Enregistrer la politique de palier</Bouton>}
        </div>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full max-w-3xl text-left text-sm [&_td]:pr-3 [&_th]:pr-3">
          <thead className="border-b border-trait text-xs text-encre-2"><tr><th className="py-1.5">Version</th><th>Premier crédit</th><th>Progression</th><th>Retard grave</th><th>Après</th><th>Auteur</th><th>Date</th></tr></thead>
          <tbody className="chiffres">
            {hist.donnees.historique.map((h) => (
              <tr key={h.id} className="border-b border-trait"><td className="py-1.5">#{h.id}</td><td>{fcfa(h.palier_initial)}</td><td>× {h.multiplicateur.toLocaleString("fr-FR")}</td><td>&gt; {h.retard_grave_jours} j</td><td className="font-sans">{h.apres_defaut === "bloquer" ? "bloquer" : "redescendre"}</td><td>{h.auteur}</td><td>{date(h.cree_le, true)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
