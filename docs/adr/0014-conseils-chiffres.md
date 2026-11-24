# ADR 0014 : conseils chiffrés par le moteur, route `GET /commercants/{id}/conseils`

- Statut : accepté
- Date : 2026-11-24

## Contexte

La page « Faire monter mon plafond » montrait un conseil générique et des indicateurs bruts (régularité, part pro,
montants exclus) sans repère ni action ni effet. Le propriétaire veut des conseils personnalisés, rangés par
utilité, avec l'effet estimé sur le plafond calculé par le vrai moteur. `packages/engine` ne doit pas changer.

## Options envisagées

1. **Calcul dans le navigateur** : impossible, le moteur (simulation + modèle calibré) est en Python.
2. **Champs ajoutés à `/estimation`** : alourdit une route appelée souvent (simulateur) et mélange deux usages.
3. **Route dédiée** (retenu) : `GET /commercants/{id}/conseils`, même règle d'accès que `/estimation`
   (le commerçant lui-même ; 401 sans session, 403 pour un autre commerçant ou un rôle pro).

## Décision

- `services/api/kwedo_api/conseils.py` relance `plafond_complet` du moteur (même graine, mêmes paramètres, même
  modèle) sur des scénarios : +10 % d'encaissements sur le compte marchand ; écart d'une semaine à l'autre ramené
  à 40 % (total inchangé) ; historique au palier suivant (3 ou 6 mois) ; baisse récente annulée. Effet = plafond
  du scénario − plafond actuel, borné à 0.
- Leviers non chiffrables honnêtement (`effet: null`) : séparation de l'argent personnel (déjà exclu du calcul),
  clientèle variée, remboursements à l'heure (non lus par le moteur).
- Aucune valeur interne ne sort (risque, seuil, percentile, graine), comme pour `/estimation`.

## Conséquences

- Gagné : chaque conseil dit où l'on en est, pourquoi, quoi faire et combien cela rapporte ; déterministe.
- Coût : quelques appels supplémentaires au moteur par affichage (≈ 0,1 s sur la démo).
- Limite : les effets ne s'additionnent pas forcément (la formule peut plafonner) ; la page le dit.
- La route doit être ajoutée au test de contournement externe (`attaque.py`) par le propriétaire.
