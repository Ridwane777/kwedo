# Mesure à définition égale BCEAO (taux brut de dégradation du portefeuille)

## Conclusion

Avec la même mesure que la BCEAO, le simulateur ne donne plus 0,3 %. Le portefeuille dont les montants sont
accordés par le moteur (demande Kiva plafonnée par le moteur) se dégrade de **3 à 6 %** en remboursement
hebdomadaire et de **0 à 3 %** en mensuel. Le seuil retenu est un impayé de plus de 90 jours ; les intervalles
bootstrap à 95 % sont dans le tableau. Le repère BCEAO pour le Bénin est de **9,4 %**. Avec des prêts **au plafond**
(pire cas raisonnable), le taux monte à **10 à 20 %**, soit au niveau du repère ou au-dessus.

- **L'écart disparaît en grande partie.** Le 0,3 % venait surtout de deux choix de mesure : un défaut compté par
  prêt plutôt qu'en encours, et le cas le plus favorable (petits montants Kiva en mensuel sur 12 mois, qui donne
  encore 0 à 0,3 % ici). Il venait aussi des petits montants : au plafond, le même simulateur dépasse 9,4 %.
- **Le simulateur n'apparaît pas trop optimiste de façon générale**, puisqu'il atteint le repère dès que les montants
  approchent la capacité des commerçants. L'étape 2 « monde pessimiste » **ne se justifie pas par ce seul écart**. Le
  portefeuille du moteur reste sous le repère, mais les deux populations diffèrent (voir les limites) : cela ne
  prouve pas que le moteur ferait mieux qu'une institution réelle.
- La règle « médiane × k », à exposition égale et pour les mêmes emprunteurs, donne des taux du même ordre que le
  moteur. Aux montants Kiva, le moteur ne se distingue donc pas d'une règle simple. Son rôle est de borner le montant
  (comparer avec la colonne « plafond »).

**Rien n'a été réglé sur 9,4 %.**

## Définition retenue

