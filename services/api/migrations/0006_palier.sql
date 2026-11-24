-- Crédit progressif (ADR 0018) : politique de palier par institution, versionnée comme les paramètres du moteur.
-- Le moteur n'est pas touché : le palier limite, par-dessus, le montant accordable.
CREATE TABLE politique_palier (                   -- une nouvelle ligne par changement, jamais modifiée
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  palier_initial INTEGER NOT NULL CHECK (palier_initial BETWEEN 5000 AND 5000000),
  multiplicateur REAL NOT NULL CHECK (multiplicateur >= 1 AND multiplicateur <= 3),
  retard_grave_jours INTEGER NOT NULL CHECK (retard_grave_jours BETWEEN 1 AND 90),
  apres_defaut TEXT NOT NULL CHECK (apres_defaut IN ('redescendre', 'bloquer')),
  auteur TEXT NOT NULL,
  cree_le TEXT NOT NULL
);
CREATE TRIGGER palier_pas_de_modif BEFORE UPDATE ON politique_palier BEGIN SELECT RAISE(ABORT, 'ajout seul'); END;
CREATE TRIGGER palier_pas_de_suppr BEFORE DELETE ON politique_palier BEGIN SELECT RAISE(ABORT, 'ajout seul'); END;

-- Date à laquelle une échéance a été soldée : le retard d'un crédit se lit dans les échéances stockées.
ALTER TABLE echeances ADD COLUMN soldee_le TEXT;

-- Décision : palier en vigueur au moment de décider, et motif si l'agent l'a dépassé (tracé, ajout seul inchangé).
ALTER TABLE decisions ADD COLUMN palier INTEGER;
ALTER TABLE decisions ADD COLUMN motif_depassement TEXT;
