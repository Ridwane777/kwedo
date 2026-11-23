# ADR 0008 : plafond fixé par le risque calibré, sous la formule (remplace la modulation de l'ADR 0005)

- **Statut** : accepté ; remplace la modulation γ de l'[ADR 0005](0005-modulation-modele-defaut.md)
- **Date** : 2026-11-23

## Contexte

Le moteur v0.1 ne battait pas la règle « médiane × k » à exposition égale, et son risque annoncé était sous-estimé
de 13 points. Diagnostic sur le réglage (`ml/diagnostic_calibration.py`, `ml/artifacts/diagnostic-calibration.json`) :

| Simulation | Risque annoncé moyen | Observé | ECE |
|---|---|---|---|
| v0.1 (disponible = 0,24 × flux, pas de dépenses personnelles) | 28,4 % | 33,7 % | 0,128 |
| + dépenses personnelles imprévues | 34,7 % | 33,7 % | 0,087 |
| + marge réelle de l'activité (diagnostic, invisible du moteur) | 31,3 % | 33,7 % | 0,108 |

Cause principale : la simulation **ignore les dépenses personnelles imprévues** qui ponctionnent la trésorerie ;
cause secondaire : la marge m = 0,30 surestime la marge réelle de certaines activités ; le reste est un défaut de
forme (rééchantillonnage par blocs du passé). Ces écarts sont corrigés par une calibration apprise, plutôt qu'en
copiant les paramètres du générateur dans le simulateur.

## Décision

Montant proposé = plus grand multiple de 5 000 FCFA **≤ L_max × décote** dont le **risque calibré** (ADR 0007 :
simulation + profil des flux → LightGBM → isotonique) reste ≤ seuil de l'institution. Le risque affiché est ce risque
calibré. La formule reste le plafond absolu. Raisons : chaque effet est recalculé par la **même** chaîne complète
(modèle compris) en neutralisant le facteur, ce qui les garde fidèles au calcul.

## Conséquences

- Réglage (partition v, 1 500 dossiers) : part d'échéances manquées 0,59 % contre 1,05 % (moyenne × k) et
  1,06 % (médiane × k) à exposition égale, IC 95 % excluant zéro ; ECE 0,017.
- Le résultat sur données finales est publié dans `docs/evaluation/runs/`.
- La raison « modèle de risque » séparée disparaît : le modèle fait partie du calcul du montant.
