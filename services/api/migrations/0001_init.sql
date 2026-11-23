-- Kwedo : schéma de données figé (étape 1). SQLite, mode WAL.
-- Séparation simulé / réel : chaque table métier porte `origine` ('simule' | 'reel').
-- Le prototype n'écrit que 'simule' ; une contrainte l'impose tant que le mode réel n'est pas activé.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE institutions (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,                       -- institutions fictives uniquement
  origine TEXT NOT NULL DEFAULT 'simule' CHECK (origine = 'simule')
);

CREATE TABLE parametres_moteur (           -- versionnés, jamais modifiés : une nouvelle ligne par changement
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  m REAL NOT NULL CHECK (m > 0 AND m <= 1),
  s REAL NOT NULL CHECK (s > 0 AND s <= 1),
  n INTEGER NOT NULL CHECK (n BETWEEN 1 AND 104),
  i REAL NOT NULL CHECK (i > 0 AND i < 0.2),
  percentile REAL NOT NULL CHECK (percentile BETWEEN 1 AND 50),
  seuil_risque REAL NOT NULL CHECK (seuil_risque > 0 AND seuil_risque < 1),
  auteur TEXT NOT NULL,
  cree_le TEXT NOT NULL
);

CREATE TABLE commercants (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,                       -- fictif ; aucune variable sensible (genre, origine, religion)
  telephone TEXT NOT NULL,
  type_activite TEXT NOT NULL,
  compte_marchand_ouvert_le TEXT,
  compte_separe INTEGER NOT NULL CHECK (compte_separe IN (0, 1)),
  identite_verifiee INTEGER NOT NULL DEFAULT 0,
  origine TEXT NOT NULL DEFAULT 'simule' CHECK (origine = 'simule')
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  commercant_id TEXT NOT NULL REFERENCES commercants(id),
  horodatage TEXT NOT NULL,
  montant INTEGER NOT NULL CHECK (montant > 0),   -- FCFA entiers
  sens TEXT NOT NULL CHECK (sens IN ('entree', 'sortie')),
  contrepartie TEXT NOT NULL,                      -- anonymisée (hachage)
  nature TEXT NOT NULL CHECK (nature IN ('paiement_client', 'retrait', 'transfert_personnel', 'transfert_soi')),
  origine TEXT NOT NULL DEFAULT 'simule' CHECK (origine = 'simule')
);
CREATE INDEX idx_tx_commercant ON transactions(commercant_id, horodatage);

CREATE TABLE factures (                           -- facultatif ; e-MECeF réel = phase 2
  id TEXT PRIMARY KEY,
  commercant_id TEXT NOT NULL REFERENCES commercants(id),
  date TEXT NOT NULL, montant INTEGER NOT NULL, client TEXT,
  code_mecef TEXT CHECK (code_mecef IS NULL OR length(code_mecef) = 24),
  nim TEXT CHECK (nim IS NULL OR length(nim) = 10),
  origine TEXT NOT NULL DEFAULT 'simule' CHECK (origine = 'simule')
);

CREATE TABLE consentements (                      -- explicite, horodaté, révocable, par institution
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commercant_id TEXT NOT NULL REFERENCES commercants(id),
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  action TEXT NOT NULL CHECK (action IN ('accorde', 'retire')),
  horodatage TEXT NOT NULL
);

CREATE TABLE dossiers (
  id TEXT PRIMARY KEY,
  commercant_id TEXT NOT NULL REFERENCES commercants(id),
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  statut TEXT NOT NULL CHECK (statut IN ('recu', 'en_analyse', 'complement', 'accorde', 'refuse', 'offre_acceptee', 'offre_refusee')),
  analyse_json TEXT NOT NULL,                     -- sortie complète du moteur (indicateurs, plafond, raisons, alertes)
  version_moteur TEXT NOT NULL,
  graine INTEGER NOT NULL,
  parametres_id INTEGER NOT NULL REFERENCES parametres_moteur(id),
  cree_le TEXT NOT NULL
);

