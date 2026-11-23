# ADR 0007 : modèles de défaut et de prévision sur LightGBM (remplace ADR 0003)

- **Statut** : accepté, remplace [ADR 0003](0003-modeles-numpy.md)
- **Date** : 2026-11-23

## Contexte

L'ADR 0003 imposait NumPy pur faute de `pip install`. C2 l'autorise dans `.venv` ; il demande LightGBM (ou
scikit-learn si meilleur), au plus 4 fils, `nice -n 10`, et une comparaison à la version NumPy.

## Mesures (générateur de réglage, partition de validation v, 21 000 lignes dossier × montant ; `ml/artifacts/metriques-v2.json`)

| Défaut (≥ 1 échéance manquée) | AUC | Brier | ECE 10 classes |
|---|---|---|---|
| Risque simulé brut du moteur v0.1 | 0,886 | 0,119 | 0,077 |
| NumPy, logistique | 0,917 | 0,095 | 0,018 |
| NumPy, logistique + isotonique | 0,917 | 0,094 | 0,008 |
| **LightGBM + isotonique lissée** | **0,923** | **0,088** | 0,009 |

Prévision (moyenne des 8 semaines suivantes, erreur relative médiane) : LightGBM 10,05 %, ridge NumPy 10,27 %,
médiane des 12 dernières semaines 9,79 %. Gain marginal ; la prévision reste informative.

## Décision

- Défaut : LightGBM (`objective=binary`, 4 feuilles, ≥ 400 lignes par feuille, 400 arbres, `num_threads=4`,
  déterministe), **contraint croissant** sur les trois caractéristiques de montant, puis calibration isotonique
  apprise sur une **partition dédiée** du réglage (b), lissée (centres des paliers) pour la stabilité.
  Le modèle à 15 feuilles était un peu moins bon et instable (p90 de variation du plafond 16 % sous ±5 % de bruit) ;
  avec 4 feuilles et la calibration lissée : 3,4 %.
- Prévision : LightGBM (`objective=l1`). Anomalies : Mahalanobis NumPy inchangé (hors périmètre de C2).
- Entrées : uniquement des flux (aucune activité déclarée, aucune variable sensible).
- Artefact unique `ml/artifacts/modeles-v2.json` (690 Ko). Sans lui, le moteur retombe sur v0.1.

## Conséquences

- Le moteur dépend de `lightgbm` (dans `.venv`). Prédiction ≈ 10 ms par dossier, sur un fil.
- Interprétabilité : importance par gain publiée ; les raisons affichées restent calculées par neutralisation.
