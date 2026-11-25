# Fiche de résultats du moteur Kwedo

Synthèse d'une page. Chaque chiffre est repris des fichiers d'évaluation cités, sans arrondi nouveau.
**Toutes les mesures portent sur des données simulées** : aucun remboursement réel de commerçant n'est disponible
publiquement (voir [`data/README.md`](data/README.md)).

## 1. Ce qui est évalué

Le moteur propose, pour un commerçant, un montant de crédit et un risque de défaut à partir de ses encaissements
mobile money vérifiés. Il combine une formule de capacité de remboursement, 2 000 scénarios simulés et un modèle de
risque (LightGBM, calibration isotonique). La question posée : **à montant total prêté égal, le moteur fait-il moins
d'échéances manquées qu'une règle simple ?**

## 2. Référence et protocole

| Élément | Choix |
|---|---|
| Références | Deux règles naïves : « moyenne des encaissements × k » et « médiane × k » |
| Comparaison juste | **Exposition égale** : k est choisi pour que la règle prête au total exactement autant que le moteur |
| Données d'entraînement | Générateur de **réglage** (5 activités) |
| Données de test | Générateur de **test**, différent : bruit, chocs et dépenses personnelles plus forts, et **2 activités jamais vues** (artisanat, quincaillerie) |
| Taille | 4 000 commerçants de test, 10 graines neuves |
| Cellules | 3 fréquences (semaine, quinzaine, mois) × 4 durées (3, 6, 9, 12 mois) |
| Règles d'honnêteté | Protocole et graines **commités avant** le calcul ; **un seul run final** ; échecs publiés |
| Mesure principale | Part d'échéances manquées sur les prêts accordés, IC 95 % bootstrap apparié |

Protocole : [`evaluation/protocole-frequences.md`](evaluation/protocole-frequences.md). Résultats bruts :
[`evaluation/runs/2026-11-24-frequences/resultats.json`](evaluation/runs/2026-11-24-frequences/resultats.json).

## 3. Résultats principaux (run final du 2026-11-24)

**Ensemble du test, 4 000 commerçants** : le moteur fait mieux que les deux règles dans **les 12 cellules**, avec un
IC 95 % de la différence entièrement sous zéro.

| Cellule (exemples) | Moteur | Moyenne × k | Médiane × k |
|---|---|---|---|
| Hebdomadaire, 6 mois | **0,86 %** | 1,23 % | 1,19 % |
| Quinzaine, 6 mois | **1,25 %** | 1,72 % | 1,72 % |
| Mensuelle, 6 mois | **1,89 %** | 2,35 % | 2,37 % |
| Mensuelle, 12 mois | **1,86 %** | 2,28 % | 2,29 % |

**Activités jamais vues (n = 1 130)** : **aucun gain** dans aucune cellule ; en hebdomadaire, le moteur est même
légèrement moins bon (ex. 6 mois : 1,29 % contre 1,21 % et 1,19 %).

**Calibration du risque annoncé** (critère : ECE ≤ 0,05 et écart ≤ 5 points) : **non atteinte**.

| Fréquence | Risque annoncé moyen | Observé | ECE | Écart moyen |
|---|---|---|---|---|
| Hebdomadaire | 11,78 % | 20,63 % | 0,089 | 7,5 pts |
| Quinzaine | 11,31 % | 17,73 % | 0,064 | 7,1 pts |
| Mensuelle | 10,79 % | 15,96 % | 0,052 | 6,6 pts |

**Non-régression** : en hebdomadaire sur le jeu du run précédent, 0,84 % contre 0,93 % d'échéances manquées.

Tableau complet des 12 cellules : [`evaluation/README.md`](evaluation/README.md).

## 3 bis. Comparaison avec les solutions concurrentes au Bénin

**Concurrent de référence : le crédit mobile money de MTN Bénin** (Prêt Xpress, puis MoMo Kash), le plus proche de
Kwedo : il décide aussi à partir de l'historique mobile money, sans passage en agence. Références secondaires : la
**PNIF** et le **Microcrédit Alafia**, voies publiques vers les institutions de microfinance.

