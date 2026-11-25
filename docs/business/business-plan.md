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

## Contexte de marché : risque de portefeuille au Bénin
Selon la BCEAO, le taux brut de dégradation du portefeuille des SFD du Bénin est de **9,4 %** au 31/12/2024
(53 SFD, 20 dans l'échantillon), contre **8,9 %** pour l'UMOA et une norme prudentielle **≤ 3 %**. C'est une part
d'encours en souffrance, pas un taux de défaut par prêt (`docs/data/README.md`). Le secteur est donc loin de sa norme :
un outil qui aide à dimensionner les crédits sur les ventes observées répond à un besoin réel. Kwedo ne prétend pas,
à ce stade, faire baisser ce taux (Δp non démontré).

## Stratégie de données
1. **Prototype (actuel)** : simulation + sources publiques pour le seul réalisme de la démo (agrégats Kiva Bénin pour
   montants, fréquences et durées ; repère BCEAO ; Field & Pande pour la fréquence). Aucun modèle entraîné ni évalué
   sur ces sources ; usage non commercial (conditions Kiva). Inventaire : `docs/data/README.md`.
2. **Pilote** : collecte réelle, avec consentement, auprès d'une IMF : flux du compte marchand **et** remboursements
   observés des mêmes commerçants, seule donnée qui permette d'entraîner et d'évaluer le risque.
3. **Partenariats** : opérateur mobile money (accès autorisé aux flux), institutions (historiques de remboursement),
   éventuellement BCEAO / centrales de risques ; les données Kiva ne sont pas réutilisables en exploitation commerciale.

## Mise sur le marché
1. Hackathon : démontrer le parcours. 2. Pilote : une IMF, quelques dizaines de commerçants, mesure des gains.
3. Extension : 3 à 5 institutions, accord opérateur. 4. Régional : UEMOA.

## Hypothèses à valider
Les institutions paient pour gagner du temps ; l'opérateur accorde l'accès autorisé aux flux ; les commerçants
adoptent un compte marchand séparé ; les frais de suivi et relances automatisées sont permis ; une décision humaine
avec moteur paramétrable convient aux prêteurs.
