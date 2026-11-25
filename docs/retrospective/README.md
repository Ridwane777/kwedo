# Rétrospective

## Regard global
Le prototype couvre tout le périmètre « Prototype » et « Prototype (simulé) » du cahier, priorités 1 à 3, avec un
parcours complet joué automatiquement de l'estimation au remboursement et un mode démo en 9 temps. Le moteur est
déterministe, explicable et borné par la formule ; le journal est imposé en ajout seul par la base.

**Le résultat le plus important est négatif et doit être dit** : à montant total prêté égal, le moteur ne classe pas
mieux qu'une règle « médiane des encaissements × k » sur données simulées. Un premier chiffre favorable venait d'une
comparaison à expositions inégales ; il a été retiré. Le critère « le moteur bat la règle naïve sur des profils
jamais vus » de la Définition de terminé n'est donc **pas** atteint.

## Défauts trouvés par la vérification (et corrigés)
- Raison « tendance » de signe inversé (vue en relisant une capture de la console).
- Plafond qui **montait** quand on baissait les ventes de 30 % (modèle nourri du scénario au lieu de l'historique) : attrapé par un test.
- Marqueurs internes « [J+3] » visibles dans les SMS simulés ; espace fine absente de la serif ; contraste insuffisant sur une ligne sélectionnée ; journal mal ordonné (horloge figée) ; LCP de `/app` trop haut.

## Organisation
Une étape = un commit poussé, `PROGRESS.md` tenu à chaque étape. Captures relues à chaque écran : la relecture
visuelle a trouvé autant de défauts que les tests.

## Limites matérielles
- **Pas de GPU** : tout a tourné sur CPU (4 cœurs max, `nice -n 10`). Le backend `cupy` existe mais n'a jamais été exécuté.
- `pip install` refusé dans la première version : FastAPI, scikit-learn et LightGBM remplacés par la bibliothèque
  standard et NumPy (levé lors de la passe de correction : `.venv`).
- Machine partagée, disque à 96 % : projet 654 Mo + navigateurs de test 701 Mo dans `~/.cache/ms-playwright`
  (emplacement par défaut de Playwright, seul écart à la règle « tout dans `~/kwedo` »).
- Les serveurs de fond sont coupés après un délai : relancés à chaque besoin.

## Échéances
Réalisé en une session continue. Le temps a été mis d'abord sur le fil de démo (cahier : « un seul fil de bout en
bout »), puis sur l'évaluation, qui a révélé la principale faiblesse.

## Alternatives chiffrées (mesures de ce projet)
| Choix | Alternative | Ce qu'on sait |
|---|---|---|
| Forme fermée de la simulation (min cumul/(t+1)) | Simulation pas à pas + dichotomie | Forme fermée : 6 ms pour 2 000 trajectoires ; la dichotomie demanderait ≈ 17 passes |
| Modèle de défaut en modulation (γ = 4) | Formule seule | Formule seule ≈ même niveau ; aucun des deux ne bat nettement la médiane |
| Proxy API lu à l'exécution | Rewrites Next figées au build | Nécessaire pour isoler les E2E sur 3462/3463 |
| Courbe en SVG maison | Recharts | 0 Ko de dépendance ; JS par page 197–405 Ko non compressé |

## À faire ensuite (première version)
Recalibrer le risque et m par activité sur de vrais remboursements ; mesurer le temps humain ; réessayer du gradient
boosting ; passer l'API sur FastAPI si autorisé (réécriture de `app.py` seulement).

## Passe de correction (C1 à C6)

**Fait** : API sur FastAPI sans changement de contrat (ADR 0006) ; dépendances épinglées dans `.venv` ; défaut et
prévision sur LightGBM, comparés à NumPy (ADR 0007) ; cause de la sous-estimation trouvée (dépenses personnelles
absentes de la simulation, marge supposée trop haute) et calibration isotonique sur une partition dédiée ; montant
fixé par le risque calibré sous `L_max` (ADR 0008) ; chronomètre humain exportable (C5), retiré depuis sur
décision produit sans avoir servi : le gain de temps humain reste non mesuré.

**Résultat, dit tel quel** : protocole et graines figés avant le run ; **1 run final**, en échec. Le moteur bat
nettement les deux règles naïves sur l'ensemble du générateur de test (0,93 % d'échéances manquées contre ≈ 1,24 %,
IC excluant zéro), mais **pas sur les activités jamais vues**, et son risque annoncé reste sous-estimé hors du
domaine de réglage (ECE 0,089).

**Pourquoi pas de run 2** : les deux échecs viennent d'une dérive que les flux ne montrent pas (plus de dépenses
personnelles, bruit différent, activités inconnues). Les seules corrections qui viseraient ce point consisteraient à
élargir le générateur de réglage vers les réglages du générateur de test, que nous connaissons : ce serait régler
indirectement sur le test. Nous avons préféré publier l'échec plutôt que de consommer les runs restants ainsi.