| | **Kwedo** (prototype) | **MTN Prêt Xpress** (MTN, Ecobank, Optasia ; 2024) | **MTN MoMo Kash** (MTN, UBA, Jumo ; 2025) | **PNIF** (État, 14 IMF ; lancée le 24/11/2026) | **Microcrédit Alafia** (FNM) |
|---|---|---|---|---|---|
| Données de décision | Encaissements mobile money **vérifiés** (flux pro, allers-retours exclus) | « utilisation des services MoMo et d'autres services MTN » ; compte MoMo ≥ 6 mois ; volume de transactions habituel | Non publié | Plafond **fixé à la main en agence** par l'IMF | Dossier en agence ; phase suivante réservée à qui a remboursé |
| Montant | Selon les ventes, montant libre demandé | Jusqu'à 100 000 FCFA | Non publié (100 000 FCFA selon une source) | 50 000 à 50 M FCFA | Phase II : 50 001 – 100 000 ; phase III : 100 001 – 200 000 FCFA |
| Durée et fréquence | 3 à 12 mois ; semaine, quinzaine ou mois | Jour, semaine ou mois ; périodicité ≤ 30 jours | Non publié | 3 à 36 mois | Phase II : 6 ou 10 mois ; phase III : 6 ou 12 mois, semaine ou mois |
| Coût | Intérêts de l'institution, aucun frais Kwedo | 10 % de frais d'accès + taxes, pénalités de retard | Non publié | 0 FCFA de frais de dossier ; taux selon l'offre | 4 % (6 mois) ; 8 % (10 mois en phase II, 12 mois en phase III) |
| Explication au demandeur | Raisons chiffrées, conseils, plafond avec ses conditions | Récapitulatif avant validation ; motif de refus non expliqué | Non publié | Offre et mensualité affichées | Non publié |
| Qui décide | Un agent de l'institution, avec le risque de la demande | Automatique | Automatique | L'IMF | L'IMF |
| Résultats publiés | Sur données **simulées** (section 3) | Aucun | 170 000 crédits, ~13 Md FCFA ; remboursement > 95 % ; « défaillance inférieure à 0,5 % » (annonce des partenaires, méthode non publiée) | Aucun (lancement du 24/11/2026) | 635 829 bénéficiaires, 53,37 Md FCFA (oct. 2020 – fin 2025) ; « taux de remboursement 95 % » affiché par le FNM, méthode non publiée |

**Ce que cette comparaison permet de dire**
- Kwedo vise un **segment que ces offres couvrent mal** : les montants au-delà de 100 000 FCFA décidés sur les ventes
  réelles. Les produits MTN plafonnent à 100 000 FCFA et décident sur l'usage du téléphone ; la PNIF et Alafia passent
  par une évaluation en agence.
- Kwedo est le seul à **expliquer la décision** (raisons chiffrées, conseils) et à laisser **un humain décider** avec
  un risque calculé ; il ne prête pas lui-même.

**Ce qu'elle ne permet pas de dire**
- **Aucune comparaison chiffrée de performance n'est possible.** Les concurrents ne publient ni leur modèle ni leurs
  données ; leurs taux (> 95 % de remboursement, < 0,5 % de défaillance) sont des annonces sans méthode, sur leurs
  propres clients et des montants plus faibles. Nos taux sont mesurés sur données simulées. Les mettre côte à côte
  serait trompeur.
- Le prototype ne prétend donc **pas** faire mieux que MTN, la PNIF ou Alafia : il propose une autre façon de décider,
  à valider au pilote avec les mêmes définitions que ces acteurs.

