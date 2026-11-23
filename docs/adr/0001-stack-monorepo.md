# ADR 0001 : stack et organisation en monorepo

- **Statut** : accepté
- **Date** : 2026-11-23
- **Décideurs** : équipe Kwedo

## Contexte

Le brief impose une stack (Next.js, FastAPI, SQLite, moteur Python pur NumPy, ML scikit-learn/LightGBM) sur un VPS
partagé : pas de Docker, pas de sudo, pas de GPU, disque presque plein (budget 4 Go), pnpm absent.

## Options

1. Monorepo npm workspaces (front) + paquets Python côte à côte, un seul venv.
2. Dépôts séparés par composant.
3. Tout en TypeScript (moteur réécrit en JS).

## Décision

Option 1. Le moteur reste en Python pur + NumPy, sans état, importable par l'API, par `ml/` et par l'évaluation :
un seul code pour un dossier et pour les simulations massives (exigence du cahier).
SQLite en WAL suffit au prototype mono-machine. Le simulateur accepte un paramètre `backend` (`numpy` par défaut,
`cupy` optionnel) mais **aucun calcul n'a tourné sur GPU** : la machine n'en a pas.

## Conséquences

- Gagné : un seul moteur, déterministe, testable seul ; zéro service externe ; empreinte disque faible.
- Perdu : deux écosystèmes (npm + pip) ; pas de typage partagé natif front/back (compensé par l'OpenAPI figé).
