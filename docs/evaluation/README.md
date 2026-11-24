# Évaluation du moteur

> **Tout est mesuré sur données simulées.** Les impayés sont ceux du simulateur : ces chiffres montrent que la
> chaîne fonctionne et où elle est faible, **pas** une performance sur de vrais commerçants.

## Risque toutes fréquences (ADR 0016) — à lire en premier

Protocole figé avant le run : `protocole-frequences.md` ; graines : `graines-frequences.json` ; résultats complets :
`runs/2026-11-24-frequences/resultats.json`. **Un seul run final effectué. Résultat : critères complets non atteints
(activités jamais vues, calibration), les trois fréquences passent la règle « éprouvée ».** Données simulées.

```
nice -n 10 sh ml/construire_jeux.sh                                  # réglage a/b/v (≈ 6 min, 4 cœurs)
nice -n 10 .venv/bin/python ml/train_frequences.py                  # v3 : unique contre par fréquence, calibration par fréquence (≈ 5 min)
nice -n 10 .venv/bin/python ml/evaluate_frequences.py dev           # contrôle sur le réglage (partition v)
nice -n 10 .venv/bin/python ml/construire_final_frequences.py       # jeux finaux + jeu du run 1 (2 × 4 000)
nice -n 10 .venv/bin/python ml/evaluate_frequences.py final 2026-11-24-frequences   # ≈ 5 min
```

Part d'échéances manquées à montant total égal (4 000 commerçants, générateur de test ; jamais vus = artisanat et
quincaillerie, n = 1 130). IC 95 % bootstrap apparié de la différence moteur − règle ; ✅ = entièrement < 0.

| Cellule | Éch. | Moteur | Moy. × k | IC moteur − moy. | Méd. × k | IC moteur − méd. | Jamais vus : moteur / moy. / méd. | IC jamais vus (moy. ; méd.) | ECE |
|---|---|---|---|---|---|---|---|---|---|
| hebdomadaire 3 mois | 13 | **1,43 %** | 1,77 % | [-0,47 ; -0,21] pt ✅ | 1,74 % | [-0,45 ; -0,18] pt ✅ | 2,07 % / 1,94 % / 1,95 % | [+0,02 ; +0,24] pt ❌ ; [+0,03 ; +0,22] pt ❌ | 0,085 |
| hebdomadaire 6 mois | 26 | **0,86 %** | 1,23 % | [-0,50 ; -0,24] pt ✅ | 1,19 % | [-0,46 ; -0,21] pt ✅ | 1,29 % / 1,21 % / 1,19 % | [−0,00 ; +0,15] pt ❌ ; [+0,03 ; +0,17] pt ❌ | 0,088 |
| hebdomadaire 9 mois | 39 | **0,74 %** | 1,10 % | [-0,50 ; -0,23] pt ✅ | 1,07 % | [-0,46 ; -0,20] pt ✅ | 1,20 % / 1,07 % / 1,06 % | [+0,04 ; +0,21] pt ❌ ; [+0,06 ; +0,21] pt ❌ | 0,092 |
| hebdomadaire 12 mois | 52 | **0,69 %** | 1,06 % | [-0,51 ; -0,24] pt ✅ | 1,03 % | [-0,49 ; -0,22] pt ✅ | 1,14 % / 1,03 % / 1,01 % | [+0,02 ; +0,19] pt ❌ ; [+0,04 ; +0,22] pt ❌ | 0,095 |
| quinzaine 3 mois | 7 | **1,73 %** | 2,18 % | [-0,60 ; -0,31] pt ✅ | 2,21 % | [-0,64 ; -0,35] pt ✅ | 2,41 % / 2,33 % / 2,36 % | [-0,04 ; +0,22] pt ❌ ; [-0,07 ; +0,19] pt ❌ | 0,057 |
| quinzaine 6 mois | 13 | **1,25 %** | 1,72 % | [-0,60 ; -0,34] pt ✅ | 1,72 % | [-0,60 ; -0,35] pt ✅ | 1,63 % / 1,57 % / 1,59 % | [-0,05 ; +0,15] pt ❌ ; [-0,04 ; +0,11] pt ❌ | 0,060 |
| quinzaine 9 mois | 20 | **1,20 %** | 1,64 % | [-0,56 ; -0,33] pt ✅ | 1,65 % | [-0,57 ; -0,34] pt ✅ | 1,61 % / 1,58 % / 1,54 % | [-0,06 ; +0,12] pt ❌ ; [-0,01 ; +0,15] pt ❌ | 0,068 |
| quinzaine 12 mois | 26 | **1,20 %** | 1,65 % | [-0,57 ; -0,33] pt ✅ | 1,65 % | [-0,56 ; -0,34] pt ✅ | 1,53 % / 1,50 % / 1,48 % | [-0,05 ; +0,12] pt ❌ ; [-0,02 ; +0,13] pt ❌ | 0,072 |
| mensuelle 3 mois | 3 | **2,47 %** | 2,92 % | [-0,68 ; -0,23] pt ✅ | 2,96 % | [-0,72 ; -0,27] pt ✅ | 3,00 % / 2,89 % / 2,92 % | [-0,15 ; +0,38] pt ❌ ; [-0,15 ; +0,35] pt ❌ | 0,036 |
| mensuelle 6 mois | 6 | **1,89 %** | 2,35 % | [-0,60 ; -0,30] pt ✅ | 2,37 % | [-0,63 ; -0,33] pt ✅ | 2,07 % / 1,95 % / 1,95 % | [-0,04 ; +0,28] pt ❌ ; [-0,01 ; +0,26] pt ❌ | 0,050 |
| mensuelle 9 mois | 9 | **1,85 %** | 2,27 % | [-0,57 ; -0,28] pt ✅ | 2,27 % | [-0,56 ; -0,28] pt ✅ | 2,05 % / 2,04 % / 1,98 % | [-0,13 ; +0,15] pt ❌ ; [-0,04 ; +0,18] pt ❌ | 0,057 |
| mensuelle 12 mois | 12 | **1,86 %** | 2,28 % | [-0,56 ; -0,28] pt ✅ | 2,29 % | [-0,56 ; -0,29] pt ✅ | 1,97 % / 1,99 % / 2,01 % | [-0,15 ; +0,10] pt ❌ ; [-0,15 ; +0,06] pt ❌ | 0,067 |

