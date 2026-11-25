# ADR 0020 : preuve externe pour la fréquence au choix (note complémentaire à l'ADR 0015)

- Statut : accepté (complète l'[ADR 0015](0015-frequence-duree-au-choix.md) sans la réécrire)
- Date : 2026-11-25

## Contexte

L'ADR 0015 laisse le commerçant choisir la fréquence (hebdomadaire, quinzaine, mensuelle). Le risque par fréquence
est appris sur données simulées (ADR 0016) : aucune donnée réelle ne disait encore si rembourser au mois est plus
risqué qu'à la semaine. La recherche de données publiques du 25/11/2026 (`docs/data/README.md`) en apporte une.

## Preuve externe

**Field & Pande**, *Repayment Frequency and Default in Microfinance: Evidence from India* (essai randomisé, clients
d'une institution de microfinance de Calcutta) : les groupes tirés au sort pour un remboursement **mensuel** n'ont
**pas** eu plus de retards ni de défauts que ceux au remboursement **hebdomadaire** (aucun effet significatif).

Repère de pratique : chez Kiva au Bénin, 94 % des prêts financés sont remboursés au mois, durée médiane 12 mois
(agrégats, données issues de Kiva).

## Décision

Garder la fréquence au choix ; aucun changement de code. La preuve soutient l'option 3 de l'ADR 0015 : ne pas imposer
l'hebdomadaire par prudence.

## Limites

Autre pays (Inde), prêts de groupe, montants et population différents des commerçants béninois ; un résultat nul ne
prouve pas l'absence d'effet. Le risque par fréquence de Kwedo reste celui du simulateur, à vérifier au pilote.
