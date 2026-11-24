import type { Frequence } from "./format";

export type Raison = { code: string; texte: string; effet: number };
/** Modalités commerciales d'une institution (ADR 0015). */
export type Modalites = { frequences: Frequence[]; duree_min_mois: number; duree_max_mois: number; delai_versement_h: number };
export type Alerte = { code: string; texte: string };

export type Analyse = {
  version_moteur: string;
  graine: number;
  parametres: { m: number; s: number; n: number; i: number; percentile: number; seuil_risque: number; trajectoires: number };
  choc_ventes: number;
  provisoire: boolean;
  indicateurs: {
    semaines: number; encaissement_median: number; encaissement_moyen: number; regularite_cv: number;
    jours_actifs: number; tendance_hebdo: number; saisonnalite: number; payeurs_distincts: number;
    part_plus_gros_payeur: number; part_flux_pro: number; exclu_transferts_soi: number; exclu_circulaires: number; debut: string | null;
  };
  encaissement_prudent: number;
  echeance_hebdo: number;
  echeance_supportable: number;
  l_max: number;
  l_simulation: number;
  decote_anciennete: number;
  plafond: number;
  duree_semaines: number;
  cout_total: number;
  frequence: Frequence;
  nb_echeances: number;
  duree_mois: number | null;
  echeance: number;
  taux_periode: number;
  risque_valide: boolean;
  /** Fréquence ayant passé le run final d'évaluation (ADR 0016). */
  risque_eprouve?: boolean;
  risque: number;
  recommandation: "accord" | "examen_renforce" | "refus_motive";
  raisons: Raison[];
  conseils: string[];
  serie_hebdo: number[];
  chaine_calcul: string[];
  alertes?: Alerte[];
  modeles?: { version: string; prevision_hebdo: number; horizon_semaines: number; proba_defaut: number; score_anomalie: number; alerte_anomalie: boolean } | null;
  institution_id?: string;
};

/** Vue commerçant de l'estimation : ni R, ni recommandation, ni réglages de l'institution (ADR 0009). */
export type Estimation = Omit<Analyse, "graine" | "parametres" | "echeance_supportable" | "l_max" | "l_simulation" | "decote_anciennete" | "risque" | "recommandation" | "alertes" | "modeles" | "risque_valide" | "risque_eprouve"> & {
  parametres: { n: number; i: number; frequence: Frequence; duree_mois: number | null };
  modalites: Modalites;
  institution: string;
  /** Faux si la fréquence n'a pas passé le run final d'évaluation (ADR 0016) : mention « moins éprouvée ». */
  estimation_eprouvee: boolean;
  souhait?: { montant: number; echeance: number; atteignable: boolean; manque: string[]; au_dessus_du_seuil: boolean;
    cout_total: number; nb_echeances: number; part_mauvaise_periode: number | null; raisons: { code: string; texte: string }[];
    au_dessus_du_palier?: boolean };
  palier: PalierCredit;
};

export type Commercant = {
  id: string; nom: string; telephone: string; type_activite: string; compte_separe: boolean;
  compte_marchand_ouvert_le: string | null; identite_verifiee: number; canal: "sms" | "whatsapp" | "appli"; nb_transactions: number;
};

export type Echeance = { id: number; rang: number; date_due: string; montant_attendu: number; montant_recu: number; statut: "a_venir" | "payee" | "partielle" | "en_retard" };
export type Relance = { id: number; echeance_id: number; canal: string; message: string; horodatage: string };

export type Credit = {
  id: string; dossier_id: string; commercant_id: string; institution_id: string; institution: string; montant: number;
  duree_semaines: number; taux_periode: number; decaisse_le: string; echeances: Echeance[]; frequence: Frequence;
  paiements: { id: number; montant: number; horodatage: string; recu: string }[]; relances: Relance[];
  total_du: number; total_recu: number; restant: number; cout_total: number; prochaine: Echeance | null;
  /** Crédit remboursé entièrement et à l'heure : montant du palier débloqué (ADR 0018). */
  palier_debloque: number | null; palier_etat: CyclePasse["etat"] | null;
};

export type LigneDossier = {
  id: string; commercant_id: string; nom: string; type_activite: string; institution_id: string; statut: string; cree_le: string;
  plafond: number; risque: number; recommandation: Analyse["recommandation"]; alertes: string[]; provisoire: boolean;
  semaines: number; consentement_actif: boolean; frequence: Frequence; duree_mois: number | null;
  montant_demande: number | null; objet_categorie: string | null; risque_demande: number; dans_tolerance: boolean;
};

