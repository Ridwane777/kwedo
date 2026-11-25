# ADR 0016 : risque appris, calibré et évalué pour chaque fréquence et chaque durée

- Statut : accepté ; complète la limite décrite dans l'[ADR 0015](0015-frequence-duree-au-choix.md)
- Date : 2026-11-24

## Contexte

Depuis l'ADR 0015, le commerçant choisit la fréquence (semaine, quinzaine, mois) et la durée (3 à 12 mois). Le
modèle de risque (ADR 0007, 0008) n'avait été entraîné, calibré et évalué que sur des échéances hebdomadaires sur
26 semaines ; hors hebdomadaire il était appliqué au montant équivalent avec `risque_valide: false`. Demande du
propriétaire : l'évaluation du risque doit couvrir tout ce que le commerçant peut choisir.

## Options envisagées

1. **Statu quo** (modèle hebdomadaire au montant équivalent). Non évalué hors hebdomadaire.
2. **Un modèle par fréquence.** Chaque modèle ne voit qu'un tiers des données.
3. **Un modèle unique avec l'échéancier en entrée (retenu).** Caractéristiques ajoutées : échéance de la période
   rapportée à la médiane et au percentile prudent des encaissements **agrégés à la période** (« mauvais mois »),
   risque simulé à la fréquence choisie, semaines par période, nombre d'échéances.

Comparaison sur le réglage seulement (partition v, `ml/artifacts/metriques-v3.json`), règle fixée avant de lire les
résultats : Brier moyen le plus bas, modèle unique s'il y a moins de 1 % d'écart relatif. Brier moyen 0,06776
(unique) contre 0,06729 (par fréquence), soit 0,7 % : **modèle unique**. ECE sur v : 0,007 / 0,004 / 0,006.

## Décision

- **Données** : `kwedo_gen.rembourser` simule le remboursement d'un échéancier quelconque : à chaque date d'échéance,
  le commerçant paie avec ce qui lui reste après ses dépenses (avenir caché de 52 semaines), trésorerie reportée.
  Défaut identique partout : au moins une échéance manquée de plus de 0 jour (non couverte à la fin de la semaine où
  elle tombe). Pour l'hebdomadaire sur 26 échéances, c'est l'étiquette d'origine (test unitaire).
- **Modèle v3** (`ml/train_frequences.py`, `ml/artifacts/modeles-v3.json`) : LightGBM, mêmes hyperparamètres que v2,
  monotone en montant, entraîné sur `reglage_a` × 12 cellules (3 fréquences × 3, 6, 9, 12 mois) ; calibration
  isotonique lissée (centres des paliers, ADR 0008) **par fréquence** sur `reglage_b`, en deux passes (la 2e ajoute
  les points plafond × 0,5…2). Prévision et anomalies reprises de v2 sans changement.
- **Moteur** : v3 pour toutes les fréquences (`decision.lignes_frequence`, `montant_max_frequence`) ; v2 reste le
  repli si v3 est absent. `risque_valide` vaut vrai partout. Nouveau champ `risque_eprouve` : la fréquence fait
  partie de `FREQUENCES_EPROUVEES`, fixée par le run final selon la règle écrite dans le protocole.
- **Évaluation** : `docs/evaluation/protocole-frequences.md` committé avant le run ; un seul run,
  `docs/evaluation/runs/2026-11-24-frequences/`. Les trois fréquences passent la règle « éprouvée » (C1 dans 4 durées
  sur 4, ECE ≤ celui de l'hebdomadaire + 0,01) : la mention « moins éprouvée » disparaît de l'interface. Le composant
  reste et réapparaîtrait pour une fréquence retirée de la liste.

## Conséquences

- Gagné : dans les 12 cellules, le moteur manque moins d'échéances que les deux règles naïves à exposition égale,
  IC 95 % excluant zéro (ex. mensuel 6 mois : 1,89 % contre 2,35 % et 2,37 %).
- **Pas gagné** (inchangé depuis le run 1) : sur les activités jamais vues, aucune cellule ne bat les règles de façon
  significative (hebdomadaire : légèrement pire, IC entièrement au-dessus de zéro dans 7 cas sur 8) ; le risque reste sous-estimé sous le
  générateur de test (ECE 0,089 / 0,064 / 0,052, critère 0,05 non atteint ; annoncé ≈ 11 %, observé 16 à 21 %).
  « Éprouvée » veut dire « au moins aussi éprouvée que l'hebdomadaire », pas « probabilité fiable ».
- Non-régression hebdomadaire (jeu du run 1, 26 échéances) : échéances manquées 0,84 % contre 0,93 % publié, pour un
  montant total accordé inférieur de 1,7 % (1 811 M contre 1 843 M FCFA) ; activités jamais vues 1,41 % contre
  1,41 % ; ECE 0,091 contre 0,089 (+0,0015, dans la tolérance de 0,01). Koffi : 495 000 FCFA inchangé, risque annoncé
  7,85 % au lieu de 8,46 %.
- Contrat : `risque_eprouve` ajouté à l'analyse ; `estimation_eprouvee` côté commerçant en dérive.
