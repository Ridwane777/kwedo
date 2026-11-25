# Mission mesure à définition égale BCEAO (branche `mesure-bceao`)

Contexte : `docs/data/README.md` compare un défaut simulé de **0,3 %** (population « réalisme », petits montants Kiva) au repère BCEAO **9,4 %** (taux brut de dégradation du portefeuille des SFD du Bénin au 31/12/2024). Ce ne sont pas les mêmes mesures. But : **mesurer la même chose**, sans rien corriger ni régler.

## 1. Définition
- Retrouver la définition BCEAO exacte du « taux brut de dégradation du portefeuille » des SFD (créances en souffrance / encours brut ; seuils de jours de retard selon l'instruction BCEAO applicable aux SFD). Citer la source (bceao.int). Si la définition exacte n'est pas trouvée, l'écrire et retenir l'approximation la plus proche, nommée comme telle.

## 2. Mesure sur portefeuille simulé
- Construire un **portefeuille simulé** comme une institution le détiendrait à une date d'arrêté : prêts accordés à des dates étalées, encours restant dû à la date d'arrêté, retards cumulés par prêt, à partir du simulateur de remboursement existant (sans le modifier ; s'il ne sait pas représenter des jours de retard, ajouter une couche de calcul à côté, documentée).
- Mesurer le **taux de dégradation à la définition BCEAO** pour plusieurs portefeuilles, chacun clairement nommé :
  1. montants **accordés par le moteur** (plafond, demande ≤ plafond) sur le générateur de **test** ;
  2. idem sur la population **réalisme** (demandes Kiva) ;
  3. montants d'une règle simple « médiane × k » à exposition égale (pour situer le moteur) ;
  4. prêts **au plafond** (pire cas raisonnable).
  Fréquences semaine et mois, durées 6 et 12 mois. Graines neuves notées dans `docs/evaluation/bceao/graines.json` ; ne pas utiliser les graines des runs finaux.
- IC bootstrap sur chaque taux.

## 3. Conclusion à écrire
- `docs/evaluation/bceao/README.md` : conclusion en tête (le taux simulé à définition égale, comparé à 9,4 %), méthode, tableau, limites (le chiffre BCEAO inclut agriculture, prêts de groupe, institutions défaillantes, fraude interne ; il porte sur tout le portefeuille, pas sur des commerçants mobile money).
- Dire si l'écart **persiste** (simulateur trop optimiste → l'étape 2 « monde pessimiste » se justifie) ou **disparaît** (le 0,3 % venait des petits montants).
- Mettre à jour `docs/data/README.md` (section contrôle de niveau) et la ligne correspondante de la section 4 « Limites » de `docs/RESULTATS.md`, sans rien changer d'autre dans cette fiche.
- `docs/PROGRESS.md`, rétrospective si utile.

## Règles
- Ne modifier ni `ml/`, ni `packages/engine`, ni les générateurs `reglage`/`test`/`realisme`, ni `docs/evaluation/runs`. Aucun réglage sur 9,4 %.
- CPU, `nice -n 10`, 4 cœurs ; disque à 97 % : supprimer les intermédiaires volumineux.
- Aucune mention d'IA ou de Claude dans les commits. `npm run test:gen` et `npm run test:engine` verts.
- Pousser avec exactement `git push origin mesure-bceao`. Puis `touch ~/kwedo-ops/DONE`. Blocage : raison dans `~/kwedo-ops/BLOCKED`.