Calibration par fréquence (4 durées réunies ; critère C3 : ECE ≤ 0,05 et écart ≤ 5 pts) :

| Fréquence | Risque annoncé moyen | Observé | ECE | Écart moyen | C3 | C1 (test complet) | Éprouvée | Réussite complète |
|---|---|---|---|---|---|---|---|---|
| hebdomadaire | 11,78 % | 20,63 % | 0,089 | 7,5 pts | ❌ | 4/4 | ✅ | ❌ |
| quinzaine | 11,31 % | 17,73 % | 0,064 | 7,1 pts | ❌ | 4/4 | ✅ | ❌ |
| mensuelle | 10,79 % | 15,96 % | 0,052 | 6,6 pts | ❌ | 4/4 | ✅ | ❌ |

- **Mieux que les règles naïves** sur le test complet dans les 12 cellules, IC excluant zéro (C1, C2 ✅).
- **Pas mieux sur les activités jamais vues** dans aucune cellule ; en hebdomadaire le moteur y est même légèrement
  moins bon (IC entièrement au-dessus de zéro dans 7 cas sur 8). Même faiblesse qu'au run 1.
- **Risque sous-estimé** sous la dérive du générateur de test pour les trois fréquences (C3 ❌), moins en mensuel.
  Sur le réglage, ECE 0,017 / 0,014 / 0,015 (`ml/artifacts/dev-frequences-reglage-v.json`).
- **Règle « éprouvée »** (C1 dans ≥ 3 durées sur 4 et ECE ≤ max(0,05 ; ECE hebdomadaire + 0,01)) : ✅ pour les trois ;
  la mention « moins éprouvée » disparaît de l'interface. Cela veut dire « au moins aussi éprouvée que
  l'hebdomadaire », pas « probabilité fiable ».
- **Non-régression hebdomadaire** (jeu du run 1, 26 échéances, modèle v3 contre v2 publié) : 0,84 % contre 0,93 %
  d'échéances manquées (montant total accordé 1 811 M contre 1 843 M FCFA, −1,7 %) ; jamais vus 1,41 % contre 1,41 % ;
  ECE 0,091 contre 0,089 (+0,0015). ✅ selon le protocole. Koffi : 495 000 FCFA inchangé, risque 7,85 % (8,46 % avant).

## Passe de correction (moteur 0.2.0)

Protocole figé avant tout run : `protocole-final.md` ; graines : `graines-finales.json` ; runs : `runs/`.
**Nombre de runs finaux effectués : 1 (sur 3 autorisés). Résultat : échec publié.**

