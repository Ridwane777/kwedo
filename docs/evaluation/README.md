# Évaluation du moteur

> **Tout est mesuré sur données simulées.** Les impayés sont ceux du simulateur : ces chiffres montrent que la
> chaîne fonctionne et où elle est faible, **pas** une performance sur de vrais commerçants.

## Passe de correction (moteur 0.2.0) — à lire en premier

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
**Temps humain : non mesuré.** Il faut des agents réels ; protocole dans `protocole-temps.md`. Depuis C5, la fiche
dossier de la console propose un chronomètre démarré et arrêté par l'agent (avec ou sans l'outil), exportable en
CSV/JSON ; tant que personne ne l'a utilisé, il affiche « non mesuré ».

## Ce qu'il faut retenir

Le prototype tient ses promesses de **transparence, prudence, traçabilité et détection**, pas (encore) celle de
**mieux classer** qu'une règle simple : sur données simulées, l'écart n'est pas significatif. La validation qui compte
se fera sur les remboursements réels d'une institution pilote, avec recalibrage de m par activité et du risque.
