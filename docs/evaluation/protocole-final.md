# Protocole de l'évaluation finale (passe de correction)

Figé et committé **avant** le premier run final. Toute modification ultérieure de ce fichier, des graines, du générateur
de test, des règles naïves, des métriques ou des seuils est interdite (`docs/CORRECTIONS.md`).

## Données

- Générateur de **test** (`kwedo_gen.TEST` : bruit gamma, chocs plus fréquents, 7 archétypes dont artisanat et
  quincaillerie jamais vus au réglage), inchangé.
- Graines finales : `docs/evaluation/graines-finales.json`. Run *r* = 10 graines × 400 commerçants (4 000 dossiers),
  graines jamais utilisées pendant le développement. Construction : `ml/dataset.py final:<graine> 400`.
- Tout réglage (modèles, calibration, hyperparamètres, moteur) est fait sur le générateur de **réglage**
  (partitions a/b/v, `ml/dataset.py`). Les données finales ne servent qu'au run.
- Résultats annoncés comme obtenus sur **données simulées**.

## Méthode (script : `ml/evaluate_final.py final <r>`)

- **Moteur** : montant = plus grand multiple de 5 000 FCFA ≤ `L_max` dont le risque calibré ≤ 10 %
  (paramètres de référence m 0,30 ; s 0,40 ; n 26 ; i 0,35 %/sem. ; p20 ; seuil 10 %). Accordé si ≥ 25 000 FCFA.
- **Règles naïves** (inchangées) : `k × encaissement hebdomadaire moyen` et `k × médiane`, accordé si ≥ 25 000 FCFA.
  **Exposition égale** : k choisi par dichotomie pour que le montant total accordé égale celui du moteur, sur chaque
  périmètre évalué.
- **Métrique** : part d'échéances manquées = échéances manquées / échéances dues, sur les prêts accordés, d'après
  l'avenir caché de 52 semaines (règle `defaut` de `ml/dataset.py`, inchangée).
- **Périmètres** : test complet (4 000) et archétypes hors réglage (artisanat + quincaillerie).

## Critères de réussite (repris de `docs/CORRECTIONS.md`)

1. Sur chaque périmètre, part d'échéances manquées du moteur < celle de **chacune** des deux règles naïves.
2. Pour chaque règle et chaque périmètre : IC bootstrap 95 % (2 000 rééchantillonnages appariés des dossiers,
   percentiles, k fixé) de la différence moteur − règle **entièrement < 0**.
3. Calibration, points = dossiers accordés × montants plafond × {0,5 ; 0,75 ; 1 ; 1,25 ; 1,5 ; 2}, événement =
   au moins une échéance manquée : **ECE (10 classes de largeur égale, pondérée) ≤ 0,05** et **écart moyen
   annoncé/observé ≤ 5 points** (moyenne non pondérée sur les classes 0–2–5–10–20–40–100 % ayant ≥ 30 points).
4. Détection (règles + modèle d'anomalies) : ≥ 90 % des cas injectés, ≤ 10 % de fausses alertes. Restent OK :
   stabilité (p90 de variation du plafond ≤ 10 % sous ±5 % de bruit), fidélité des raisons (100 % des effets
   recalculés identiques, triées, raison « formule » cohérente), équité (aucune variable sensible dans le code,
   décisions identiques quand seule l'activité déclarée change), sur 40 dossiers tirés de la graine du run.
5. Tests unitaires et E2E verts, `next build` OK, 0 violation axe grave ou critique.

## Déroulement

- Chaque run est écrit dans `docs/evaluation/runs/run-<r>.json` et committé, **y compris en cas d'échec**.
- Échec → amélioration sur le réglage uniquement, puis run suivant avec le jeu de graines suivant. Au plus 3 runs ;
  le nombre d'essais est publié.
