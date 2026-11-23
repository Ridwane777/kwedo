# Avancement

| # | Étape | Statut | Commit | Preuve | Blocages |
|---|---|---|---|---|---|
| 0 | Socle | fait | 99b8fc1 | poussé sur origin/main | — |
| 1 | Contrats | fait | (ce commit) | `schema.sql` chargé dans SQLite en mémoire sans erreur | — |
| 2 | Générateur | fait | voir git log | 7 tests unitaires OK ; `data/demo/demo.json` d'empreinte `b6049c91…` stable | — |
| 3 | Moteur | fait | voir git log | 11 tests unitaires OK ; démo : alertes sur les 2 cas injectés, 0 sur les honnêtes ; 0,01–0,21 s par dossier | — |
| 4 | Modèles | fait (écart ADR 0003) | voir git log | `ml/artifacts/metriques-v1.json` : défaut AUC 0,737 vs règle naïve 0,497 (0,80 hors réglage) ; prévision erreur 12,2 % vs 13,3 % (15,3 % vs 20,3 % hors réglage) ; détection règles+modèle 100 % des 58 cas injectés, 6,1 % de fausses alertes | `pip install` refusé → NumPy pur |
| 5 | API | fait (écart ADR 0004) | voir git log | 5 tests : parcours estimation → consentement → dossier → décision ajustée → offre → échéancier → paiement → retard → relances → portefeuille → rejeu identique ; triggers refusent UPDATE/DELETE ; 403 sans consentement | FastAPI absent → stdlib |
| 6 | Design system | fait | voir git log | `next build` OK ; `/design` capturé à 360 et 1440 px et relu (correctifs : espace insécable des montants, crénage) ; contrastes mesurés dans `docs/design.md` | navigateur Playwright installé dans `~/.cache/ms-playwright` (≈ 330 Mo, hors `~/kwedo`, emplacement par défaut de l'outil) |
| 7 | Commerçant P1 | fait | voir git log | `/app`, `/app/simulateur`, `/app/conseils` construits et capturés à 360 px contre l'API réelle ; correctifs typographiques (espaces insécables avant « ? » et « % ») | — |
| 8 | Console P1 | fait | voir git log | `/console` (file triée, filtres, j/k/Entrée) et fiche `/console/dossiers/[id]` (indicateurs, courbe, raisons, chaîne de calcul, alertes, décision v/a/r/c avec justificatif) capturées à 1440 px ; relecture → bogue moteur corrigé (raison « tendance » de signe inversé) + test de non-régression | — |
| 9 | Priorité 2 | fait | voir git log | Écrans inscription, compte, flux, dossier/consentements/suivi, offre (contre-proposition), crédit (échéancier, paiement, reçus, canal), portefeuille/relances/reprogrammation. `e2e/parcours.spec.ts` passe (43 s) ; relecture des captures → marqueurs internes « [J+n] » retirés des messages | — |
| 10 | Priorité 3 | fait | voir git log | `/app/activite`, `/console/parametres` (versions, jamais de réécriture), `/console/journal` (filtrable), `/` présentation ; captures relues → horloge simulée rendue continue (journal ordonné), montants formatés, mention « à recontrôler » lisible ; E2E repassé (38,6 s) | — |
| 11–13 | Évaluation, démo, qualité | à faire | | | |
| 14 | Dossier final | à faire | | | |

## Environnement constaté (2026-11-23)

- Node 22.22.3, npm 10.9.8, Python 3.12.3, NumPy 1.26.4 (système). 8 cœurs, pas de GPU.
- Disque : 20 Go libres sur 387 Go (96 % utilisé).
- `pip install` dans `.venv` : refusé par la politique de permissions de la session. Option prudente :
  générateur et moteur en Python pur + NumPy (déjà disponibles) ; API et ML en attente d'une autorisation.
