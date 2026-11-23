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

## Lancer les tests du moteur

```
npm run test:engine
```

Ports locaux réservés : API `127.0.0.1:3460`, web `127.0.0.1:3461`.