```
nice -n 10 .venv/bin/python ml/dataset.py reglage_a 3000    # + reglage_b 1500, reglage_v 1500 (réglage uniquement)
nice -n 10 .venv/bin/python ml/train.py                     # LightGBM + isotonique (≈ 2 min, 4 fils)
nice -n 10 .venv/bin/python ml/diagnostic_calibration.py    # C3 : cause de la sous-estimation
nice -n 10 .venv/bin/python ml/evaluate_final.py dev        # contrôle sur le réglage
nice -n 10 .venv/bin/python ml/construire_final.py 1        # jeux finaux du run 1 (10 × 400)
nice -n 10 .venv/bin/python ml/evaluate_final.py final 1    # → runs/run-1.json (≈ 40 s)
```

| Run 1 (générateur de test, 10 graines neuves) | Moteur | Moyenne × k | Médiane × k |
|---|---|---|---|
| Échéances manquées, test complet (n = 4 000), exposition égale | **0,93 %** | 1,25 % | 1,23 % |
| IC 95 % de la différence moteur − règle | | [−0,43 ; −0,21] pt ✅ | [−0,42 ; −0,19] pt ✅ |
| Échéances manquées, archétypes jamais vus (n = 1 130) | 1,41 % | 1,43 % | 1,40 % |
| IC 95 % de la différence | | [−0,15 ; +0,10] pt ❌ | [−0,11 ; +0,12] pt ❌ |

- **Calibration** : ECE 0,089, écart moyen 7,9 pts ❌ (contre 0,017 et 1,6 pt sur le réglage). Le risque reste
  sous-estimé quand le générateur change, surtout pour les petits risques (1 % annoncé, 8 % observé).
- **Détection** 100 %, 4,9 % de fausses alertes ✅. **Stabilité** p90 4,6 % ✅. **Raisons** 100 % fidèles ✅.
  **Équité** 40/40, aucune variable sensible ✅.
- **Cause (C3)**, mesurée sur le réglage : la simulation ignorait les dépenses personnelles imprévues (principale
  cause) et supposait une marge de 0,30 trop haute pour certaines activités (`ADR 0008`). La calibration apprise
  corrige le biais **sur le générateur où elle est apprise**, pas sous une dérive (plus de dépenses personnelles,
  bruit différent, activités inconnues) que les flux ne laissent pas voir.
- **Lecture** : le moteur classe mieux que les règles naïves sur des profils proches de ceux du réglage, pas sur des
  activités nouvelles ; le risque annoncé n'est une probabilité fiable que dans le domaine du réglage.

## Reproduire (évaluation v0.1, historique)

```
nice -n 10 python3 ml/dataset.py reglage 600   # générateur de réglage
nice -n 10 python3 ml/dataset.py test 400      # générateur de test (bruit gamma, chocs plus fréquents, 2 archétypes jamais vus)
nice -n 10 python3 ml/train.py                 # modèles (réglage seulement)
nice -n 10 python3 ml/balayage.py              # balayage de paramètres (réglage seulement)
nice -n 10 python3 ml/evaluate.py              # → docs/evaluation/resultats.json
```

> Les sections ci-dessous décrivent le moteur **0.1.0** (avant la passe de correction). Les scripts `train.py` et
> `dataset.py` ont depuis évolué ; ces chiffres restent pour mémoire.

Machine : x86_64, 8 cœurs, 4 utilisés, **pas de GPU**, Python 3.12.3, NumPy 1.26.4. Graines fixes : la sortie est
identique d'une exécution à l'autre. Durée de l'évaluation : ≈ 40 s.

## Méthode

- Deux générateurs distincts : réglage (600 commerçants, 5 archétypes) et test (400, 7 archétypes dont
  **artisanat** et **quincaillerie jamais vus** pendant le réglage, bruit et chocs différents).
- Étiquette : un avenir caché de 52 semaines par commerçant (chocs, dépenses personnelles) dit si chaque échéance
  aurait été payée.
- Références : règle naïve « moyenne × k » et règle plus fine « médiane × k », k choisi sur le réglage.
- Paramètres de l'institution de référence : m = 0,30 ; s = 0,40 ; n = 26 ; i = 0,35 %/sem. ; p20 ; seuil 10 %.
- Le modèle de défaut module le plafond à la baisse (γ = 4, choisi sur le réglage, voir ADR 0005).

## Résultats (fichier complet : `resultats.json`)

### 1. Décide-t-il mieux ? — **Non démontré**

Taux de défaut **à montant total prêté égal** (comparaison juste), jeu de test :

