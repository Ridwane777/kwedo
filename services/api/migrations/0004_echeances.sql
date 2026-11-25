-- Fréquence et durée de remboursement au choix (ADR 0015).
-- Modalités commerciales de l'institution : versionnées avec les autres réglages (nouvelle ligne par changement).
ALTER TABLE parametres_moteur ADD COLUMN frequences TEXT NOT NULL DEFAULT 'hebdomadaire';      -- liste séparée par des virgules
ALTER TABLE parametres_moteur ADD COLUMN duree_min_mois INTEGER NOT NULL DEFAULT 3 CHECK (duree_min_mois BETWEEN 3 AND 12);
ALTER TABLE parametres_moteur ADD COLUMN duree_max_mois INTEGER NOT NULL DEFAULT 12 CHECK (duree_max_mois BETWEEN 3 AND 12);
ALTER TABLE parametres_moteur ADD COLUMN delai_versement_h INTEGER NOT NULL DEFAULT 48 CHECK (delai_versement_h BETWEEN 1 AND 720);

-- Modalités demandées par le commerçant, puis éventuellement ajustées par l'agent (dans les limites de l'institution).
ALTER TABLE dossiers ADD COLUMN frequence TEXT NOT NULL DEFAULT 'hebdomadaire' CHECK (frequence IN ('hebdomadaire', 'quinzaine', 'mensuelle'));
ALTER TABLE dossiers ADD COLUMN duree_mois INTEGER;                -- NULL : durée de l'institution (n semaines)
ALTER TABLE dossiers ADD COLUMN frequence_demandee TEXT NOT NULL DEFAULT 'hebdomadaire';
ALTER TABLE dossiers ADD COLUMN duree_mois_demandee INTEGER;
ALTER TABLE decisions ADD COLUMN frequence TEXT;
ALTER TABLE decisions ADD COLUMN duree_mois INTEGER;
ALTER TABLE credits ADD COLUMN frequence TEXT NOT NULL DEFAULT 'hebdomadaire' CHECK (frequence IN ('hebdomadaire', 'quinzaine', 'mensuelle'));

-- Signature par code SMS (simulé : le code est affiché à l'écran dans la démo). Ajout seul.
CREATE TABLE codes_sms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commercant_id TEXT NOT NULL REFERENCES commercants(id),
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  empreinte TEXT NOT NULL,                       -- SHA-256 du code, jamais le code en clair
  emis_le TEXT NOT NULL,
  expire_le TEXT NOT NULL
);
CREATE TABLE signatures (                        -- usage d'un code : réussi ou non, tracé au journal ; ajout seul
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_id INTEGER REFERENCES codes_sms(id),
  commercant_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  resultat TEXT NOT NULL CHECK (resultat IN ('valide', 'refuse')),
  objet TEXT NOT NULL,
  horodatage TEXT NOT NULL
);
CREATE TRIGGER signatures_pas_de_modif BEFORE UPDATE ON signatures BEGIN SELECT RAISE(ABORT, 'ajout seul'); END;
CREATE TRIGGER signatures_pas_de_suppr BEFORE DELETE ON signatures BEGIN SELECT RAISE(ABORT, 'ajout seul'); END;
CREATE TRIGGER codes_pas_de_modif BEFORE UPDATE ON codes_sms BEGIN SELECT RAISE(ABORT, 'ajout seul'); END;
