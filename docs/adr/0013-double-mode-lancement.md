# ADR 0013 : double mode de lancement, npm et Docker

- Statut : accepté
- Date : 2026-11-24

## Contexte

Le propriétaire veut lancer tout le projet en une commande, `docker compose up`, pour la démo et l'évaluation sur
d'autres machines. Le développement se fait sur un VPS partagé où Docker est interdit et où l'on n'a pas `sudo` :
tout y tourne en `npm` + `.venv`, liés à 127.0.0.1.

## Options envisagées

1. **Docker seul** : une seule façon de lancer, mais impossible à utiliser ni à tester sur le VPS.
2. **npm seul** (statu quo) : demande Python, Node 22, un venv et quatre commandes ; fragile hors du VPS.
3. **Les deux** (retenu) : le mode npm reste la référence sur le VPS ; Docker est une enveloppe autour du même code.

## Décision

- `docker/api.Dockerfile` : Python 3.12 slim, `requirements.txt` épinglé, moteur, générateur, modèles déjà
  entraînés (`ml/artifacts`) et démo figée copiés avec l'arborescence du dépôt (les chemins relatifs restent
  valides) ; base SQLite dans le volume `/data`, initialisée si vide.
- `docker/web.Dockerfile` : Node 22, multi-étapes, sortie `standalone` de Next ; `KWEDO_API` lu à l'exécution.
- `docker-compose.yml` : `web` attend que `api` soit saine (healthcheck sur `/auth/profils`).
- Seul changement de code : l'API lit `KWEDO_HOST` (défaut `127.0.0.1`, inchangé) pour écouter sur `0.0.0.0` en
  conteneur ; `next.config.ts` ajoute `output: "standalone"`, sans effet sur `next build` / `next start`.

## Conséquences

- Gagné : une commande pour la démo et l'évaluation, environnement reproductible, aucun impact sur le VPS.
- Perdu : deux modes à maintenir (dépendances à garder alignées) ; les images n'ont pas pu être construites ni
  testées sur le VPS, la première construction réelle se fera ailleurs.
