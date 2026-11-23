# ADR 0004 : API sur la bibliothèque standard Python plutôt que FastAPI

- **Statut** : accepté
- **Date** : 2026-11-23
- **Décideurs** : équipe Kwedo

## Contexte

Le brief impose FastAPI. `pip install` est refusé dans la session de travail sur le VPS (voir ADR 0003).

## Options

1. Bloquer l'étape 5 et tout le front en attendant FastAPI.
2. `http.server` (ThreadingHTTPServer) + `sqlite3` : routeur minimal par expressions régulières,
   logique métier isolée dans `service.py`, contrat `docs/contracts/openapi.yaml` respecté.
3. Faire porter l'API par les routes Next.js (impossible d'appeler le moteur Python sans pont).

## Décision

Option 2. La logique métier (`Service`) ne dépend pas du transport : migrer vers FastAPI revient à réécrire `app.py`
(≈ 150 lignes) sans toucher au reste. Une seule connexion SQLite (WAL) et un verrou sérialisent les requêtes.

## Conséquences

- Gagné : aucune dépendance, démarrage instantané, tests sans serveur externe.
- Perdu : pas de validation Pydantic ni de documentation OpenAPI générée (le contrat est écrit à la main) ;
  débit limité par le verrou (suffisant pour une démo mono-utilisateur). Pas d'authentification : l'acteur est
  déclaré par l'en-tête `X-Acteur` (rôles = phase 2).
- Le reset de démo supprime le fichier SQLite et le recrée : les triggers « ajout seul » ne sont jamais contournés.
