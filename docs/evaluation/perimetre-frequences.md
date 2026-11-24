# Périmètre de l'évaluation : remboursement hebdomadaire seulement

> Note ajoutée le 2026-11-24 (ADR 0015). Elle ne modifie aucun résultat publié : `README.md`, `resultats.json`
> et `runs/` sont inchangés.

**L'évaluation publiée ne couvre que le remboursement hebdomadaire.** Les jeux de réglage et de test, les défauts
simulés, l'entraînement du modèle de risque (LightGBM), sa calibration isotonique, et tous les chiffres de
`README.md` et `runs/run-1.json` (échéances manquées, calibration, stabilité, raisons, équité) ont été produits avec
des échéances **chaque semaine** sur la durée de l'institution.

Depuis l'ADR 0015, le commerçant peut aussi choisir un remboursement **toutes les deux semaines** ou **mensuel**,
sur 3 à 12 mois. Pour ces fréquences :

- la formule (`L_max`) et le test de résistance (2 000 avenirs simulés à la semaine, contrôle à chaque échéance)
  sont appliqués tels quels ;
- le modèle de risque n'a **pas** été réentraîné ni évalué : il est appliqué au montant équivalent (échéance
  ramenée à la semaine) ; le résultat du moteur porte `risque_valide: false`, l'écran commerçant affiche
  « estimation prudente, moins éprouvée que le remboursement hebdomadaire », la fiche de l'agent le signale ;
- aucune mesure de calibration, de taux d'échéances manquées ou de comparaison aux règles naïves n'existe.

Ce que garantit le code (tests unitaires `packages/engine/tests/test_moteur.py`, classe `TestFrequences`) :
l'hebdomadaire donne exactement les résultats évalués (Koffi : 495 000 FCFA, risque 8,46 %) ; quinzaine et
mensuel sont déterministes par graine, cohérents (échéance × nombre = montant + coût) et jamais au-dessus de `L_max`.
Cela ne dit rien de la justesse du risque annoncé.

Pour étendre l'évaluation : générer des défauts simulés à la quinzaine et au mois (`ml/dataset.py`), réentraîner et
recalibrer, figer un nouveau protocole avant tout run, puis rejouer `ml/evaluate_final.py` par fréquence.
