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

export const RECO: Record<string, string> = {
  accord: "Accord", examen_renforce: "Examen renforcé", refus_motive: "Refus motivé",
};
