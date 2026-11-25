# Fiche de résultats de Kwedo

Comparaison avec une référence concurrente, mesures, erreurs et limites. Chaque chiffre est sourcé ; ceux de Kwedo
sont repris des fichiers d'évaluation du dépôt. **Les mesures de Kwedo portent sur des données simulées.**

## 1. Référence : le crédit mobile money de MTN Bénin

**Concurrent de référence : MTN Bénin** (Prêt Xpress depuis 2024, avec Ecobank et Optasia ; MoMo Kash depuis 2025,
avec UBA et Jumo). C'est l'offre la plus proche de Kwedo : un crédit décidé à partir de l'historique mobile money, sans
passage en agence.

| | **Kwedo** (prototype) | **MTN Prêt Xpress / MoMo Kash** |
|---|---|---|
| Données de décision | Encaissements mobile money **vérifiés** du commerce (flux personnels, transferts vers soi et allers-retours exclus) | « utilisation des services MoMo et d'autres services MTN » ; compte MoMo depuis au moins 6 mois ; volume de transactions habituel |
| Qui prête | Une institution de microfinance partenaire | Partenaires bancaires : Ecobank, puis UBA (rôle exact non publié) |
| Qui décide | Un agent de l'institution, avec le risque calculé pour la demande | Décision automatique, « en temps réel » |
| Montant | Montant demandé librement, plafond calculé sur les ventes | Jusqu'à **100 000 FCFA** |
| Durée, fréquence | 3 à 12 mois ; chaque semaine, quinzaine ou mois | Jour, semaine ou mois ; périodicité ≤ 30 jours |
| Coût pour l'emprunteur | Intérêts de l'institution ; aucun frais Kwedo ; coût total affiché | **10 % de frais d'accès** par prêt, plus taxes ; pénalités en cas de retard |
| Explication | Raisons chiffrées, conseils pour augmenter le plafond, plafond affiché avec ses conditions | Récapitulatif avant validation ; motif d'un refus non expliqué |
| Résultats publiés | Voir section 2 (données simulées) | MoMo Kash : **170 000 crédits**, près de **13 Md FCFA** ; remboursement **> 95 %** ; défaillance **< 0,5 %** (annonce des partenaires, définition et période non publiées) |

Sources : [Banouto, Prêt Xpress (22/03/2024)](https://www.banouto.bj/economie/article/20240322-pret-xpress-mtn-benin-les-abonnes-mobile-money-peuvent-emprunter-jusqu-a-100-000-fcfa) ;
[Cadreco, MoMo Kash (22/10/2025)](https://cadreco.media/evenement/2025/momo-kash-le-nouveau-produit-de-mtn-mobile-money-pour-transformer-lacces-au-credit-au-benin) ;
[CIO Mag, nano-crédit au Bénin (10/06/2026)](https://cio-mag.com/nano-credit-et-bnpl-au-benin-le-mobile-money-comme-alternative-au-credit-classique-pour-le-secteur-informel/).

**Positionnement.** MTN couvre les petits montants instantanés (≤ 100 000 FCFA). Kwedo vise les montants supérieurs,
décidés sur les ventes réelles du commerce, avec une décision expliquée et prise par un humain de l'institution.

## 2. Mesures

### Côte à côte

| Mesure | Kwedo | MTN | Comparable ? |
|---|---|---|---|
| Échéances manquées / défaillance | 0,86 % à 1,89 % des échéances selon la fréquence (6 mois) | « < 0,5 % » de défaillance | **Non** : définitions différentes, montants MTN plus faibles, nos données simulées |
| Remboursement | — | « > 95 % » | **Non** : méthode non publiée |
| Montant maximal | Selon les ventes (plafonds des commerçants de démo : de 50 000 à 920 000 FCFA) | 100 000 FCFA | Oui (conditions publiques) |
| Coût d'accès | 0 FCFA de frais Kwedo | 10 % du montant + taxes | Oui (conditions publiques) |
| Décision expliquée | Oui, raisons fidèles au calcul à 100 % | Non publié | En partie |
| Délai de décision | 0,07 s de calcul par dossier, puis décision humaine | « temps réel » | En partie |

### Mesures de Kwedo (données simulées, 4 000 commerçants, protocole figé avant le calcul, un seul run)

| Mesure | Résultat |
|---|---|
| Échéances manquées sur les prêts accordés (6 mois) | 0,86 % (semaine), 1,25 % (quinzaine), 1,89 % (mois) |
| Activités jamais vues pendant l'entraînement | 1,29 % (semaine), 1,63 % (quinzaine), 2,07 % (mois) |
| Risque annoncé contre observé | 11,78 % contre 20,63 % (semaine) ; 10,79 % contre 15,96 % (mois) ; ECE 0,052 à 0,089 |
| Stabilité du plafond sous 5 % de bruit | p90 4,6 % |
| Détection de manipulation (cas injectés) | 100 %, 4,9 % de fausses alertes |
| Fidélité des raisons affichées | 100 % |
| Équité (mêmes flux, activité différente) | décisions identiques 40/40 |
| Temps de calcul | 0,07 s par dossier, sur CPU |

Détail et reproduction : [`evaluation/README.md`](evaluation/README.md),
[`evaluation/protocole-frequences.md`](evaluation/protocole-frequences.md),
[`evaluation/runs/2026-11-24-frequences/resultats.json`](evaluation/runs/2026-11-24-frequences/resultats.json).

## 3. Erreurs

Diagnostic : [`evaluation/diagnostic/README.md`](evaluation/diagnostic/README.md).

- **Le risque annoncé est sous-estimé**, surtout pour les petits risques (2 à 10 % annoncés, 2 à 3 fois plus
  observés).
- **Cause principale : les activités jamais vues.** Le modèle les confond avec des activités connues qui leur
  ressemblent : quincaillerie annoncée à **4,8 %**, observée à **30,8 %**. Cela explique 50 à 75 % de la
  sous-estimation selon la fréquence.
- **Causes invisibles dans les ventes** : dépenses personnelles imprévues et semaines sans vente.
- Le **classement** des commerçants reste bon (AUC 0,81 sur les activités jamais vues) : c'est le **niveau** du
  risque annoncé qui est faux.

## 4. Limites

- **Aucune comparaison chiffrée de performance avec MTN n'est possible.** MTN ne publie ni son modèle, ni ses données,
  ni la définition de ses taux ; ses prêts sont plus petits et ses clients différents. Kwedo ne prétend donc **pas**
  faire mieux que MTN : il propose une autre façon de décider, sur un autre segment.
- **Les mesures de Kwedo sont simulées.** Le repère réel disponible, la dégradation du portefeuille des institutions
  de microfinance béninoises (**9,4 %** fin 2024, BCEAO), porte sur une autre population. Mesuré à définition égale
  sur un portefeuille simulé (encours en souffrance de plus de 90 jours ÷ encours brut), le simulateur donne 0 à 6 %
  aux montants du moteur et 10 à 20 % au plafond (`docs/evaluation/bceao/README.md`). Ce n'est pas une preuve que
  Kwedo ferait mieux.
- Le **pourcentage de risque** est indicatif hors des profils connus.
- **Rien n'est mesuré sur le terrain** : ni remboursements réels, ni temps humain de traitement.
- **Prochaine étape** : un pilote avec une institution, mesuré avec les mêmes définitions que les acteurs du marché
  (remboursement, défaillance à 30 et 90 jours), pour une comparaison réelle.
