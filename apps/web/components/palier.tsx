/** Crédit progressif (ADR 0018) : deux chiffres (ventes / palier), lequel limite, frise des paliers, historique. */
import { Pastille } from "@/components/ui";
import { date, fcfa } from "@/lib/format";
import type { CyclePasse, PalierCredit } from "@/lib/types";

/** Nom court de l'institution, sans la mention « (fictive) ». */
export const nomCourt = (nom: string) => nom.replace(/\s*\(fictive\)\s*$/, "");

/** Phrase principale côté commerçant : ce que les ventes permettent, ce que le palier autorise, et comment il monte. */
export function phrasePalier(p: PalierCredit): string[] {
  const inst = nomCourt(p.institution);
  const plafond = p.plafond_moteur ?? 0;
  const lignes = [`Vos ventes permettent jusqu'à ${fcfa(plafond)}.`];
  if (p.bloque) {
    lignes.push(`Après un retard grave, ${inst} n'accorde plus de crédit d'office : l'institution examine chaque demande.`);
    return lignes;
  }
  const quoi = p.premier_credit ? "Pour un premier crédit" : `Au palier ${p.niveau} (crédit n° ${p.cycle})`;
  if (p.limite_par === "palier") lignes.push(`${quoi} chez ${inst}, le montant est limité à ${fcfa(p.montant_palier)}.`);
  else lignes.push(`${quoi} chez ${inst}, le palier (${fcfa(p.montant_palier)}) ne vous limite pas : ce sont vos ventes qui fixent le montant.`);
  if (p.palier_suivant) {
    const suite = p.credit_en_cours ? "Remboursez votre crédit en cours à l'heure" : "Remboursez-le à l'heure";
    lignes.push(`${suite} et votre limite passe à ${fcfa(p.palier_suivant)}${p.suivant_accordable != null && p.suivant_accordable < p.palier_suivant ? ` (vos ventes actuelles permettraient ${fcfa(p.suivant_accordable)})` : ""}.`);
  }
  return lignes;
}

/** Bloc « deux chiffres » : montant permis par les ventes, montant du palier, et lequel limite. */
export function DeuxChiffres({ p, titre = "Votre montant aujourd'hui" }: { p: PalierCredit; titre?: string }) {
  const limite = p.limite_par ?? "palier";
  return (
    <section className="min-w-0 space-y-3 rounded-2xl border border-trait bg-surface p-4" data-testid="palier-deux-chiffres" aria-label="Palier de crédit">
      <h3 className="font-semibold">{titre}</h3>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className={`rounded-xl p-3 ${limite === "plafond" ? "bg-marque-doux" : "bg-fond"}`}>
          <dt className="text-encre-2">Vos ventes permettent</dt>
          <dd className="chiffres text-lg font-semibold">{fcfa(p.plafond_moteur)}</dd>
          {limite === "plafond" && <dd className="text-xs font-semibold text-marque">C'est ce qui limite</dd>}
        </div>
        <div className={`rounded-xl p-3 ${limite === "palier" ? "bg-marque-doux" : "bg-fond"}`}>
          <dt className="text-encre-2">{p.bloque ? "Palier" : `Palier ${p.niveau} chez ${nomCourt(p.institution)}`}</dt>
          <dd className="chiffres text-lg font-semibold">{p.bloque ? "Examen au cas par cas" : fcfa(p.montant_palier)}</dd>
          {limite === "palier" && <dd className="text-xs font-semibold text-marque">C'est ce qui limite</dd>}
        </div>
      </dl>
      <div className="space-y-1 text-[15px]" data-testid="palier-phrase">
        {phrasePalier(p).map((l) => <p key={l}>{l}</p>)}
      </div>
      <FrisePaliers p={p} />
    </section>
  );
}

/** Frise : palier actuel, prochains paliers, condition pour monter. */
export function FrisePaliers({ p }: { p: PalierCredit }) {
  if (p.bloque || !p.paliers.length) return null;
  return (
    <div className="space-y-2" data-testid="frise-paliers">
      <ol className="grid grid-cols-2 gap-1 sm:grid-cols-4" aria-label="Paliers de crédit">
        {p.paliers.map((x, k) => (
          <li key={x.niveau} aria-current={k === 0 ? "step" : undefined}
            className={`min-w-0 rounded-xl border px-2 py-2 text-center text-xs ${k === 0 ? "border-marque bg-marque-doux text-marque" : "border-trait bg-surface-2 text-encre-2"}`}>
            <span className="block font-semibold">{k === 0 ? "Aujourd'hui" : `Palier ${x.niveau}`}</span>
            <span className="chiffres block text-sm font-semibold text-encre">{fcfa(x.montant)}</span>
            {x.au_dessus_du_plafond && <span className="block">au-delà de vos ventes</span>}
          </li>
        ))}
      </ol>
      <p className="text-xs text-encre-2">Pour monter d'un palier : {p.condition.charAt(0).toLowerCase() + p.condition.slice(1)}, jusqu'au solde du crédit. Un retard grave fait {p.politique.apres_defaut === "bloquer" ? "suspendre le palier" : "redescendre d'un palier"}.</p>
    </div>
  );
}

const ETAT: Record<CyclePasse["etat"], { texte: string; ton: "bon" | "attention" | "alerte" }> = {
  rembourse_a_l_heure: { texte: "Remboursé à l'heure", ton: "bon" },
  en_cours: { texte: "En cours", ton: "attention" },
  retard_grave: { texte: "Retard grave", ton: "alerte" },
};

/** Historique des crédits chez CETTE institution seulement (cloisonnement, ADR 0009). */
export function HistoriqueCycles({ p }: { p: PalierCredit }) {
  if (!p.historique.length) return <p className="text-sm text-encre-2">Aucun crédit précédent chez {nomCourt(p.institution)} : premier crédit.</p>;
  return (
    <ol className="divide-y divide-trait border-y border-trait text-sm" data-testid="historique-cycles">
      {p.historique.map((h, k) => (
        <li key={h.credit_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span>Crédit n° {k + 1} · <span className="chiffres font-semibold">{fcfa(h.montant)}</span> · versé le {date(h.decaisse_le)}</span>
          <span className="flex items-center gap-2">
            {h.retard_max_jours > 0 && <span className="text-xs text-encre-2">retard max {h.retard_max_jours} j</span>}
            <Pastille ton={ETAT[h.etat].ton}>{ETAT[h.etat].texte}</Pastille>
          </span>
        </li>
      ))}
    </ol>
  );
}
