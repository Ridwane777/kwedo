# Mission risque toutes fréquences (branche `risque-frequences`)

Demande du propriétaire : « L'évaluation du risque doit tenir compte de tout, sinon la main feature ne sera pas bien mise en avant. »
Aujourd'hui le modèle de risque n'est entraîné, calibré et évalué que sur des échéances hebdomadaires ; quinzaine et mensuel réutilisent ce risque avec `risque_valide: false`. Il faut un risque appris, calibré et évalué pour **chaque fréquence (hebdomadaire, quinzaine, mensuelle) et chaque durée (3 à 12 mois)**.

## 1. Données simulées (générateur)
- Le générateur de remboursements (`packages/generator`) simule le remboursement d'un prêt selon un échéancier à la fréquence choisie : le commerçant doit avoir en caisse le montant dû à chaque date d'échéance, après ses dépenses ; défaut défini de la même façon pour toutes les fréquences (au moins une échéance manquée de plus de X jours, X fixé dans le protocole et identique partout).
- Jeux de réglage et de test produits pour les 3 fréquences × durées {3, 6, 9, 12} mois, avec les mêmes générateurs « réglage » et « test » (dérive) que l'évaluation existante.

## 2. Modèle (`ml/`, autorisé pour cette mission)
- Le risque prend en entrée la fréquence et la durée (caractéristiques : nombre d'échéances, montant par échéance rapporté au mauvais mois/semaine, période entre échéances), ou un modèle par fréquence si c'est plus robuste : comparer les deux sur le réglage seulement, écrire le choix.
- Recalibrer (isotonique lissée, comme l'ADR 0008) par fréquence sur une partition dédiée.
- Le moteur utilise ce nouveau risque pour toutes les fréquences ; `risque_valide` devient vrai partout ; la mention « moins éprouvée » disparaît de l'interface si et seulement si le run final la justifie (sinon garder une mention par fréquence concernée).
- Non-régression : l'hebdomadaire doit rester aussi bon qu'avant sur le jeu existant (écrire l'écart, même s'il est minime ; Koffi peut changer légèrement : le dire et mettre à jour les chiffres cités dans les docs).

## 3. Évaluation (règles strictes, comme la première)
- Écrire d'abord `docs/evaluation/protocole-frequences.md` : métriques (taux d'échéances manquées à montant total égal contre règles naïves adaptées à chaque fréquence, ECE, écart calibré/observé, résultats par fréquence × durée et sur activités jamais vues), graines, tailles, seuils de réussite. **Le commiter avant tout run final.**
- Un seul run final, dans un NOUVEAU dossier `docs/evaluation/runs/<date>-frequences/` ; ne jamais modifier les runs existants.
- Publier tous les résultats tels quels, y compris les échecs, dans `docs/evaluation/` et un tableau par fréquence × durée. Pas de deuxième run sans l'écrire et le justifier.
- Mettre à jour la page d'accueil / démo seulement avec des chiffres sortis de ce run.

## 4. Documentation
- ADR suivant libre : risque appris pour toutes les fréquences ; complète la limite décrite dans l'ADR 0015 (ne pas réécrire 0015, seul son statut peut changer).
- Rétrospective : ce que ça a coûté, ce qui reste faible.
- `docs/PROGRESS.md`.

## Règles
- Ne pas toucher aux runs existants. Aucune mention d'IA ou de Claude dans les commits.
- CPU seulement, `nice -n 10`, 4 cœurs max ; machine partagée, disque presque plein : supprimer les fichiers intermédiaires volumineux, ne garder que les artefacts du modèle et les résultats.
- `npm run test:engine`, `npm run test:api`, build ; E2E ciblés seulement sur les écrans modifiés.
- Pousser avec exactement `git push origin risque-frequences` (pas d'option `-u`). Puis `touch ~/kwedo-ops/DONE`. Blocage : raison dans `~/kwedo-ops/BLOCKED`.
