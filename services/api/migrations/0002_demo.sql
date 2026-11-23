-- Canal de rappel choisi par le commerçant, horloge simulée de la démo, mesures de temps de traitement.
ALTER TABLE commercants ADD COLUMN canal TEXT NOT NULL DEFAULT 'sms' CHECK (canal IN ('sms', 'whatsapp', 'appli'));
ALTER TABLE commercants ADD COLUMN cree_le TEXT;
ALTER TABLE dossiers ADD COLUMN ouvert_le TEXT;           -- première ouverture par un agent
ALTER TABLE dossiers ADD COLUMN decide_le TEXT;
ALTER TABLE dossiers ADD COLUMN montant_offre INTEGER;
ALTER TABLE dossiers ADD COLUMN duree_offre INTEGER;
CREATE TABLE horloge (id INTEGER PRIMARY KEY CHECK (id = 1), maintenant TEXT NOT NULL);