| Exposition | Moteur | Moteur sans modèle | Règle médiane × k |
|---|---|---|---|
| 100 M FCFA | 6,8 % | 7,8 % | 6,3 % |
| 141 M FCFA | 12,5 % | 12,2 % | 10,1 % |
| 185 M FCFA | 16,0 % | 17,4 % | 15,9 % |

Archétypes jamais vus (n = 116 ; un dossier pèse 0,86 point) :

| Exposition | Moteur | Moteur sans modèle | Règle médiane × k |
|---|---|---|---|
| 28 M FCFA | 6,1 % | 5,3 % | 6,7 % |
| 40 M FCFA | 7,9 % | 9,7 % | 8,6 % |
| 51 M FCFA | 16,2 % | 16,5 % | 15,0 % |

**Lecture.** Les écarts sont de l'ordre du bruit d'échantillonnage. Sur ce simulateur, le classement des commerçants
par le moteur n'est pas meilleur que celui de la médiane des encaissements. Cause probable, mesurée par le balayage
(`ml/artifacts/balayage-v1.json`) : la simulation par blocs pénalise la volatilité passée, alors que les impayés du
générateur viennent surtout de la marge par activité et des dépenses personnelles, invisibles dans les flux.
Un premier calcul à k fixé semblait favorable au moteur (11,3 % contre 18,1 % hors réglage) : il comparait des
expositions différentes et **ne doit pas être cité**.

### 2. Finance-t-il assez ?

| | Moteur | Règle médiane |
|---|---|---|
| Solvables financés (capacité réelle ≥ 25 000 FCFA, n = 380) | 96,3 % | 100 % |
| Montant / capacité réelle (médiane) | 0,30 | 0,26 |
| Montants au-dessus de la capacité réelle | 3,6 % | 3,7 % |

### 3. Le risque annoncé est-il juste ? — **Non, il est sous-estimé**

Risque simulé annoncé contre fréquence observée (870 points, 6 montants par dossier) : 3,7 % → 9,2 % ;
7,6 % → 19,1 % ; 13,8 % → 30,4 % ; 31,4 % → 50,6 %. Écart moyen absolu : 13 points. Le simulateur
du moteur ne voit ni les dépenses personnelles ni les chocs plus fréquents du générateur de test. Le risque affiché
est donc un **classement interne**, pas une probabilité ; c'est indiqué à l'écran comme « risque simulé ».

### 4. Est-il stable ? — **Oui**

±5 % de bruit sur chaque semaine : variation du plafond médiane 1,5 %, p90 3,6 %, max 5,2 % (seuil proposé 10 %).
m ou s à ±10 % : variation médiane 10 % (proportionnelle, attendue par la formule).

### 5. Détecte-t-il la manipulation ? — **Oui, sur cas injectés**

58 cas injectés dans le test : règles 94,8 % (0,3 % de fausses alertes), modèle d'anomalies 84,5 % (6,1 %),
combinés 100 % (6,1 %). Sans contrôle : 0 %. Sur ces 58 dossiers, le montant proposé reste proche de celui de la
règle naïve ; la différence est que **l'agent est alerté dans 94,8 % des cas**.

### 6. Les raisons sont-elles fidèles ? — **Oui**

39 dossiers : effets affichés identiques au recalcul indépendant (100 %), raisons triées par effet (100 %),
raison « formule » présente exactement quand L_max limite (100 %). Un test unitaire vérifie aussi le sens des raisons.

### 7. Est-il équitable ?

Aucune variable sensible dans le code du moteur (recherche automatique). Mêmes flux, archétype différent :
décisions identiques 40/40 (l'activité n'est pas une entrée). Plafond / médiane hebdomadaire par archétype : de 1,91
(artisanat) à 2,51 (restauration), différences dues aux flux eux-mêmes.

### 8. Fait-il gagner du temps ?

Machine : analyse complète 0,07 s par dossier ; 2 000 trajectoires en 6 ms (≈ 330 000 trajectoires/s sur CPU).
**Temps humain : non mesuré.** Il faut des agents réels ; protocole dans `protocole-temps.md`. Le chronomètre
ajouté à la fiche dossier en C5 a été retiré de la console sur décision produit (mission menu de compte) : aucune
mesure n'a jamais été prise avec, et **aucun gain de temps humain n'est annoncé**.

## Ce qu'il faut retenir

Le prototype tient ses promesses de **transparence, prudence, traçabilité et détection**, pas (encore) celle de
**mieux classer** qu'une règle simple : sur données simulées, l'écart n'est pas significatif. La validation qui compte
se fera sur les remboursements réels d'une institution pilote, avec recalibrage de m par activité et du risque.
