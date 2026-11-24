# Mission demande libre et décision par le risque (branche `demande`)

À lancer APRÈS la fusion de `risque-frequences` (s'appuie sur le risque appris pour toutes les fréquences et durées).

Demande du propriétaire : « lorsque tu constitues un dossier de crédit, tu dois mettre la somme que tu veux, pas celle que le moteur estime, et une raison. Niveau institution […] ça va plus se centrer sur le risque désormais. »

## 1. Commerçant : dépôt du dossier
- Champ **montant souhaité**, saisi librement (pas de pré-remplissage forcé au plafond). Le plafond estimé reste affiché comme repère (« jusqu'à X FCFA reste prudent pour vos ventes »).
- **Objet du crédit** obligatoire : catégorie (achat de stock, équipement, fonds de roulement, besoin ponctuel, autre) + une phrase libre (max ~200 caractères).
- Au-dessus du plafond : autorisé, avec un avertissement clair et non bloquant ; l'échéance et le coût total se recalculent sur le montant demandé.
- Le récapitulatif avant le code SMS montre montant demandé, objet, fréquence, durée, échéance, coût total.

## 2. API / moteur
- Le dossier stocke montant demandé, catégorie, objet, fréquence, durée. Validation serveur (montant > 0, borne haute raisonnable, objet non vide, catégorie connue).
- Le moteur calcule le **risque pour le montant demandé** (et la fréquence, la durée), en plus du plafond ; réutiliser les fonctions existantes, ne pas changer le modèle.
- Raisons rédigées pour la demande (ex. « l'échéance demandée représente 70 % d'une mauvaise semaine »).

## 3. Console institution : fiche centrée sur le risque
- En tête : montant demandé, objet, fréquence, durée ; **risque de défaut pour cette demande** ; indicateur « dans la tolérance / au-dessus » selon le `seuil_risque` de l'institution.
- En repère : plafond prudent et son risque, échéance rapportée à la mauvaise période.
- Décisions : **Accorder** la demande ; **Contre-proposer** (montant, durée, fréquence dans les modalités de l'institution, risque recalculé à chaque changement) ; **Refuser** ; motif obligatoire, tracé au journal.
- La file des dossiers affiche montant demandé et risque, triable par risque.
- L'offre côté commerçant montre clairement si c'est la demande acceptée ou une contre-proposition (avec l'écart).
- Respecter le cloisonnement (ADR 0009) : l'admin ne voit ni objet ni montant nominatif.

## 4. Préciser « plafond » partout (Estimation, Activité, Conseils, Simuler, Dossier, accueil)
Retour du propriétaire : « plafond estimé, tu précises c'est quoi exactement ; le plafond peut augmenter en fonction de sur combien de périodes tu peux rembourser ».
- Ne plus jamais afficher un plafond sans ses conditions. Formulation type : « Jusqu'à 865 000 FCFA, remboursés chaque semaine pendant 6 mois, aux conditions de Caisse Lagune ». Définition courte, accessible au toucher/survol et dans une aide : « le montant le plus élevé que vos ventes permettent de rembourser sans vous mettre en difficulté, même lors d'une mauvaise période, pour cette fréquence et cette durée. Ce n'est pas un crédit accordé : l'institution décide. »
- Montrer que le plafond **dépend de la durée et de la fréquence** : petit tableau ou curseur « plafond selon la durée » (ex. 3, 6, 9, 12 mois) dans les modalités de l'institution, avec l'échéance correspondante ; dire en une phrase qu'allonger la durée augmente le montant mais aussi le coût total et la durée d'engagement, et que l'institution peut le refuser.
- Activité : « Pas de crédit en cours. Votre plafond estimé : X » → reprendre la formulation avec conditions et un lien « voir selon la durée ».
- Conseils : préciser que les effets « + X FCFA » sont calculés pour la fréquence et la durée affichées (choix visible et modifiable en haut de page), et le dire dans le résumé.
- Accueil et démo : même vocabulaire ; aucun « plafond » seul.
- Tests E2E : vérifier que chaque affichage de plafond porte ses conditions.

## 5. Démo et docs
- Démo guidée et données de démo : dossiers avec montants demandés et objets variés (certains au-dessus du plafond).
- ADR suivant libre ; `docs/legal/` si l'objet du crédit change les données collectées (minimisation) ; `docs/PROGRESS.md`.

## Règles
- Ne pas modifier `ml/` ni `docs/evaluation/runs`. Aucune mention d'IA ou de Claude dans les commits.
- Lister toute route nouvelle ou modifiée dans PROGRESS (je l'ajoute à `attaque.py`).
- `npm run test:engine`, `npm run test:api`, build ; E2E ciblés sur les écrans modifiés seulement.
- Pousser avec exactement `git push origin demande`. Puis `touch ~/kwedo-ops/DONE`. Blocage : raison dans `~/kwedo-ops/BLOCKED`.
