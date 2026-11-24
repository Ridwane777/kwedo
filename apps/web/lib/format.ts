const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
// Espace insécable classique : l'espace fine (U+202F) n'existe pas dans toutes les polices et disparaît.
const insecable = (s: string) => s.replace(/[   ]/g, " ");

/** 865 000 FCFA — format français, insécable. */
export function fcfa(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return insecable(`${nf.format(Math.round(n))} FCFA`);
}

export function nombre(n: number): string {
  return insecable(nf.format(Math.round(n)));
}

export function pct(x: number | null | undefined, decimales = 0): string {
  if (x === null || x === undefined) return "—";
  return `${(x * 100).toLocaleString("fr-FR", { maximumFractionDigits: decimales, minimumFractionDigits: decimales })} %`;
}

export function date(iso: string | null | undefined, avecHeure = false): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString("fr-FR", avecHeure
    ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "long", year: "numeric" });
}

export const ACTIVITES: Record<string, string> = {
  tissus: "Tissus", alimentation: "Alimentation", restauration: "Restauration",
  telephonie: "Téléphonie", artisanat: "Artisanat", cosmetique: "Cosmétique", quincaillerie: "Quincaillerie",
};

export const STATUTS: Record<string, string> = {
  recu: "Reçu", en_analyse: "En analyse", complement: "Complément demandé", accorde: "Offre envoyée",
  refuse: "Refusé", offre_acceptee: "Offre acceptée", offre_refusee: "Offre déclinée",
};

export type Frequence = "hebdomadaire" | "quinzaine" | "mensuelle";

/** Libellés de fréquence de remboursement (ADR 0015). */
export const FREQ: Record<Frequence, { nom: string; chaque: string; periode: string; echeance: string }> = {
  hebdomadaire: { nom: "Chaque semaine", chaque: "chaque semaine", periode: "semaine", echeance: "Échéance chaque semaine" },
  quinzaine: { nom: "Toutes les 2 semaines", chaque: "toutes les deux semaines", periode: "quinzaine", echeance: "Échéance toutes les 2 semaines" },
  mensuelle: { nom: "Chaque mois", chaque: "chaque mois", periode: "mois", echeance: "Mensualité" },
};

type Duree = { duree_mois?: number | null; duree_semaines?: number | null };

/** Durée lisible : « 6 mois » si choisie en mois, sinon « 26 semaines ». */
export function duree(t: Duree): string {
  if (t.duree_mois && Number.isInteger(t.duree_mois)) return `${t.duree_mois} mois`;
  return `${t.duree_semaines ?? "—"} semaines`;
}

/** « 41 500 FCFA chaque mois pendant 6 mois ». */
export function phraseEcheance(montant: number, f: Frequence, t: Duree): string {
  return `${fcfa(montant)} ${FREQ[f].chaque} pendant ${duree(t)}`;
}

/** Délai de versement annoncé par l'institution : « sous 48 h ». */
export function delai(h: number): string {
  return `sous ${h} h`;
}

export const RECO: Record<string, string> = {
  accord: "Accord", examen_renforce: "Examen renforcé", refus_motive: "Refus motivé",
};
