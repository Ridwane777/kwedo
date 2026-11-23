# Dépendances

## Bibliothèques

| Composant | Dépendance | Version | Licence | Usage |
|---|---|---|---|---|
| Moteur, générateur, ML, API | Python | 3.12.3 (système) | PSF | Langage |
| | NumPy | 1.26.4 (système) | BSD-3 | Calcul vectoriel, modèles |
| | sqlite3, http.server | bibliothèque standard | PSF | Base (WAL), serveur HTTP |
| Web | Next.js | 16.4.6 | MIT | Application |
| | React / React DOM | 19.3.1 | MIT | Interface |
| | Tailwind CSS (+ @tailwindcss/postcss) | 4.3.5 | MIT | Styles, tokens |
| | TypeScript | 5.9.3 | Apache-2.0 | Typage strict |
| | Fraunces, IBM Plex Sans (via `next/font`, auto-hébergées) | — | OFL-1.1 | Typographie |
| Tests | @playwright/test (+ Chromium 159) | 1.65.1 | Apache-2.0 | E2E, captures, mesures |
| | @axe-core/playwright | 4.14.0 | MPL-2.0 | Audit d'accessibilité |

Écarts au brief (stack imposée) : FastAPI, scikit-learn et LightGBM **non utilisés** car `pip install` a été refusé
dans la session de travail (ADR 0003 et 0004). Recharts/visx non utilisés : la courbe de flux est un SVG dessiné à
la main (signature du produit, aucune dépendance).

## API et fournisseurs externes

| Service | Statut prototype | Interface |
|---|---|---|
| Opérateur mobile money (flux, décaissement, encaissement) | **Simulé** (`OperateurSimule`) | `Operateur` (Protocol) |
| DGI e-MECeF (factures) | **Simulé**, format seulement (`EmecefSimule`) | `Emecef` |
| Notifications SMS / WhatsApp | **Simulé**, journal uniquement (`NotificationsSimulees`) | `Notifications` |
| Google Fonts | Téléchargement au build uniquement, puis servies localement | `next/font` |

## Secrets et quotas
Aucun secret, aucune clé, aucun service payant, aucun quota. Rien n'écoute ailleurs que sur 127.0.0.1
(API 3460, web 3461, tests 3462/3463).
