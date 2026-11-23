-- L'horloge simulée avance aussi avec le temps réel entre deux sauts : les événements du journal restent ordonnés.
ALTER TABLE horloge ADD COLUMN fixe_le_reel TEXT;
