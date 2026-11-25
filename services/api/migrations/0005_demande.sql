-- Demande libre et décision par le risque (ADR 0017).
-- Le commerçant saisit le montant qu'il veut et l'objet du crédit ; l'institution décide sur le risque de CETTE demande.
ALTER TABLE dossiers ADD COLUMN montant_demande INTEGER CHECK (montant_demande IS NULL OR montant_demande > 0);
ALTER TABLE dossiers ADD COLUMN objet_categorie TEXT
  CHECK (objet_categorie IS NULL OR objet_categorie IN ('stock', 'equipement', 'fonds_roulement', 'ponctuel', 'autre'));
ALTER TABLE dossiers ADD COLUMN objet_texte TEXT CHECK (objet_texte IS NULL OR length(objet_texte) <= 200);

-- Décision : montant demandé au moment de décider et risque recalculé pour les termes décidés (ajout seul inchangé).
ALTER TABLE decisions ADD COLUMN montant_demande INTEGER;
ALTER TABLE decisions ADD COLUMN risque REAL;