CREATE TABLE decisions (                          -- journal en AJOUT SEUL
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id),
  type TEXT NOT NULL CHECK (type IN ('valide', 'ajuste', 'refuse', 'complement')),
  montant_propose INTEGER NOT NULL,
  montant_decide INTEGER,
  duree_semaines INTEGER,
  auteur TEXT NOT NULL,
  motif TEXT NOT NULL CHECK (length(trim(motif)) >= 10),
  version_moteur TEXT NOT NULL,
  parametres_json TEXT NOT NULL,
  graine INTEGER NOT NULL,
  horodatage TEXT NOT NULL
);
CREATE TRIGGER decisions_pas_de_modif BEFORE UPDATE ON decisions BEGIN SELECT RAISE(ABORT, 'journal de décision en ajout seul'); END;
CREATE TRIGGER decisions_pas_de_suppr BEFORE DELETE ON decisions BEGIN SELECT RAISE(ABORT, 'journal de décision en ajout seul'); END;

CREATE TABLE journal_acces (                      -- qui a vu quel dossier et quand ; AJOUT SEUL
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  acteur TEXT NOT NULL, dossier_id TEXT NOT NULL, action TEXT NOT NULL, horodatage TEXT NOT NULL
);
CREATE TRIGGER acces_pas_de_modif BEFORE UPDATE ON journal_acces BEGIN SELECT RAISE(ABORT, 'journal d''accès en ajout seul'); END;
CREATE TRIGGER acces_pas_de_suppr BEFORE DELETE ON journal_acces BEGIN SELECT RAISE(ABORT, 'journal d''accès en ajout seul'); END;

CREATE TABLE credits (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id),
  commercant_id TEXT NOT NULL, institution_id TEXT NOT NULL,
  montant INTEGER NOT NULL, duree_semaines INTEGER NOT NULL, taux_periode REAL NOT NULL,
  decaisse_le TEXT,
  origine TEXT NOT NULL DEFAULT 'simule' CHECK (origine = 'simule')
);

CREATE TABLE echeances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  credit_id TEXT NOT NULL REFERENCES credits(id),
  rang INTEGER NOT NULL, date_due TEXT NOT NULL,
  montant_attendu INTEGER NOT NULL, montant_recu INTEGER NOT NULL DEFAULT 0,
  statut TEXT NOT NULL CHECK (statut IN ('a_venir', 'payee', 'partielle', 'en_retard'))
);

CREATE TABLE paiements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  credit_id TEXT NOT NULL REFERENCES credits(id),
  montant INTEGER NOT NULL, horodatage TEXT NOT NULL, recu TEXT NOT NULL,
  origine TEXT NOT NULL DEFAULT 'simule' CHECK (origine = 'simule')
);

CREATE TABLE relances (                           -- éthique : canal choisi, max 3 / échéance, 8 h-19 h, jamais l'entourage
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  echeance_id INTEGER NOT NULL REFERENCES echeances(id),
  canal TEXT NOT NULL CHECK (canal IN ('sms', 'whatsapp', 'appli')),
  message TEXT NOT NULL, horodatage TEXT NOT NULL,
  envoye INTEGER NOT NULL DEFAULT 0                -- 0 : affiché dans le journal (simulé)
);

CREATE TABLE interventions (                      -- reprogrammation, changement de statut : tracées, ajout seul
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  echeance_id INTEGER NOT NULL, auteur TEXT NOT NULL, avant TEXT NOT NULL, apres TEXT NOT NULL,
  motif TEXT NOT NULL, horodatage TEXT NOT NULL
);
CREATE TRIGGER interv_pas_de_modif BEFORE UPDATE ON interventions BEGIN SELECT RAISE(ABORT, 'ajout seul'); END;
CREATE TRIGGER interv_pas_de_suppr BEFORE DELETE ON interventions BEGIN SELECT RAISE(ABORT, 'ajout seul'); END;