/** Risque d'une demande ou d'une contre-proposition (ADR 0017), vue institution. */
export type Evaluation = {
  montant: number; frequence: Frequence; duree_mois: number | null; duree_semaines: number; nb_echeances: number; echeance: number;
  cout_total: number; risque: number; seuil_risque: number; dans_tolerance: boolean; plafond: number; risque_plafond: number;
  echeance_plafond: number; plafond_formule: number; encaissement_prudent: number; part_mauvaise_periode: number | null;
  raisons: { code: string; texte: string }[]; risque_valide: boolean;
};

export type Decision = {
  id: number; type: string; montant_propose: number; montant_decide: number | null; duree_semaines: number | null;
  auteur: string; motif: string; version_moteur: string; montant_demande: number | null; risque: number | null; parametres_json: string; graine: number; horodatage: string;
  palier: number | null; motif_depassement: string | null;
};

export type Dossier = {
  id: string; commercant_id: string; institution_id: string; statut: string; version_moteur: string; graine: number;
  cree_le: string; ouvert_le: string | null; decide_le: string | null; montant_offre: number | null; duree_offre: number | null;
  analyse: Analyse; commercant: Commercant; institution: { id: string; nom: string }; consentement_actif: boolean;
  decisions: Decision[]; credit: { id: string } | null; acces: { acteur: string; action: string; horodatage: string }[];
  frequence: Frequence; duree_mois: number | null; frequence_demandee: Frequence; duree_mois_demandee: number | null; modalites: Modalites;
  montant_demande: number | null; objet_categorie: string | null; objet_texte: string | null; objet_libelle: string | null; demande: Evaluation;
  palier: PalierCredit;
};

export type InstitutionPublique = { id: string; nom: string };
export type Institution = { id: string; nom: string; parametres: {
  id: number; m: number; s: number; n: number; i: number; percentile: number; seuil_risque: number; auteur: string; cree_le: string;
  frequences: string; duree_min_mois: number; duree_max_mois: number; delai_versement_h: number;
} };

export type TableauDeBord = {
  commercant: Commercant; estimation: Estimation | null; credits: Credit[];
  dossiers: { id: string; institution_id: string; institution: string; statut: string; montant_offre: number | null; duree_offre: number | null; cree_le: string; frequence: Frequence; duree_mois: number | null; montant_demande: number | null; objet_categorie: string | null }[];
};

/** Crédit progressif (ADR 0018) : un crédit passé chez CETTE institution, tel que lu dans ses échéances. */
export type CyclePasse = {
  credit_id: string; montant: number; decaisse_le: string; frequence: Frequence; solde: boolean; solde_le: string | null;
  retard_max_jours: number; etat: "rembourse_a_l_heure" | "en_cours" | "retard_grave";
};
export type PolitiquePalier = { palier_initial: number; multiplicateur: number; retard_grave_jours: number; apres_defaut: "redescendre" | "bloquer" };
export type PalierCredit = {
  institution_id: string; institution: string; niveau: number; bloque: boolean; cycle: number; premier_credit: boolean;
  credit_en_cours: boolean; montant_palier: number; palier_suivant: number | null; historique: CyclePasse[]; redescendu: boolean;
  politique: PolitiquePalier; condition: string; paliers: { niveau: number; montant: number; au_dessus_du_plafond?: boolean }[];
  plafond_moteur?: number; montant_accordable?: number; limite_par?: "palier" | "plafond"; suivant_accordable?: number | null;
  demande_au_dessus?: boolean;
};

export type Palier = { semaines: number; mois: number; atteint: boolean; reste: number };
export type Levier = {
  code: string; titre: string; bon: boolean | null; constat: string; repere: string; pourquoi: string;
  actions: string[]; effet: number | null; condition: string; paliers?: Palier[];
};
export type Conseils = {
  plafond_actuel: number; semaines: number; paliers: Palier[]; gain_possible: number | null;
  meilleur_levier: { code: string; titre: string } | null; leviers: Levier[]; deja_bien: Levier[]; institution_id: string; simule: true;
  institution: string; frequence: Frequence; duree_mois: number | null; duree_semaines: number; modalites: Modalites;
  palier: PalierCredit;
};
