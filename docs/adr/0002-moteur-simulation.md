# ADR 0002 : moteur, simulation par blocs, graine et backend

- **Statut** : accepté
- **Date** : 2026-11-23
- **Décideurs** : équipe Kwedo

## Contexte

Le cahier exige un plafond ≤ `L_max`, testé par simulation (blocs de semaines réelles + chocs), déterministe et rejouable.

## Options

1. Simulation pas à pas avec réserve, puis recherche dichotomique du montant.
2. Forme fermée : pour chaque trajectoire, l'échéance maximale payable sans incident est `min_t cumul[t]/(t+1)`
   (report du surplus). Le risque d'un montant est la part des trajectoires sous son échéance ; le plafond
   simulé est le quantile au seuil de l'institution.

## Décision

Option 2 : exacte pour la règle « au moins une échéance manquée », vectorisée, une seule passe par dossier,
monotone par construction. Graine passée en paramètre et enregistrée avec la décision. Paramètre `backend`
(`numpy`, `cupy`) : **cupy n'a jamais tourné, la machine n'a pas de GPU**.

## Conséquences

- Gagné : ~0,1 s par dossier avec 2 000 trajectoires sur CPU ; plafond exactement monotone ; rejouable.
- Perdu : la règle de paiement est simplifiée (pas de remboursement partiel en simulation, pas de rattrapage).
