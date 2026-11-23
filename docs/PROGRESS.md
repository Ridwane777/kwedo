# Avancement

| # | Étape | Statut | Commit | Preuve | Blocages |
|---|---|---|---|---|---|
| 0 | Socle | fait | 99b8fc1 | poussé sur origin/main | — |
| 1 | Contrats | fait | (ce commit) | `schema.sql` chargé dans SQLite en mémoire sans erreur | — |
| 2 | Générateur | fait | voir git log | 7 tests unitaires OK ; `data/demo/demo.json` d'empreinte `b6049c91…` stable | — |
| 3 | Moteur | fait | voir git log | 11 tests unitaires OK ; démo : alertes sur les 2 cas injectés, 0 sur les honnêtes ; 0,01–0,21 s par dossier | — |
| 4 | Modèles | fait (écart ADR 0003) | voir git log | `ml/artifacts/metriques-v1.json` : défaut AUC 0,737 vs règle naïve 0,497 (0,80 hors réglage) ; prévision erreur 12,2 % vs 13,3 % (15,3 % vs 20,3 % hors réglage) ; détection règles+modèle 100 % des 58 cas injectés, 6,1 % de fausses alertes | `pip install` refusé → NumPy pur |
| 5 | API | à faire | | | idem : FastAPI absent |
| 6–13 | Web, démo, qualité | à faire | | | `npm install` à vérifier |
| 14 | Dossier final | à faire | | | |

## Environnement constaté (2026-11-23)

- Node 22.22.3, npm 10.9.8, Python 3.12.3, NumPy 1.26.4 (système). 8 cœurs, pas de GPU.
- Disque : 20 Go libres sur 387 Go (96 % utilisé).
- `pip install` dans `.venv` : refusé par la politique de permissions de la session. Option prudente :
  générateur et moteur en Python pur + NumPy (déjà disponibles) ; API et ML en attente d'une autorisation.
