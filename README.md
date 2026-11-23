# Kwedo

Prototype d'une plateforme de crédit pour petits commerçants sans historique bancaire
(GPU Challenge, cas d'usage 3). Deux volets reliés par un même moteur :

- **Application commerçant** : estimation de crédit expliquée, simulateur « et si », conseils, envoi du dossier,
  suivi, offre, échéancier, remboursement.
- **Console prêteur** : file de dossiers analysés, décision humaine tracée avec justificatif, portefeuille, relances.

> **Données 100 % synthétiques.** Personnes et institutions fictives. Aucun score affiché n'est une performance réelle.

Source de vérité produit : `Kwedo-cahier-de-conception.pdf`. Organisation : `docs/BRIEF.md`. Plan : `docs/PLAN.md`.
Avancement : `docs/PROGRESS.md`.

## Arborescence

| Dossier | Rôle |
|---|---|
| `apps/web` | Next.js : `/` présentation, `/app` commerçant, `/console` prêteur, `/demo` scénario guidé |
| `services/api` | FastAPI + SQLite (WAL), journal en ajout seul |
| `packages/engine` | Moteur d'analyse, Python pur + NumPy, sans état, déterministe |
| `packages/generator` | Générateurs de commerçants simulés (réglage et test) |
| `ml/` | Entraînement et évaluation des modèles (CPU, 4 threads max) |
| `docs/` | Plan, ADR, contrats, légal, performance, business, rétrospective |

## Moteur, en une formule

```
R     = C_p × m × s                      (échéance hebdomadaire supportable)
L_max = R × (1 − (1 + i)^−n) / i         (plafond théorique)
```

Le plafond proposé est le plus gros montant dont le risque simulé reste sous le seuil de l'institution **et** sous `L_max`.

## Lancer

```
npm install                                          # dépendances web et tests
python3 services/api/serveur.py                      # API sur 127.0.0.1:3460 (charge la démo figée au premier lancement)
npm --workspace apps/web run build && npm --workspace apps/web run start   # web sur 127.0.0.1:3461
```

Puis ouvrir `/demo` (scénario guidé), `/app` (commerçant, pensé pour 360 px) ou `/console` (prêteur).

## Tester

```
npm run test:engine                                                   # moteur (14 tests)
(cd packages/generator && python3 -m unittest discover -s tests -t .) # générateur (7)
(cd services/api && python3 -m unittest discover -s tests -t .)       # API (5)
npx playwright install chromium && npx playwright test                # E2E + accessibilité (19), ports 3462/3463
```

## Évaluer

`ml/dataset.py` → `ml/train.py` → `ml/evaluate.py` (voir `docs/evaluation/README.md`).
Résultat clé, à lire avant tout : **sur données simulées, le moteur ne classe pas mieux qu'une règle
« médiane × k »** ; il apporte explicabilité, prudence bornée, traçabilité et détection des manipulations.

## Documentation

`docs/PLAN.md`, `docs/PROGRESS.md`, `docs/DEFINITION-DE-TERMINE.md`, `docs/adr/`, `docs/contracts/`,
`docs/evaluation/`, `docs/performance/`, `docs/design.md`, `docs/legal/`, `docs/business/`, `docs/dependencies.md`,
`docs/retrospective/`.
