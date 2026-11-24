# Business plan (prototype)

## Proposition de valeur
- **Commerçant** : savoir combien il peut emprunter et pourquoi, progresser, envoyer son dossier sans se déplacer. Gratuit.
- **Institution** : dossiers analysés et explicables, décisions plus cohérentes, suivi des échéances et relances au même
  endroit, accès à des commerçants préqualifiés.
- **Opérateur mobile money** : nouveau service, transactions supplémentaires (encaissements, remboursements).

## Modèle de revenus (cahier, statut « Phase 2 »)
Formule mensuelle par institution selon sa taille (volume inclus de dossiers analysés, de crédits suivis,
d'utilisateurs, support), supplément à prix fixe au-delà. Prix **indépendant** de la décision et du montant prêté.
Aucune commission sur le crédit, aucun frais au commerçant. Formules : Pilote, Standard, Sur mesure.

## Valeur pour le prêteur (formule du cahier, aucune valeur connue)

V_dossier = (t_avant − t_après) × c_h + Δp × M ; seuil de rentabilité N* = (C_fixes − A) / (p − c_var).
Toutes les variables se mesurent en pilote (protocole de temps : `docs/evaluation/protocole-temps.md`).

**Ce que l'évaluation simulée permet de dire** : Δp n'est pas démontré à ce stade (`docs/evaluation/README.md` §1).
La valeur à défendre en premier est donc le **temps** et la **traçabilité**, pas la réduction d'impayés.

## Mise sur le marché
1. Hackathon : démontrer le parcours. 2. Pilote : une IMF, quelques dizaines de commerçants, mesure des gains.
3. Extension : 3 à 5 institutions, accord opérateur. 4. Régional : UEMOA.

## Stratégie de données : démarrer prudent, apprendre du terrain
Le moteur n'a jamais vu de vrai remboursement ; le diagnostic montre qu'il extrapole mal vers des activités qu'il
ne connaît pas. On ne le corrige pas en inventant des données : on les collecte.
1. **Crédit progressif (ADR 0018)** : petit premier crédit (palier fixé par l'institution), puis palier relevé à
   chaque crédit remboursé à l'heure. L'exposition reste bornée là où l'incertitude est la plus forte, et chaque
   crédit devient une donnée réelle (échéances, dates de solde, retards). Pratique déjà connue des IMF béninoises
   (Microcrédit Alafia, FNM : phase III réservée aux bénéficiaires ayant remboursé la phase II).
2. **Pilote avec une institution** : quelques dizaines de commerçants, mêmes paliers que l'institution pratique déjà ;
   mesure du remboursement par cycle et comparaison avec la décision qu'aurait prise le moteur seul. L'efficacité du
   palier n'est **pas** mesurée par le prototype (non démontrable en simulation sans inventer le comportement des
   commerçants) : c'est le premier chiffre que le pilote doit produire.
3. **Partenariats de données** : historiques anonymisés de remboursement (FNM, IMF partenaires du PNIF), flux des
   opérateurs mobile money sous accord, dans le cadre de l'APDP (autorisation préalable, finalité, minimisation,
   durée de conservation). Ces données servent à recalibrer le risque par activité, puis à relâcher les paliers là où
   le risque mesuré le permet.

## Hypothèses à valider
Les institutions paient pour gagner du temps ; l'opérateur accorde l'accès autorisé aux flux ; les commerçants
adoptent un compte marchand séparé ; les frais de suivi et relances automatisées sont permis ; une décision humaine
avec moteur paramétrable convient aux prêteurs.
