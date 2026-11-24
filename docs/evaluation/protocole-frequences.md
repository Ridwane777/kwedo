# Protocole de l'évaluation du risque toutes fréquences (ADR 0016)

Figé et committé **avant** le run final. Après ce commit, ni ce fichier, ni `graines-frequences.json`, ni le
générateur de test, ni les règles naïves, ni les métriques, ni les seuils ne changent. **Un seul run final**, écrit
dans un nouveau dossier `docs/evaluation/runs/<date>-frequences/` ; les runs existants (`runs/run-1.json`) ne sont
jamais modifiés. Tout second run devrait être annoncé et justifié par écrit dans `docs/evaluation/README.md`.

## Données

- **Échéanciers** : 3 fréquences (hebdomadaire, quinzaine, mensuelle) × 4 durées (3, 6, 9, 12 mois) = 12 cellules.
  Nombre d'échéances et semaine de chaque échéance : mêmes règles que le moteur (`Parametres.nb`,
  `rangs_semaine` ; 52/12 semaines par mois). Autres paramètres de l'institution de référence inchangés :
  m 0,30 ; s 0,40 ; i 0,35 %/sem. (taux équivalent par période) ; percentile 20 ; seuil de risque 10 %.
- **Remboursement simulé** (`packages/generator/kwedo_gen/remboursement.py`) : à chaque date d'échéance, le
  commerçant paie avec ce qui lui reste des encaissements de l'avenir caché (52 semaines, marge et dépenses
  personnelles imprévues déduites), trésorerie non utilisée reportée.
- **Défaut, identique pour toutes les fréquences** : au moins une échéance manquée de plus de **X = 0 jour**, c'est-à-dire
  non couverte par la caisse disponible à la fin de la semaine où elle tombe (l'avenir caché est connu à la semaine).
  Pour l'hebdomadaire sur 26 échéances, c'est exactement l'étiquette de l'évaluation d'origine (test unitaire
  `test_hebdo_identique_a_l_etiquette_d_origine`).
- **Réglage** (générateur de réglage, graine 2026, partitions disjointes de `ml/dataset.py`) : `reglage_a` (3 000,
  entraînement), `reglage_b` (1 500, calibration isotonique lissée par fréquence, dédiée), `reglage_v` (1 500,
  choix « modèle unique » ou « un modèle par fréquence », contrôle). Tout réglage se fait là.
- **Test final** : générateur de **test** inchangé (bruit gamma, chocs plus fréquents, plus de dépenses personnelles,
  7 archétypes dont artisanat et quincaillerie jamais vus au réglage). Graines : `graines-frequences.json`,
  10 graines × 400 commerçants = **4 000 commerçants**, chacun évalué dans les 12 cellules. Construction :
  `ml/dataset.py final:<graine> 400`. Bootstrap : graine `graine_bootstrap` du même fichier.
- **Non-régression hebdomadaire** : jeu du run 1 (graines `runs.1` de `graines-finales.json`, 4 000 commerçants),
  hebdomadaire 26 échéances (= 6 mois), comparé aux chiffres publiés de `runs/run-1.json` (modèle v2).

## Méthode (script : `ml/evaluate_frequences.py final <date>-frequences`)

- **Moteur** : par cellule, montant = plus grand multiple de 5 000 FCFA ≤ `L_max` (de la période) dont le risque
  calibré v3 ≤ 10 %. Accordé si ≥ 25 000 FCFA.
- **Règles naïves adaptées à chaque fréquence** : `k × encaissement moyen de la période` et `k × médiane de la
  période` (encaissement hebdomadaire × semaines par période), accordé si ≥ 25 000 FCFA. **Exposition égale** :
  k choisi par dichotomie pour que le montant total accordé égale celui du moteur, dans chaque cellule et chaque
  périmètre. Échéance de la règle = montant / annuité de la période (même taux, même nombre d'échéances).
- **Métrique principale** : part d'échéances manquées = échéances manquées / échéances dues, sur les prêts accordés.
- **Périmètres** : test complet (4 000) et archétypes jamais vus (artisanat + quincaillerie), dans chaque cellule.
- **Calibration** : points = dossiers accordés × plafond × {0,5 ; 0,75 ; 1 ; 1,25 ; 1,5 ; 2} ; événement = défaut
  ci-dessus. ECE (10 classes de largeur égale, pondérée) et écart moyen annoncé/observé (moyenne non pondérée sur les
  classes 0–2–5–10–20–40–100 % ayant ≥ 30 points), par cellule et par fréquence (4 durées réunies).

## Critères (seuils repris du protocole d'origine)

- **C1** (par cellule et périmètre) : part d'échéances manquées du moteur < celle de chacune des deux règles.
- **C2** (par cellule, périmètre, règle) : IC bootstrap 95 % (2 000 rééchantillonnages appariés des dossiers,
  percentiles, k fixé) de la différence moteur − règle entièrement < 0.
- **C3** (par fréquence) : ECE ≤ 0,05 et écart moyen ≤ 5 points.
- **Réussite complète d'une fréquence** : C1 et C2 dans ses 4 durées sur les deux périmètres, et C3.
- **Fréquence « éprouvée »** (décide de la mention à l'écran) : C1 contre les deux règles sur le test complet dans
  au moins 3 durées sur 4, **et** ECE de la fréquence ≤ max(0,05 ; ECE de l'hebdomadaire du même run + 0,01).
  Autrement dit : au moins aussi éprouvée que l'hebdomadaire, qui s'affiche aujourd'hui sans mention. Une fréquence
  non éprouvée garde une mention à l'écran (par fréquence concernée) ; l'hebdomadaire aussi s'il échoue.
- **Non-régression hebdomadaire** (jeu du run 1, 26 échéances) : part d'échéances manquées du moteur ≤ celle du
  run 1 + 0,05 point sur le test complet, et ECE ≤ celui du run 1 + 0,01. L'écart est publié même s'il est minime.

## Publication

Tous les résultats, y compris les échecs, sont publiés tels quels : `runs/<date>-frequences/resultats.json`, un
tableau par fréquence × durée dans `docs/evaluation/README.md`. La page d'accueil et la démo ne citent que des
chiffres sortis de ce run. Résultats annoncés comme obtenus sur **données simulées**.