Source : **Référentiel comptable spécifique des SFD de l'UMOA** (BCEAO / Commission bancaire, 2009, classe 29, p. 64-65,
[cb-umoa.org](https://www.cb-umoa.org/sites/default/files/2022-05/R%C3%A9f%C3%A9rentiel%20comptable%20sp%C3%A9cifique%20des%20SFD_1.pdf)) :

- dès qu'**une échéance est impayée**, « la totalité de l'encours du crédit, échu ou non » est déclassée en
  créances en souffrance ;
- ce déclassement est **facultatif de 0 à 3 mois** d'impayé et **obligatoire au-delà** ;
- les tranches suivent l'ancienneté du premier impayé : 0 à 6 mois, 6 à 12 mois, 12 à 24 mois ;
- au-delà de **24 mois**, la créance passe en perte.

Le taux est calculé comme **encours des créances en souffrance ÷ encours brut des crédits**, avant provisions. Les
tableaux BCEAO ([indicateurs au 30/09/2025](https://www.bceao.int/sites/default/files/2026-02/Indicateurs%20au%2030%20septembre%202025.pdf))
ne publient pas de formule. On vérifie celle-ci sur leurs colonnes : Bénin, 27 515,4 ÷ 246 984,3 = 11,1 %, valeur
publiée. Le repère de 9,4 % porte sur le 31/12/2024 (docs/data/README.md).

**Approximations.** Le texte de l'instruction elle-même n'a pas été trouvé. Les « 3 mois » sont approchés par
**plus de 90 jours** (colonne principale). On donne aussi plus de 30 jours et plus de 0 jour, ce dernier pour une
institution qui déclasse dès le premier impayé. On ignore si les crédits immobilisés ou rééchelonnés (compte 291)
entrent dans le chiffre publié : aucune restructuration n'est simulée.

## Méthode

- **Couche de portefeuille** ([`scripts/portefeuille_bceao.py`](../../../scripts/portefeuille_bceao.py)), posée à
  côté du simulateur de remboursement, qui n'est pas modifié. Elle rejoue la même règle de caisse : avenir caché
  `futur_hebdo`, report de la trésorerie, une échéance est payée en entier ou manquée. Pour chaque échéance, elle
  garde la semaine où elle tombe et son statut. On en tire, à l'arrêté, l'encours brut (capital restant dû selon le
  tableau d'amortissement à annuités constantes au taux du moteur, plus le capital des échéances impayées) et le
  retard de l'impayé le plus ancien. Un contrôle vérifie que le nombre d'échéances manquées est identique à celui du
  simulateur.
- **Règle de recouvrement.** Comme dans le simulateur, un impayé n'est jamais rattrapé. Une variante de sensibilité
  laisse la caisse régler d'abord les impayés les plus anciens (dernière colonne).
- **Portefeuille à une date d'arrêté.** La production est supposée constante chaque semaine. À l'arrêté, le
  portefeuille contient donc un prêt de chaque âge, de 0 semaine jusqu'à la fin du prêt plus 104 semaines (passage
  en perte à 24 mois). Les prêts soldés ne pèsent rien. Au-delà des 52 semaines d'avenir simulé, l'état du prêt est
  figé. Le taux est la somme des encours en souffrance sur tous les prêts et tous les âges, divisée par la somme des
  encours.
- **Portefeuilles comparés.** Taux hebdomadaire de 0,35 % (paramètres par défaut du moteur, seuil de risque 10 %).
  Un plafond inférieur à 25 000 FCFA vaut refus.
  1. `moteur` sur le générateur `test` : montant = min(demande Kiva, plafond du moteur), demande tirée par
     `demande_demo` pour le secteur de l'archétype ;
  2. `moteur` sur la population `realisme`, de la même façon ;
  3. `mediane_k` : mêmes emprunteurs, montant = k × encaissement hebdomadaire médian vérifié, avec k choisi pour
     que l'exposition totale égale celle du portefeuille `moteur` ;
  4. `plafond` : montant = plafond du moteur.

  Chaque portefeuille est mesuré en remboursement hebdomadaire et mensuel, sur 6 et 12 mois.
- **Données.** Graines neuves, distinctes de celles des runs finaux
  ([`graines.json`](graines.json)) : 500 commerçants `test` et 500 `realisme`. L'intervalle de confiance est un
  bootstrap des commerçants : 1 000 tirages, percentiles 2,5 et 97,5. Résultats complets dans
  [`resultats.json`](resultats.json). Reproduction : `nice -n 10 .venv/bin/python scripts/mesure_bceao.py`.

## Tableau

Taux de dégradation (intervalle de confiance à 95 %). « Moy. » = montant moyen accordé, en FCFA.

| Population | Portefeuille | Modalités | Emprunteurs | Moy. | **> 90 j** | > 30 j | > 0 j | > 90 j, avec rattrapage |
|---|---|---|---|---:|---:|---:|---:|---:|
| test | moteur | hebdomadaire 6 m | 485 (15 refus) | 265 598 | **5,9 % [4,3 ; 7,8]** | 10,2 % [7,5 ; 13,2] | 13,1 % [9,6 ; 16,8] | 0,0 % |
| test | mediane_k | hebdomadaire 6 m | 485 | 265 598 | 4,2 % [3,0 ; 5,5] | 7,6 % [5,5 ; 9,9] | 9,9 % [7,1 ; 12,8] | 0,0 % |
| test | plafond | hebdomadaire 6 m | 485 | 465 938 | 10,8 % [8,3 ; 13,2] | 17,7 % [13,8 ; 21,1] | 22,2 % [17,6 ; 26,5] | 0,0 % |
| test | moteur | hebdomadaire 12 m | 485 (15 refus) | 298 278 | **5,2 % [3,5 ; 6,9]** | 7,3 % [4,9 ; 9,7] | 8,4 % [5,7 ; 11,3] | 0,0 % |
| test | mediane_k | hebdomadaire 12 m | 485 | 298 278 | 4,4 % [3,1 ; 5,9] | 6,2 % [4,4 ; 8,3] | 7,2 % [5,1 ; 9,6] | 0,0 % |
| test | plafond | hebdomadaire 12 m | 485 | 894 227 | 13,1 % [10,3 ; 15,8] | 17,8 % [14,2 ; 21,3] | 20,5 % [16,4 ; 24,5] | 2,6 % [1,0 ; 4,3] |
| test | moteur | mensuelle 6 m | 500 (0 refus) | 278 940 | **2,9 % [0,8 ; 5,2]** | 3,3 % [1,0 ; 6,1] | 3,7 % [1,1 ; 6,7] | 0,0 % |
| test | mediane_k | mensuelle 6 m | 500 | 278 940 | 1,1 % [0,0 ; 2,9] | 1,3 % [0,0 ; 3,4] | 1,4 % [0,0 ; 3,8] | 0,0 % |
| test | plafond | mensuelle 6 m | 500 | 569 600 | 12,1 % [8,1 ; 15,6] | 14,4 % [9,7 ; 18,7] | 16,0 % [10,7 ; 20,8] | 0,4 % [0,0 ; 1,2] |
| test | moteur | mensuelle 12 m | 500 (0 refus) | 298 410 | **0,3 % [0,0 ; 0,9]** | 0,4 % [0,0 ; 1,2] | 0,4 % [0,0 ; 1,3] | 0,1 % [0,0 ; 0,2] |
| test | mediane_k | mensuelle 12 m | 500 | 298 410 | 0,0 % | 0,0 % | 0,0 % | 0,0 % |
| test | plafond | mensuelle 12 m | 500 | 1 089 570 | 10,5 % [7,2 ; 13,6] | 12,5 % [8,6 ; 16,2] | 13,7 % [9,5 ; 17,7] | 8,3 % [5,8 ; 10,8] |
| realisme | moteur | hebdomadaire 6 m | 482 (18 refus) | 266 183 | **3,7 % [2,5 ; 5,0]** | 6,7 % [4,5 ; 8,8] | 8,6 % [5,9 ; 11,4] | 0,0 % |
| realisme | mediane_k | hebdomadaire 6 m | 482 | 266 183 | 5,0 % [3,1 ; 7,2] | 8,4 % [5,6 ; 11,5] | 10,7 % [7,1 ; 14,5] | 0,0 % |
| realisme | plafond | hebdomadaire 6 m | 482 | 439 575 | 11,6 % [7,4 ; 15,9] | 17,0 % [11,9 ; 22,2] | 20,6 % [14,6 ; 26,4] | 0,2 % [0,0 ; 0,6] |
| realisme | moteur | hebdomadaire 12 m | 482 (18 refus) | 291 359 | **3,3 % [2,0 ; 4,6]** | 4,6 % [2,9 ; 6,5] | 5,4 % [3,3 ; 7,6] | 0,0 % |
| realisme | mediane_k | hebdomadaire 12 m | 482 | 291 359 | 3,8 % [2,4 ; 5,3] | 5,3 % [3,4 ; 7,4] | 6,2 % [4,0 ; 8,7] | 0,0 % |
| realisme | plafond | hebdomadaire 12 m | 482 | 843 921 | 12,0 % [8,7 ; 15,4] | 15,7 % [11,6 ; 19,8] | 17,8 % [13,3 ; 22,4] | 4,6 % [1,8 ; 7,5] |
| realisme | moteur | mensuelle 6 m | 500 (0 refus) | 278 200 | **1,7 % [0,4 ; 3,3]** | 2,1 % [0,5 ; 4,1] | 2,4 % [0,6 ; 4,6] | 0,0 % |
| realisme | mediane_k | mensuelle 6 m | 500 | 278 200 | 2,0 % [0,2 ; 4,1] | 2,2 % [0,2 ; 4,6] | 2,4 % [0,3 ; 5,0] | 0,0 % |
| realisme | plafond | mensuelle 6 m | 500 | 554 700 | 19,5 % [13,8 ; 24,7] | 23,0 % [16,5 ; 28,9] | 25,4 % [18,4 ; 31,7] | 2,1 % [0,0 ; 5,6] |
| realisme | moteur | mensuelle 12 m | 500 (0 refus) | 293 190 | **0,0 %** | 0,0 % | 0,0 % | 0,0 % |
| realisme | mediane_k | mensuelle 12 m | 500 | 293 190 | 0,0 % | 0,0 % | 0,0 % | 0,0 % |
| realisme | plafond | mensuelle 12 m | 500 | 1 060 650 | 14,7 % [10,5 ; 18,8] | 17,6 % [12,7 ; 22,3] | 19,3 % [14,1 ; 24,4] | 11,6 % [7,9 ; 15,4] |

Un taux de 0,0 % sans intervalle signifie qu'aucun impayé n'apparaît dans les 500 commerçants : l'intervalle
bootstrap est alors dégénéré, et ce chiffre ne prouve pas un risque nul.

## Limites

- **Le chiffre BCEAO ne mesure pas la même population.** Il porte sur tout le portefeuille des SFD : agriculture,
  consommation, habitat, prêts de groupe. Il inclut aussi des institutions défaillantes, la fraude interne et des
  défauts de gestion. Les commerçants simulés, eux, sont des commerçants mobile money sélectionnés par un moteur.
  Un portefeuille simulé sous 9,4 % ne dit donc pas que Kwedo ferait mieux.
- **Le recouvrement pèse fortement sur le résultat.** Sans rattrapage (règle du simulateur), tout impayé reste
  définitif. Avec rattrapage, les taux à plus de 90 jours tombent presque à 0, sauf au plafond. La vérité d'une
  institution réelle se situe entre les deux, et les relances ne sont pas simulées.
- **Avenir connu sur 52 semaines seulement.** Au-delà, l'état est figé. Les âges de portefeuille sont simulés sur
  une seule année d'avenir par commerçant.
- **Restructurations non simulées**, faute de rééchelonnement dans le simulateur. Les « 3 mois » sont approchés par
  90 jours. Le texte de l'instruction n'a pas été trouvé (voir « Définition retenue »).
- **Une seule graine par population** (500 commerçants). Les intervalles couvrent l'échantillonnage des commerçants,
  pas l'incertitude sur le générateur lui-même.
