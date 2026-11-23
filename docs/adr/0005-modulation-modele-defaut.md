# ADR 0005 : le modèle de défaut peut baisser le plafond, jamais le monter

- **Statut** : accepté
- **Date** : 2026-11-23
- **Décideurs** : équipe Kwedo

## Contexte

L'évaluation à exposition égale a montré que la formule + simulation seule ne classe pas mieux que la règle
« médiane × k » sur données simulées. Le modèle de défaut (AUC 0,74 sur le test) classe mieux que les règles.

## Options

1. Garder le modèle purement informatif.
2. Plafond = plafond_formule_simulation × exp(−γ · p_défaut), γ choisi par balayage sur le **réglage** seul.
3. Remplacer la formule par le modèle.

## Décision

Option 2 avec γ = 4 (meilleur point sur le réglage : 6,0 % d'impayés contre 6,8 % pour la règle médiane).
La formule reste le garde-fou (test unitaire `test_modele_ne_depasse_jamais_la_formule`). La réduction est une
raison affichée, avec son montant. Le modèle lit l'historique réel, jamais le scénario de choc (sinon le curseur
« mes ventes baissent » pouvait faire monter le plafond : défaut trouvé par test et corrigé).

## Conséquences

- Gagné : un montant qui tient compte du classement appris, toujours explicable et borné.
- Perdu : une raison de plus à expliquer ; dépendance à un modèle entraîné sur données simulées (à réentraîner en pilote).
- Constat : sur le test, l'avantage n'est **pas** démontré (voir `docs/evaluation/README.md`).