Sources : [Banouto, Prêt Xpress (22/03/2024)](https://www.banouto.bj/economie/article/20240322-pret-xpress-mtn-benin-les-abonnes-mobile-money-peuvent-emprunter-jusqu-a-100-000-fcfa) ;
[Cadreco, MoMo Kash (22/10/2025)](https://cadreco.media/evenement/2025/momo-kash-le-nouveau-produit-de-mtn-mobile-money-pour-transformer-lacces-au-credit-au-benin) ;
[CIO Mag, nano-crédit au Bénin (10/06/2026)](https://cio-mag.com/nano-credit-et-bnpl-au-benin-le-mobile-money-comme-alternative-au-credit-classique-pour-le-secteur-informel/) ;
[Bénin Web TV, conditions PNIF](https://beninwebtv.com/benin-credit-48-heures-pnif-50-millions-fcfa/) ;
[lamétéo.info, fonctionnement PNIF](https://www.lameteo.info/benin-obtenir-un-credit-en-48-heures-depuis-son-telephone-pour-financer-les-petits-projets-voici-comment-fonctionne-la-plateforme-pnif/) ;
[Matin Libre, bilan FNM (11/02/2026)](https://matinlibre.com/2026/02/11/inclusion-financiere-au-benin-le-bilan-historique-du-fnm-sous-lere-joel-adeyemi-affoyon/) ;
[FNM](https://www.fnm.bj/) ; [Ministère, Microcrédit Alafia](https://social.gouv.bj/micro-credit-alafia) ;
[FNM, lancement Alafia phase 3](https://www.fnm.bj/lancement-de-la-phase-3-du-microcredit-alafia-a-parakou/).

## 4. Autres mesures (évaluations précédentes, remboursement hebdomadaire : run 1 du moteur 0.2.0, temps machine de la v0.1)

| Mesure | Résultat | Seuil | Verdict |
|---|---|---|---|
| Stabilité : variation du plafond sous 5 % de bruit | p90 4,6 % | ≤ 10 % | ✅ |
| Détection de manipulation (cas injectés) | 100 % détectés, 4,9 % de fausses alertes | — | ✅ sur cas injectés |
| Fidélité des raisons affichées | 100 % identiques au recalcul indépendant | 100 % | ✅ |
| Équité : mêmes flux, activité différente | décisions identiques 40/40 ; aucune variable sensible en entrée | — | ✅ |
| Temps machine | 0,07 s par dossier ; 2 000 scénarios en 6 ms (CPU) | — | ✅ |
| Gain de temps humain | **non mesuré** | — | — |

## 5. Erreurs : d'où viennent-elles ?

Diagnostic par ablation (graines neuves, modèle inchangé) : [`evaluation/diagnostic/README.md`](evaluation/diagnostic/README.md).

- **Cause principale : les activités jamais vues.** Le modèle reconnaît une activité à son profil (99,3 %) et lui
  prête la sécurité des activités connues qui lui ressemblent. Quincaillerie : **4,8 % annoncé, 30,8 % observé** ;
  artisanat : 2,6 % contre 13,0 %. Cela explique **50 / 64 / 75 %** de la sous-estimation (semaine / quinzaine / mois)
  et **la totalité** de l'absence de gain sur ces activités.
- **Causes invisibles dans les flux** : dépenses personnelles imprévues (17 à 25 % de la sous-estimation) et semaines
  vides (3 à 14 %).
- **Forme de l'erreur** : une pente, pas un décalage. Les petits risques (2 à 10 % annoncés) sont 2 à 3 fois trop
  bas ; au-delà de 20 %, l'annonce est presque juste. Le **classement** reste bon (AUC 0,81 sur les activités jamais
  vues) : c'est le **niveau** qui est faux.

## 6. Limites

- **Données simulées seulement.** Le modèle apprend les règles du simulateur, pas le comportement réel.
- **Repère réel très éloigné, à interpréter avec prudence.** La BCEAO mesure **9,4 %** de dégradation du portefeuille
  des institutions de microfinance béninoises (fin 2024) ; une population générée avec le profil de démo donne 0,3 %
  de défaut simulé. Les deux mesures ne sont pas comparables (portefeuille entier contre prêts de démo, causes
  institutionnelles comprises) : l'écart n'est pas encore mesuré à définition égale.
- **Pourcentage de risque indicatif** hors des profils connus ; à ne pas lire comme une probabilité.
- **Aucune mesure sur le terrain** : ni temps humain, ni remboursements réels.
- Sources publiques utilisées pour la démo seulement (BCEAO, agrégats Kiva, essai Field & Pande), jamais pour
  entraîner ou évaluer le modèle.

## 7. Ce qu'on peut affirmer

> Sur données simulées, le moteur classe mieux le risque que les règles simples pour toutes les fréquences et durées
> testées. Il ne fait pas mieux sur des activités jamais vues, et son pourcentage de risque est sous-estimé hors des
> profils connus. La validation se fera sur les remboursements réels d'une institution pilote.

## 8. Reproduire

```
nice -n 10 sh ml/construire_jeux.sh
nice -n 10 .venv/bin/python ml/train_frequences.py
nice -n 10 .venv/bin/python ml/construire_final_frequences.py
nice -n 10 .venv/bin/python ml/evaluate_frequences.py final 2026-11-24-frequences
```

Calcul sur CPU (aucun GPU utilisé). Détails et historique des évaluations précédentes :
[`evaluation/README.md`](evaluation/README.md).
