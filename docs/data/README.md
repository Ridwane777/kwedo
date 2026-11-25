# Données publiques de calage (prototype, non commercial)

> **Règle** : ces sources servent à rendre les **données de démo** plus réalistes. **Aucun modèle n'est entraîné ni
> évalué dessus** : aucune ne contient de remboursements de commerçants reliés à leurs ventes, ce que mesure Kwedo.
> Les générateurs `reglage` et `test` (évaluation, `docs/evaluation/runs`) sont inchangés. La vraie collecte se
> fera au pilote (voir `docs/business/business-plan.md`, « Stratégie de données »).
>
> **Attribution : données issues de Kiva** (www.kiva.org), agrégats calculés à partir de l'export public des prêts.

Recherche du 25/11/2026.

## Sources utilisées

| Source | Contenu | Licence / conditions | Usage dans Kwedo |
|---|---|---|---|
| **BCEAO**, « Principaux indicateurs des SFD au 31 décembre 2024 » et « Note sur la situation de la microfinance à fin décembre 2024 » (bceao.int) | Taux brut de dégradation du portefeuille des SFD : **Bénin 9,4 %** au 31/12/2024 (53 SFD, 20 dans l'échantillon) ; UMOA 8,9 % ; norme prudentielle ≤ 3 % | Publication institutionnelle, citée avec sa source | Repère de **contexte** et contrôle de niveau (ci-dessous) ; jamais une cible de réglage |
| **Kiva**, export `loans.csv` (miroir Kaggle *additional-kiva-snapshot*, 2018), prêts financés | Agrégats seulement, dans [`kiva-agregats.json`](kiva-agregats.json) : 122 274 prêts d'Afrique de l'Ouest dont 5 858 au Bénin ; parts par secteur, activité, fréquence, durée ; quantiles de montant (USD) et de durée par secteur | Kiva Developer Terms : **usage non commercial**, attribution « données issues de Kiva », **pas de redistribution des données brutes** (seuls ces agrégats sont dans le dépôt) | Profil « réalisme » : montants, fréquences, durées des demandes de démo ; parts d'activités de la population `realisme` |
| **PaySim** (Lopez-Rojas, Elmir, Axelsson, *PaySim: a financial mobile money simulator for fraud detection*, EMSS 2016) | Simulateur calé sur un mois de journaux réels d'un opérateur mobile money africain : ~6,36 M transactions, 744 pas d'une heure, ~0,13 % de fraude ; types CASH_IN, CASH_OUT, DEBIT, PAYMENT, TRANSFER | CC BY-SA 4.0 selon un miroir, **non vérifié** à la source ; seuls les ordres de grandeur publiés sont cités, le jeu n'est pas téléchargé | Cité seulement (voir « PaySim : pourquoi non appliqué ») |
| **Field & Pande**, *Repayment Frequency and Default in Microfinance: Evidence from India* (essai randomisé, Calcutta) | Remboursement hebdomadaire contre mensuel : **aucun effet significatif sur les retards ni les défauts** | Article académique, cité | Preuve externe pour l'ADR 0015 (note [0020](../adr/0020-preuve-externe-frequence.md)) |

## Sources cherchées, non utilisables

| Source | Raison |
|---|---|
| Zindi, *African Credit Scoring Challenge* | Données privées, usage limité à la compétition |
| API Kiva | Fermée (403) ; ne pas aspirer le site |
| Essais IPA hors Afrique de l'Ouest (Mexique, sous CC0 ; Maroc ; Philippines) | Contexte trop éloigné du commerçant béninois ; pas de flux de ventes reliés aux remboursements |
| Jeux synthétiques Hugging Face (« credit scoring », « mobile money ») | Synthétiques sans calage documenté : rien de plus réel que notre propre générateur |
| Études de scoring par téléphone (données de terminaux, crédit numérique) | Données non publiées |

## Profil « réalisme » (`packages/generator/kwedo_gen/realisme.py`)

- **Parts d'activités** : population `realisme.generer_population` tirée selon les secteurs Kiva Bénin (Retail
  48,2 %, Food 34,1 %, Services 9,7 %, Clothing 3,7 % ; secteurs sans archétype, ~4 %, renormalisés). Correspondance :
  téléphonie, cosmétique, quincaillerie → Retail ; tissus → Clothing ; alimentation, restauration → Food ;
  artisanat → Services. Dynamique des ventes identique au réglage (vérifié par test).
