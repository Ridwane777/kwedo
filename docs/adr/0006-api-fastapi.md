# ADR 0006 : API sur FastAPI (remplace ADR 0004)

- **Statut** : accepté, remplace [ADR 0004](0004-api-bibliotheque-standard.md)
- **Date** : 2026-11-23
- **Décideurs** : équipe Kwedo

## Contexte

L'ADR 0004 avait écarté FastAPI parce que `pip install` était refusé. La passe de correction (`docs/CORRECTIONS.md`, C1)
autorise désormais `pip install` dans `~/kwedo/.venv` uniquement. Le brief impose FastAPI.

## Options

1. Garder `http.server` : aucun gain, écart au brief maintenu.
2. Réécrire chaque route en signature FastAPI typée (Pydantic) : risque de changer les codes d'erreur (FastAPI renvoie
   422 avec un corps `detail` différent) et donc le contrat consommé par le web.
3. Monter la table de routes existante (indépendante du transport) sur FastAPI, avec lecture du corps JSON maison
   pour conserver exactement `{"erreur": …}`, 404 « route inconnue », 422, 201 sur les créations et `Server-Timing`.

## Décision

Option 3. `services/api/kwedo_api/app.py` traduit chaque motif `(?P<x>…)` en chemin `{x}`, revérifie le motif du
paramètre (ex. `\d+` pour les échéances) et exécute le service dans le pool de threads de Starlette sous le même verrou
SQLite. Serveur : uvicorn, `127.0.0.1` seulement. Dépendances épinglées dans `requirements.txt`, installées dans `.venv`.

## Conséquences

- Gagné : conformité au brief, documentation OpenAPI générée sur `/docs` (en plus du contrat écrit à la main),
  client de test (`fastapi.testclient`) ; un test vérifie les codes du contrat (404, 422, 201).
- Inchangé : `Service`, schéma SQL, contrat `docs/contracts/openapi.yaml`, front.
- Perdu : démarrage un peu plus lent (import FastAPI), dépendance à `.venv` pour lancer l'API et les E2E.
- Validation Pydantic des corps non utilisée volontairement, pour ne pas changer le format des erreurs.
