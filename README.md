# Kwedo

Prototype d'une plateforme de crédit pour petits commerçants sans historique bancaire
(GPU Challenge, cas d'usage 3). Deux volets reliés par un même moteur :

- **Application commerçant** : plafond expliqué et affiché avec ses conditions (fréquence, durée, institution),
  simulateur « et si », conseils chiffrés, dépôt du dossier avec montant demandé libre et objet, accord signé par code
  SMS simulé, suivi, offre ou contre-proposition, échéancier, remboursement.
- **Console prêteur** : Aujourd'hui, Demandes (à décider, complément, en attente, traitées), Crédits, Recouvrement,
  Commerçants ; fiche centrée sur le risque de la demande, décision humaine tracée avec justificatif.

> **Données 100 % synthétiques.** Personnes et institutions fictives. Aucun score affiché n'est une performance réelle.

Source de vérité produit : `Kwedo-cahier-de-conception.pdf`. Organisation : `docs/BRIEF.md`. Plan : `docs/PLAN.md`.
Avancement : `docs/PROGRESS.md`.

## Arborescence

| Dossier | Rôle |
|---|---|
| `apps/web` | Next.js : `/` présentation, `/app` commerçant, `/console` prêteur, `/demo` scénario guidé |
| `services/api` | FastAPI + SQLite (WAL), journal en ajout seul |
| `packages/engine` | Moteur d'analyse (NumPy + LightGBM), sans état, déterministe |
| `packages/generator` | Générateurs de commerçants simulés : réglage et test (évaluation), réalisme (démo seulement, calé sur des agrégats publics) |
| `ml/` | Entraînement et évaluation des modèles (CPU, 4 threads max) |
| `docs/` | Plan, ADR, contrats, légal, performance, business, rétrospective |

## Moteur, en une formule

```
R     = C_p × m × s                      (échéance supportable par période : semaine, quinzaine ou mois)
L_max = R × (1 − (1 + i)^−n) / i         (plafond théorique, n échéances, taux i de la période)
```

Le plafond proposé est le plus gros montant dont le risque d'impayé **calibré** (simulation + modèle LightGBM v3 avec
fréquence et durée en entrée + calibration isotonique par fréquence, ADR 0007/0008/0016) reste sous le seuil de
l'institution **et** sous `L_max`, jamais au-dessus. Pour une demande libre, le moteur calcule aussi le risque du
montant demandé (ADR 0017).

## Lancer

```
npm install                                          # dépendances web et tests
python3 -m venv .venv && .venv/bin/python -m pip install -r requirements.txt   # Python épinglé, dans .venv seulement
npm run api                                          # API FastAPI sur 127.0.0.1:3460 (charge la démo figée au premier lancement)
npm --workspace apps/web run build && npm --workspace apps/web run start   # web sur 127.0.0.1:3461
```

### Lancer avec Docker (ADR 0013)

Sur une machine où Docker est disponible (pas sur le VPS partagé) :

```
docker compose up --build                            # api (3460) puis web (3461), base SQLite dans le volume kwedo-db
```

Puis ouvrir http://localhost:3461. La démo figée est chargée au premier démarrage ; `docker compose down -v` repart
d'une base vierge.

Puis ouvrir `/demo` (scénario guidé), `/app` (commerçant, pensé pour 360 px) ou `/console` (prêteur).

## Accès et profils (ADR 0009)

`/connexion` propose sept profils fictifs : commerçant, commerçant à risque, agent et responsable de deux institutions
(Lagune, Baobab), admin général. L'API fait respecter les droits (session signée en cookie HttpOnly) : une institution
ne voit que ses demandes, crédits, commerçants, paramètres et journal ; seul le responsable modifie les paramètres ; le commerçant
ne reçoit jamais m, s, percentile, seuil, L_max, R, alertes ni modèles ; l'admin supervise sans lire de dossier, de
nom de commerçant ni de valeur de réglage.

**Limite : le choix de profil n'est pas une authentification (pas de mot de passe).** Le cloisonnement est réel,
mais n'importe quel visiteur peut choisir n'importe quel profil. Définir `KWEDO_SECRET` pour garder les sessions
après un redémarrage de l'API.

## Tester

```
npm run test:engine                                                   # moteur (25 tests)
npm run test:gen                                                      # générateur (14)
npm run test:api                                                      # API FastAPI et cloisonnement (38)
npx playwright install chromium && npx playwright test                # E2E, accessibilité en clair et en sombre, menu de compte, thème, écrans par rôle à 360/1440 px, ports 3462/3463
```

## Évaluer

**Fiche de résultats (référence, mesures, erreurs, limites) : [`docs/RESULTATS.md`](docs/RESULTATS.md).**

Évaluation actuelle (modèle v3) : voir le paragraphe « Risque toutes fréquences » ci-dessous. Historique (run final 1,
modèle v2, `ml/dataset.py` → `ml/train.py` → `ml/evaluate_final.py`, `docs/evaluation/protocole-final.md`) : le moteur
manque **0,93 %** des échéances contre ≈ 1,24 % pour les règles « moyenne/médiane × k » à exposition égale sur
l'ensemble du test (écart significatif), **mais pas mieux qu'elles sur les activités jamais vues**, et son risque
annoncé reste sous-estimé hors du domaine de réglage. Critères de la passe de correction **non atteints**.

Risque toutes fréquences (ADR 0016, run unique `docs/evaluation/runs/2026-11-24-frequences/`) : dans les 12 cellules
fréquence × durée, le moteur manque moins d'échéances que les règles naïves à exposition égale (ex. mensuel 6 mois :
1,89 % contre 2,35 %), toujours pas mieux sur les activités jamais vues, risque encore sous-estimé (ECE 0,05 à 0,09).

## Documentation

`docs/RESULTATS.md` (fiche de résultats), `docs/PLAN.md`, `docs/PROGRESS.md`, `docs/DEFINITION-DE-TERMINE.md`,
`docs/adr/`, `docs/contracts/`, `docs/evaluation/` (dont `diagnostic/` et `bceao/`), `docs/data/` (sources publiques et
licences), `docs/performance/`, `docs/design.md`, `docs/legal/`, `docs/business/`, `docs/dependencies.md`,
`docs/retrospective/`.