- **Demandes de démo** (`demande_demo`, champ `demande_demo` de `data/demo/demo.json`) : montant tiré entre p10 et
  p90 du secteur Kiva Bénin (interpolation linéaire entre quantiles ; queues inconnues, donc bornées), converti au
  taux **1 USD ≈ 555 FCFA** (moyenne BCE 2018 : 1 EUR = 1,181 USD ; parité fixe 1 EUR = 655,957 FCFA ; sans
  correction d'inflation), arrondi à 5 000 FCFA. Fréquence : mensuelle avec la probabilité Kiva Bénin (94 %), sinon
  l'autre fréquence de l'institution. Durée : distribution Kiva Bénin (8 à 15 mois, 12 mois le plus fréquent),
  **bornée à 12 mois** (maximum des institutions de démo). Tirage séparé : les transactions ne changent pas.
- **Démo régénérée** (`scripts/regenerer_demo.py`) : les 9 personnes et leurs transactions sont conservées (profils
  sains, limite, à risque ; Koffi ancre le test de non-régression du moteur, Gildas le crédit en défaut de la
  console). Activités des 9 : commerce 6/9, alimentation 2/9, services 1/9, contre 52 / 34 / 10 % chez Kiva : écart
  assumé, changer une personne casse un cas de démo testé. Les demandes de la file prennent montant, fréquence et
  durée du profil ; Hounkpè et Yaba gardent une demande au-dessus du plafond (profils à risque).

### PaySim : pourquoi non appliqué

PaySim décrit des comptes de particuliers (environ une opération émise par compte sur le mois) dans une devise non
nommée : ni le rythme ni les montants ne correspondent à des **encaissements de commerçants** (des dizaines de
paiements clients par jour). Les flux restent ceux des archétypes (ticket de 1 500 à 15 000 FCFA). Seule
comparaison possible : la fréquence de fraude (~0,13 %) contre la part de dossiers manipulés de la démo (3 sur 9),
volontairement très surreprésentée pour montrer les alertes.

## Contrôle de niveau (`scripts/controle_niveau.py`)

| Mesure | Valeur |
|---|---:|
| Dossiers de démo (3 institutions, historique compris) | 19 |
| Au-dessus de la tolérance de l'institution | 6 (31,6 %) |
| Risque moyen de la demande (moteur) / médian | 10,4 % / 5,7 % |
| Population « réalisme » (300) : défaut simulé, demande Kiva mensuelle | 0,3 % |
| **Repère BCEAO Bénin**, dégradation brute du portefeuille des SFD | **9,4 %** |

**Pourquoi ce n'est pas la même mesure.** Le taux BCEAO est une **dégradation de portefeuille** : part de l'encours
(en montant) en souffrance, créances restructurées ou douteuses, à une date, sur tous les crédits des SFD (y compris
consommation, habitat, groupes), sans sélection par un moteur. Ce n'est **pas** un taux de défaut par prêt. Le risque
de Kwedo est une probabilité, par dossier, d'au moins une échéance manquée, sur un commerçant au compte marchand
observé. La part « au-dessus de la tolérance » de la démo est un choix de mise en scène (profils limites et à risque
voulus), pas une fréquence.

**Ce que dit l'écart.** La démo (risque moyen 10,4 %) est du même ordre que le repère, par construction plus que par
calage. La population « réalisme » fait apparaître un défaut simulé très bas (0,3 %) : les montants Kiva (médiane
~250 000 FCFA) sont petits devant les ventes simulées des archétypes (dizaines de milliers de FCFA par jour). Soit
les emprunteurs Kiva vendent bien moins que nos archétypes, soit le futur caché du simulateur est trop optimiste ;
les sources publiques ne permettent pas de trancher. **Rien n'est réglé sur 9,4 %** : à mesurer au pilote.

**Mesure à définition égale** ([`docs/evaluation/bceao/README.md`](../evaluation/bceao/README.md)). On a construit un
portefeuille simulé à une date d'arrêté : tout l'encours d'un prêt est déclassé dès qu'une échéance reste impayée
plus de 90 jours, selon le Référentiel comptable des SFD. Résultat avec les montants Kiva plafonnés par le moteur :
**3 à 6 %** en remboursement hebdomadaire, **0 à 3 %** en mensuel. Avec des prêts au plafond, **10 à 20 %**.
L'écart avec 9,4 % **disparaît en grande partie** : le 0,3 % venait de la mesure (défaut compté par prêt) et des
petits montants en mensuel sur 12 mois, pas d'un simulateur uniformément trop optimiste. Les deux populations
restent différentes, donc la comparaison ne prouve rien sur la qualité du moteur.
