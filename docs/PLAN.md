# Plan de construction

Synthèse du cahier de conception (37 pages, lu en entier) et du brief. Une étape = au moins un commit.

## Périmètre retenu (statuts « Prototype » et « Prototype (simulé) »)

**Commerçant** : inscription et identité (simulé), compte marchand séparé, connexion des flux (simulé), estimation,
simulateur « et si », conseils, envoi du dossier et consentement par institution, suivi, offre et acceptation,
remboursement (simulé), rappels (simulé), tableau de bord, gestion des consentements.

**Console** : file, fiche analysée, contrôles de cohérence, décision avec justificatif, journal de décision,
échéancier et décaissement (simulé), portefeuille, relances (simulé), paramètres du moteur.

**Moteur** : indicateurs, capacité et plafond, simulation, prévision (modèle), probabilité de défaut (modèle),
raisons, détection de manipulation (règles + modèle d'anomalies), cycle de recalibrage sur données simulées.

**Données** : générateur (deux paramétrages distincts). **Sécurité** : consentement et journal d'accès.

**Hors périmètre** (feuille de route seulement) : e-MECeF réel, relevé de trésorerie, USSD/langues locales,
export bureau de crédit, rôles et double validation, écarts humain/modèle, droits des personnes, chiffrement,
analyse de graphe.

## Étapes

| # | Étape | Livrable vérifiable |
|---|---|---|
| 0 | Socle | `PLAN.md`, monorepo, README, ADR 0001 |
| 1 | Contrats | `docs/contracts/` : schéma SQL, OpenAPI, règles de calcul |
| 2 | Générateur | `packages/generator`, deux générateurs, jeu de démo figé |
| 3 | Moteur | `packages/engine` + tests unitaires |
| 4 | Modèles | `ml/` : prévision, défaut, anomalies vs règles naïves |
| 5 | API | `services/api` FastAPI + SQLite, triggers ajout seul |
| 6 | Design system | tokens, typo, motif, courbe de flux |
| 7 | Commerçant P1 | estimation, simulateur, conseils |
| 8 | Console P1 | file, fiche, décision |
| 9 | Priorité 2 | parcours complet jusqu'au remboursement |
| 10 | Priorité 3 | tableau de bord, paramètres, audit, présentation |
| 11 | Évaluation | 7 questions, script reproductible |
| 12 | Démo | 9 temps, réinitialisation |
| 13 | Qualité | E2E Playwright, a11y, perf |
| 14 | Dossier final | Définition de terminé, preuves |

## Définition de terminé (cahier)

- Parcours complet sans intervention manuelle dans le code, de l'estimation au remboursement.
- Chaque montant affiché accompagné de ses raisons.
- Tout élément simulé étiqueté à l'écran.
- Décision de l'agent enregistrée avec son justificatif.
- Le moteur bat la règle naïve sur des profils jamais vus pendant le réglage.
- Une alerte de manipulation se déclenche sur un cas injecté.
