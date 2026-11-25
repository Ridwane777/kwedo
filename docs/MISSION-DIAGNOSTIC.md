# Mission diagnostic du risque (branche `diagnostic`)

À lancer APRÈS la fusion de `demande`.

Demande du propriétaire : « Pour le modèle du risque, diagnostique bien la cause. »
Constats publiés (run `2026-11-24-frequences`, données simulées) :
- (A) le risque annoncé est sous-estimé sous le générateur de test : ~11 % annoncé contre 16–21 % observé, ECE 0,089 / 0,064 / 0,052 (contre ~0,015 sur le réglage) ; pire pour les petits risques ;
- (B) aucun gain contre les règles naïves sur les activités jamais vues (artisanat, quincaillerie), dans aucune cellule ; légèrement pire en hebdomadaire.
Un diagnostic partiel existe déjà (`ml/diagnostic_calibration.py`, ADR 0008 : dépenses personnelles absentes, marge trop haute), mais mesuré sur le réglage seulement. Le compléter, pas le refaire.

But : identifier, chiffres à l'appui, **quelle(s) différence(s)** entre le générateur de réglage et celui de test cause (A) et (B), et **pourquoi** le modèle ne peut pas la voir. Pas de correction dans cette mission : un diagnostic, puis des pistes chiffrées.

## Règle d'or
- **Ne pas utiliser les jeux de test finaux ni leurs graines** (`graines-finales.json`, `graines-frequences.json`) pour diagnostiquer. Graines neuves, notées dans `docs/evaluation/diagnostic/graines.json`. Le run publié reste intact, aucun nouveau « run final ».
- Ne pas modifier `docs/evaluation/runs`, ni le modèle en production (`ml/artifacts` utilisés par le moteur).

## 1. Inventaire des écarts
Lister exhaustivement, depuis le code de `packages/generator`, chaque différence réglage → test (bruit gamma, fréquence/amplitude des chocs, dépenses personnelles imprévues, marge par activité, archétypes jamais vus, saisonnalité, autres). Pour chacune : paramètre, valeur réglage, valeur test, si elle est **observable dans les flux** du commerçant ou non.

## 2. Ablation (une différence à la fois, puis cumul)
- Partir du générateur de réglage ; activer **un seul** écart à la fois ; puis ajouter les écarts un par un dans l'ordre d'impact (cumul) jusqu'au générateur de test complet.
- Pour chaque variante, avec le modèle v3 en production inchangé : ECE et écart annoncé/observé par fréquence, part d'échéances manquées moteur contre règles naïves à exposition égale, sur l'ensemble et sur les archétypes concernés. ≥ 2 000 commerçants par variante, IC bootstrap.
- Tableau : part de la dégradation de (A) et de (B) expliquée par chaque écart.

## 3. Pourquoi le modèle ne le voit pas
- Pour l'écart dominant : montrer si les caractéristiques d'entrée (régularité, part pro, tendance, etc.) **changent ou non** entre variantes (distributions, test de décalage). Si les entrées sont identiques mais le défaut diffère, c'est une cause **non observable** : le dire.
- Activités jamais vues : importance des caractéristiques, résidus par archétype, comparaison avec un modèle simple (règle) ; vérifier si le modèle a appris une dépendance à l'activité (fuite) ou à des motifs propres aux archétypes vus.
- Calibration : courbes de fiabilité par variante ; vérifier si un simple décalage global (biais) ou une pente explique la sous-estimation.

## 4. Pistes chiffrées (sans les appliquer)
Pour chaque cause : correctif possible (ex. marge de prudence par activité inconnue, caractéristique observable supplémentaire, recalibration avec incertitude, données réelles de remboursement), gain attendu mesuré sur les variantes de diagnostic, coût et risque de « régler sur le test ».

## Livrables
- `docs/evaluation/diagnostic/README.md` : conclusion en tête (la cause, en une phrase, avec son chiffre), tableaux, figures (PNG légers), méthode, limites.
- Scripts reproductibles `ml/diagnostic_*.py` (CPU, `nice -n 10`, 4 cœurs, supprimer les intermédiaires volumineux ; disque à 97 %).
- Mise à jour de la rétrospective (section risque) et de `docs/PROGRESS.md`. ADR seulement si une décision est prise (normalement non).
- Aucune mention d'IA ou de Claude dans les commits. `npm run test:engine` vert.
- Pousser avec exactement `git push origin diagnostic`. Puis `touch ~/kwedo-ops/DONE`. Blocage : raison dans `~/kwedo-ops/BLOCKED`.
