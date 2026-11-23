# Coûts

## Mesuré (prototype, 2026-11-23)

| Poste | Mesure |
|---|---|
| Calcul d'une analyse complète | 0,07 s CPU par dossier (`docs/evaluation/README.md`) |
| Simulation | ≈ 330 000 trajectoires/s sur 1 cœur AMD EPYC |
| Génération + entraînement + évaluation complets | quelques minutes sur 4 cœurs, sans GPU |
| Disque | 654 Mo (projet, dépendances comprises) + 701 Mo (navigateurs de test, `~/.cache`) |
| Services externes payants | 0 (tous les connecteurs sont simulés) |

## Estimé, non chiffré (aucune donnée de prix disponible)

Calcul et hébergement de production ; SMS / WhatsApp pour les rappels ; vérification d'identité ; intégration et
support des institutions ; conformité (DPO, conseil juridique, déclarations APDP) ; passerelle de paiement ;
entité enregistrée au Bénin. Chaque poste se chiffre sur devis pendant la préparation du pilote.

Ordre de grandeur **déductible des mesures** : le service de décision tient sur un processeur ordinaire (≈ 14 dossiers
par seconde et par cœur). Le GPU n'est pas nécessaire en production ; il ne servirait qu'aux simulations massives et
à l'entraînement (non testé ici, pas de GPU).
