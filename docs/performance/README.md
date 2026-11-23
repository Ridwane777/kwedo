# Performance

## Méthode

`node scripts/perf.mjs > docs/performance/resultats.json`, API (3460) et web en build de production (3461) lancés.
API : 30 appels par route (3 pour la réinitialisation), p50 / p95 / max. Pages : 5 chargements à froid par page
(nouveau contexte navigateur), médianes du TTFB, DOMContentLoaded et LCP, poids du JavaScript non compressé.

Machine : AMD EPYC, 8 cœurs, 23 Go, **pas de GPU**, machine partagée avec d'autres processus (bruit possible).
Conditions : 127.0.0.1, sans limitation réseau ni CPU. Ce ne sont **pas** des mesures sur un téléphone en 3G.

## Seuils retenus

| Mesure | Seuil |
|---|---|
| Estimation (y compris curseur de choc) | p95 < 500 ms |
| Autres routes API | p95 < 200 ms |
| LCP de chaque page (local) | < 2 500 ms |

## Résultats du 2026-11-23 (fichier complet : `resultats.json`)

| Route API | p50 | p95 |
|---|---|---|
| Estimation (2 000 trajectoires) | ≈ 96 ms | 221–277 ms |
| File de dossiers | ≈ 13 ms | 37–46 ms |
| Fiche dossier | ≈ 17 ms | 33–82 ms |
| Portefeuille | ≈ 6 ms | 18–33 ms |
| Réinitialisation de la démo | 3,4 s | 9,4 s |

| Page | LCP médian | JS (Ko, non compressé) |
|---|---|---|
| `/` | 956 ms | 224 |
| `/app` (360 px) | 1 760 ms (2 348 ms avant correctif) | 405 |
| `/app/simulateur` | 500 ms | 238 |
| `/console` | 656 ms | 404 |
| Fiche dossier | 968 ms | 236 |
| `/demo` | 772 ms | 197 |

Les fourchettes viennent de deux exécutions successives. Tous les seuils sont respectés, sauf la réinitialisation
de la démo (hors seuil : action d'animateur, recharge ≈ 20 000 transactions et ré-analyse 6 dossiers).

## Correctifs issus des mesures

- `/app` : profil et estimation chargés en parallèle (LCP −25 %).

## Moteur (calcul)

Voir `docs/evaluation/README.md` §8 : analyse complète 0,07 s par dossier (v0.1) ; ≈ 330 000 trajectoires/s sur CPU.

### Après la passe de correction (moteur 0.2.0, FastAPI, LightGBM), 2026-11-23

Mesuré en processus (client de test FastAPI, sans réseau), 30 appels, machine partagée :

| Mesure | p50 | p95 | Seuil |
|---|---|---|---|
| Analyse complète d'un dossier (modèle + 3 raisons recalculées) | 86 ms (moyenne) | — | — |
| `GET /commercants/{id}/estimation` avec choc | 112 ms | 281 ms | < 500 ms ✅ |
| `GET /dossiers` | 17 ms | 105 ms | < 200 ms ✅ |

Les pages web n'ont pas été remesurées : seul le chronomètre a été ajouté à la fiche dossier (aucune requête réseau) ;
il a depuis été retiré sur décision produit.
Un backend `cupy` est prévu dans `simuler_seuils` mais **n'a jamais tourné** (pas de GPU).
