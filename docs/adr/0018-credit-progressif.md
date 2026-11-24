# ADR 0018 : crédit progressif (palier par institution)

- Statut : accepté
- Date : 2026-11-24

## Contexte

Le diagnostic du 24/11 (`docs/evaluation/diagnostic/`) montre que l'écart de calibration vient surtout des activités
jamais vues : le modèle extrapole le profil d'un commerçant vers une activité qu'il ne connaît pas (quincaillerie
annoncée à 4,8 % de défaut, observée à 30,8 %). Sans vraies données de remboursement, on ne peut pas corriger cela
par un réglage. Décision du propriétaire : appliquer **le crédit progressif seulement** (pas de plancher de risque,
pas de nouveau run). Pratique du terrain : le Microcrédit Alafia (FNM) réserve sa phase III (jusqu'à 200 000 FCFA)
aux bénéficiaires ayant entièrement remboursé la phase II.

## Options

| Option | Ce qu'elle fait | Gagné | Perdu |
|---|---|---|---|
| Pas de palier | Le plafond prudent du moteur est le seul plafond | Simplicité ; montants les plus hauts | Toute l'erreur d'extrapolation porte sur le premier crédit, le plus incertain |
| Palier fixe | Un montant maximal unique pour tous, toujours | Exposition bornée | Ne récompense pas un bon remboursement ; ne produit pas d'apprentissage |
| **Palier progressif** (retenu) | Petit premier crédit, puis palier × multiplicateur après chaque crédit remboursé à l'heure ; retard grave : un palier de moins (ou blocage) | Exposition bornée là où l'incertitude est la plus forte ; chaque crédit remboursé devient une **donnée réelle** ; pratique connue des IMF | Montants plus bas que le plafond prudent au début, y compris pour de bons commerçants ; un réglage de plus pour l'institution |
| Plancher de risque pour activité inconnue | Risque au moins égal au défaut simulé de l'activité si elle n'a pas été vue | Gain mesuré au diagnostic (ECE jamais vus 0,182 → 0,120, sans réglage sur le test) | Modifie le moteur et demande un nouveau run au protocole figé : reporté (rétrospective) |

## Décision

- **Couche service/API, pas le moteur** (`packages/engine` inchangé) : le moteur calcule plafond prudent et risque
  comme avant ; `Service.palier()` limite par-dessus le montant accordable : **min(plafond prudent, palier)**. Le
  palier ne peut que réduire ; il ne dépasse jamais le plafond du moteur.
- **Politique par institution, versionnée** (`politique_palier`, ajout seul, migration `0006_palier.sql`) :
  `palier_initial`, `multiplicateur` (1 à 3), `retard_grave_jours` (1 à 90), `apres_defaut` (`redescendre` |
  `bloquer`). Démo : Lagune 150 000 × 1,5 ; Baobab 200 000 × 1,4 ; Solidaire 100 000 × 1,3 (bloquer). Paliers
  arrondis aux 5 000 FCFA inférieurs (150 000 → 225 000 → 335 000).
- **Cycles dérivés des données stockées** : crédits et échéances du commerçant **chez cette institution seulement**
  (cloisonnement, ADR 0009). Nouvelle colonne `echeances.soldee_le` (date de solde). État d'un crédit : remboursé à
  l'heure (tout soldé, aucune échéance soldée plus de `retard_grave_jours` après sa date), en cours, ou retard grave
  (une échéance soldée, ou encore due, au-delà de ce délai : la descente s'applique sans attendre le solde). Aucune
  donnée saisie à la main.
- **Choix documenté après un retard grave** : par défaut **redescendre d'un palier** (minimum : palier 1) ; l'option
  `bloquer` met le palier à 0 (examen au cas par cas). Un crédit remboursé à l'heure après un blocage ne débloque pas
  seul : c'est l'agent qui décide, avec motif.
- **Décision** : au-dessus du palier, l'agent peut accorder ou contre-proposer avec un **motif de dépassement
  obligatoire** (10 caractères au moins) enregistré dans `decisions.motif_depassement` avec `decisions.palier`
  (journal en ajout seul). La borne du moteur reste appliquée par le serveur (contre-proposition ≤ max(plafond de la
  formule, montant demandé), ADR 0017) : le motif ne permet jamais de la franchir. Contre-proposition par défaut à
  l'écran : min(palier, plafond prudent, montant demandé).
- **Commerçant** : estimation, simulateur et dépôt affichent les deux chiffres et lequel limite, une frise de paliers
  et la condition pour monter ; la demande libre reste possible au-dessus du palier (avertissement non bloquant) ; le
  levier « rembourser à l'heure » chiffre le palier suivant ; à la fin d'un remboursement à l'heure : « Palier
  suivant débloqué : jusqu'à X ».

## Conséquences

- **L'efficacité n'est pas mesurée.** Montrer que le palier réduit les impayés demanderait de simuler comment les
  commerçants réagissent à un petit premier crédit et à la promesse d'un palier plus haut : ce serait inventer leur
  comportement. Le palier est une mesure de prudence et un mécanisme de collecte de données réelles, pas un gain
  démontré. À mesurer en pilote (taux de remboursement par cycle, comparaison avec la décision du moteur seul).
- Données de démo : l'historique (Gildas palier 2, Edwige palier 3 limitée par le plafond, Hounkpè redescendu au
  palier 1) est généré par le simulateur de remboursement existant (`kwedo_gen.remboursement.rembourser`) sur les
  encaissements cachés de chaque commerçant ; la fenêtre de Hounkpè (semaine 20) est la seule où le simulateur manque
  une échéance (`scripts/chercher_retard.py`) ; une échéance manquée est régularisée 14 jours plus tard (convention de
  démo). Mesure : `scripts/mesure_palier.py`.
- Le commerçant doit connaître la règle (CGU, `docs/legal/cgu.md`).
- Coût : quelques requêtes SQL par affichage, pas d'analyse moteur supplémentaire (sauf `GET /commercants/{id}/palier`
  et les conseils, une analyse chacun).
