export type Raison = { code: string; texte: string; effet: number };
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
  risque: number;
  recommandation: "accord" | "examen_renforce" | "refus_motive";
  raisons: Raison[];
  conseils: string[];
  serie_hebdo: number[];
  chaine_calcul: string[];
  alertes?: Alerte[];
  modeles?: { version: string; prevision_hebdo: number; horizon_semaines: number; proba_defaut: number; score_anomalie: number; alerte_anomalie: boolean } | null;
  souhait?: { montant: number; risque: number; echeance: number; atteignable: boolean; manque: string[]; au_dessus_du_seuil?: boolean };
  institution_id?: string;
};

export type Commercant = {
  id: string; nom: string; telephone: string; type_activite: string; compte_separe: boolean;
  compte_marchand_ouvert_le: string | null; identite_verifiee: number; canal: "sms" | "whatsapp" | "appli"; nb_transactions: number;
};

export type Echeance = { id: number; rang: number; date_due: string; montant_attendu: number; montant_recu: number; statut: "a_venir" | "payee" | "partielle" | "en_retard" };
export type Relance = { id: number; echeance_id: number; canal: string; message: string; horodatage: string };

export type Credit = {
  id: string; dossier_id: string; commercant_id: string; institution_id: string; institution: string; montant: number;
  duree_semaines: number; taux_periode: number; decaisse_le: string; echeances: Echeance[];
  paiements: { id: number; montant: number; horodatage: string; recu: string }[]; relances: Relance[];
  total_du: number; total_recu: number; restant: number; cout_total: number; prochaine: Echeance | null;
};

export type LigneDossier = {
  id: string; commercant_id: string; nom: string; type_activite: string; institution_id: string; statut: string; cree_le: string;
  plafond: number; risque: number; recommandation: Analyse["recommandation"]; alertes: string[]; provisoire: boolean;
  semaines: number; consentement_actif: boolean;
};

export type Decision = {
  id: number; type: string; montant_propose: number; montant_decide: number | null; duree_semaines: number | null;
  auteur: string; motif: string; version_moteur: string; parametres_json: string; graine: number; horodatage: string;
};

export type Dossier = {
  id: string; commercant_id: string; institution_id: string; statut: string; version_moteur: string; graine: number;
  cree_le: string; ouvert_le: string | null; decide_le: string | null; montant_offre: number | null; duree_offre: number | null;
  analyse: Analyse; commercant: Commercant; institution: { id: string; nom: string }; consentement_actif: boolean;
  decisions: Decision[]; credit: { id: string } | null; acces: { acteur: string; action: string; horodatage: string }[];
};

export type InstitutionPublique = { id: string; nom: string };
export type Institution = { id: string; nom: string; parametres: { id: number; m: number; s: number; n: number; i: number; percentile: number; seuil_risque: number; auteur: string; cree_le: string } };

export type TableauDeBord = {
  commercant: Commercant; estimation: Analyse | null; credits: Credit[];
  dossiers: { id: string; institution_id: string; institution: string; statut: string; montant_offre: number | null; duree_offre: number | null; cree_le: string }[];
};
