# ADR 0003 : modèles en NumPy pur plutôt que scikit-learn / LightGBM

- **Statut** : accepté
- **Date** : 2026-11-23
- **Décideurs** : équipe Kwedo

## Contexte

Le brief propose LightGBM ou scikit-learn. Sur le VPS, `pip install` est refusé par la politique de permissions
de la session de travail ; NumPy 1.26 est disponible au niveau système.

## Options

1. Attendre l'autorisation d'installer scikit-learn (bloque l'étape et toutes les suivantes).
2. Modèles simples en NumPy : régression ridge (prévision), régression logistique L2 (défaut),
   distance de Mahalanobis robuste (anomalies).

## Décision

Option 2. Les modèles sont petits (poids en JSON, < 5 Ko), lisibles, et appliqués par le moteur sans dépendance.
Entraînement sur CPU, 4 processus max, `nice -n 10`. **Aucun entraînement sur GPU.**

## Conséquences

- Gagné : zéro dépendance, explicabilité directe (poids), déterminisme.
- Perdu : modèles moins expressifs que du gradient boosting. Ré-évaluer avec LightGBM si l'installation est autorisée
  (nouvel ADR).
- Constat mesuré : le risque simulé par le moteur au plafond est quasi constant (par construction, il vise le seuil),
  donc son AUC est ~0,5 ; il sert à fixer le montant, pas à classer. Le modèle de défaut sert au classement.
- Constat mesuré : calibration imparfaite sur le générateur de test (défaut observé > prédit) : c'est l'effet attendu
  d'un générateur de test plus dur, et la raison d'avoir deux générateurs.