**Défauts trouvés en route** : instabilité du plafond (p90 16 % sous 5 % de bruit) due aux paliers de l'isotonique et
à un modèle trop fin ; corrigée par un modèle plus régularisé et une calibration lissée (3,4 % sur le réglage, 4,6 %
au run final).

**Ensuite** : calibrer sur de vrais remboursements d'une institution pilote, par activité ; prévoir une marge de
prudence explicite pour les activités sans historique de remboursement ; mesurer le temps humain selon `docs/evaluation/protocole-temps.md`, avec un chronomètre externe.

## Mission risque toutes fréquences (ADR 0016)

**Ce que ça a coûté** : environ 25 minutes de calcul sur 4 cœurs (jeux de réglage ≈ 6 min, entraînement des deux
variantes ≈ 5 min, contrôle sur le réglage ≈ 3 min, jeux finaux 2 × 4 000 commerçants ≈ 8 min, run final ≈ 5 min),
aucun GPU ; 12 cellules × 14 échéances par commerçant, soit ≈ 500 000 lignes d'entraînement. Côté code : un module de
remboursement par échéancier dans le générateur, un modèle v3 et sa calibration par fréquence, un chemin v3 dans le
moteur, un champ `risque_eprouve`. Un seul run final, aucun relancé.

**Ce qui reste faible** :
- Les activités jamais vues : le moteur n'y bat les règles naïves dans aucune cellule (hebdomadaire : légèrement
  moins bon). La calibration ne corrige pas une dérive que les flux ne laissent pas voir.
- La calibration sous le générateur de test : risque annoncé ≈ 11 %, observé 16 à 21 % ; ECE 0,05 à 0,09.
- La règle « éprouvée » est relative à l'hebdomadaire, lui-même imparfait : la mention a disparu parce que quinzaine
  et mensuel font au moins aussi bien, pas parce que le risque est une probabilité fiable.
- Défaut mesuré à la semaine (retard toléré X = 0 jour) ; mois de 52/12 semaines, pas de dates calendaires.
- Tout reste simulé : la validation qui compte se fera sur les remboursements d'une institution pilote.

## Diagnostic du risque (`docs/evaluation/diagnostic/`)

**Cause trouvée** : l'ablation du générateur (réglage → test, un écart à la fois puis en cumul, graines neuves, v3
inchangé) attribue l'essentiel du problème aux **activités jamais vues**. Cet écart explique 50 / 64 / 75 % de la
sous-estimation (hebdo / quinzaine / mensuel) et la totalité de l'absence de gain contre les règles naïves. Le
modèle reconnaît l'activité à son profil (99 %) et extrapole « ticket élevé → sûr » : quincaillerie annoncée
4,8 %, observée 30,8 %. La phrase « une dérive que les flux ne laissent pas voir » écrite plus haut était donc
**fausse pour la cause principale** : les entrées changent nettement (KS 0,2–0,3), mais le modèle les lit hors de son
étendue d'entraînement. Elle reste juste pour le second bloc : les dépenses personnelles et les semaines vides
(≈ 40 % de l'écart hebdo) ne touchent que le futur caché.

**Forme** : une pente (b ≈ 0,61) plutôt qu'un décalage ; les petits risques sont les plus sous-estimés.

**Leçon** : la calibration isotonique sur le réglage ne protège pas d'une extrapolation sur des profils hors
étendue. Une recalibration apprise sur le test corrige l'ECE (0,079 → 0,012), mais dégrade le réglage
(0,007 → 0,084) : c'est se régler sur le test. Le correctif le moins risqué est un plancher « risque simulé » pour
les activités inconnues (ECE jamais vus 0,18 → 0,12). Rien n'est appliqué ; coût ≈ 75 min de calcul sur 4 cœurs.

## Recherche de données réelles (`docs/MISSION-DONNEES.md`, branche `donnees`)

- **Aucune source publique ne relie ventes et remboursements d'un même commerçant** : c'est la donnée dont le
  risque a besoin. Kiva n'a pas de défaut (le statut décrit la collecte), BCEAO donne un agrégat de portefeuille,
  PaySim est un simulateur de comptes de particuliers, les jeux de compétition ou d'études sont privés. Le pilote
  reste le seul chemin vers une évaluation réelle ; les sources servent au réalisme de la démo, rien de plus.
- **Ce que le calage a appris** : les demandes Kiva Bénin (médiane ~250 000 FCFA, 94 % mensuelles, ~12 mois) sont
  petites devant les ventes simulées ; sur une population « réalisme », le défaut simulé tombe à 0,3 % contre 9,4 %
  de dégradation BCEAO (mesures différentes, `docs/data/README.md`). Le niveau des ventes des archétypes ou
  l'optimisme du futur caché sont à questionner au pilote ; rien n'a été réglé sur le repère.
- **Contrainte de démo** : la composition des 9 personnes n'a pas pu suivre Kiva (essai : Gildas en alimentation
  supprime le seul crédit en défaut de la console) ; le réalisme passe par les demandes, pas par les personnes.
- Preuve externe utile : Field & Pande (fréquence mensuelle sans hausse des défauts) soutient l'ADR 0015 (ADR 0020).
