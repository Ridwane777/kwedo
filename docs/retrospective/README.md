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
fixé par le risque calibré sous `L_max` (ADR 0008) ; chronomètre humain exportable (C5).

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
prudence explicite pour les activités sans historique de remboursement ; mesurer le temps humain avec le chronomètre.
