# Mission Docker (branche `docker`)

Demande du propriétaire : pouvoir lancer tout le projet avec une seule commande, `docker compose up`.

## Contraintes du VPS (impératives)
- Docker est INTERDIT sur ce VPS partagé : ne jamais lancer `docker`, aucune image construite ici. On écrit les fichiers ; les tests se feront sur une autre machine.
- Ne pas modifier `packages`, `ml`, `services`, `docs/evaluation/runs` (sauf si un chemin codé en dur empêche de lancer en conteneur : alors passer par une variable d'environnement avec la valeur actuelle par défaut, et le justifier dans le commit).
- Le mode npm actuel doit continuer à marcher à l'identique.

## À livrer
1. `docker/api.Dockerfile` : Python 3 slim, dépendances épinglées du projet, moteur et modèles déjà entraînés copiés, base de démo initialisée au démarrage, écoute sur 0.0.0.0:3460.
2. `docker/web.Dockerfile` : Node 22, build multi-étapes, sortie `standalone` si possible, port 3461, l'URL de l'API passée par variable d'environnement (le proxy la lit à l'exécution).
3. `docker-compose.yml` à la racine : services `api` et `web`, `web` dépend de `api` avec un healthcheck, volume nommé pour la base SQLite, ports 3460 et 3461.
4. `.dockerignore` : exclure `.venv`, `node_modules`, `.next`, `.captures`, navigateurs de test, `docs/evaluation/runs`, `.git`.
5. Le README : section « Lancer avec Docker » (`docker compose up --build`, puis http://localhost:3461) à côté de la section npm.
6. ADR `docs/adr/0013-...md` : double mode de lancement (npm sur le VPS partagé sans Docker ni sudo, Docker pour la démo et l'évaluation), options envisagées, gagné/perdu, et mettre à jour l'index. Ne réécrire aucun ADR existant.
7. Mettre à jour `docs/PROGRESS.md` en disant honnêtement que les images n'ont pas été construites sur le VPS.

## Règles
- Aucune mention d'IA ou de Claude dans les commits.
- `npm run test:api` et `npm run build:web` doivent rester verts.
- Commits poussés sur `origin docker`, puis `touch ~/kwedo-ops/DONE`. En cas de blocage, écrire la raison dans `~/kwedo-ops/BLOCKED`.
