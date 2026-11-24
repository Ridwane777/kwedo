# Mission crédit progressif (branche `progressif`)

Décision du propriétaire : appliquer le **crédit progressif** seulement (pas le plancher de risque, pas de nouveau run).
Pourquoi (diagnostic du 24/11, `docs/evaluation/diagnostic/`) : sans vraies données, le modèle ne connaît pas ce qu'il n'a jamais vu. On commence petit, et chaque crédit bien remboursé devient une vraie donnée. Pratique du terrain : Microcrédit Alafia (FNM) réserve la phase III (jusqu'à 200 000 FCFA) aux bénéficiaires ayant entièrement remboursé la phase II.

## 1. Règle (couche service/API, PAS dans `packages/engine`)
- Le moteur calcule comme aujourd'hui plafond prudent et risque. Par-dessus, une **politique de palier** par institution limite le montant accordable :
  - palier 1 (premier crédit chez cette institution) : au plus `palier_initial` FCFA ;
  - après un crédit **entièrement remboursé** sans retard grave (seuil de retard réglable, ex. aucune échéance > 7 jours), le palier suivant = palier précédent × `multiplicateur` ;
  - un retard grave ou un crédit non remboursé fait **redescendre** d'un palier (ou bloque, au choix documenté) ;
  - le montant accordable = min(plafond prudent du moteur, palier courant). Le palier ne peut jamais dépasser le plafond du moteur.
- Paramètres par institution, versionnés, éditables par le responsable avec l'aperçu existant : `palier_initial`, `multiplicateur`, `retard_grave_jours`, comportement après défaut. Valeurs de démo différentes selon l'institution (ex. Lagune 150 000 / ×1,5 ; Baobab 200 000 / ×1,4).
- Historique de cycles par commerçant et par institution, dérivé des crédits et échéances déjà stockés (pas de donnée saisie à la main).

## 2. Commerçant
- Estimation, Simuler, Dossier : afficher clairement les deux chiffres et lequel limite : « Vos ventes permettent jusqu'à 865 000 FCFA. Pour un premier crédit chez Caisse Lagune, le montant est limité à 150 000 FCFA. Remboursez-le à l'heure et votre limite passe à 225 000 FCFA. »
- Une frise de paliers (palier actuel, prochains, condition pour monter).
- La demande libre reste possible au-dessus du palier, avec avertissement (l'institution décide).
- Conseils : le levier « rembourser à l'heure » chiffre le palier suivant.
- Crédit : à la fin d'un remboursement complet, message « Palier suivant débloqué : jusqu'à X ».

## 3. Console institution
- Fiche : palier du commerçant chez cette institution (n° de cycle, historique des crédits précédents : remboursé à l'heure / retard), montant accordable selon le palier, et si la demande le dépasse.
- La contre-proposition propose par défaut le minimum(palier, plafond prudent).
- L'agent peut dépasser le palier avec un motif obligatoire (tracé) ; jamais le plafond du moteur.
- Cloisonnement : l'historique de cycles ne montre que les crédits de cette institution (ADR 0009).

## 4. Démo
- Données de démo cohérentes : au moins un commerçant au palier 1 (premier crédit), un au palier 2 ou 3 après des crédits remboursés (historique généré par le simulateur de remboursement existant, pas écrit à la main), un redescendu après un retard.
- « Avancer de 7 jours » jusqu'à la fin d'un crédit doit montrer le palier qui monte.
- Démo guidée : une étape « Le plafond grandit avec les remboursements ».

## 5. Documentation
- ADR suivant libre : crédit progressif ; options (pas de palier, palier fixe, palier progressif, plancher de risque), décision, gagné/perdu ; dire que **l'efficacité n'est pas mesurée** (non démontrable en simulation sans inventer le comportement des commerçants).
- Business plan : stratégie de données « démarrer prudent, apprendre du terrain » (palier → pilote avec une institution → partenariats de données FNM, IMF PNIF, opérateurs, avec cadre APDP).
- Rétrospective : prochaines étapes = plancher de risque pour activité inconnue (gain mesuré au diagnostic : ECE jamais vus 0,182 → 0,120) + nouveau run au protocole figé ; restriction de l'extrapolation.
- Légal si nécessaire (information du commerçant sur la règle de palier, CGU). `docs/PROGRESS.md`.

## Règles
- Ne pas modifier `packages/engine`, `ml/`, `docs/evaluation/runs`. Aucune mention d'IA ou de Claude dans les commits.
- Lister toute route nouvelle ou modifiée dans PROGRESS (je mets à jour `attaque.py`).
- `npm run test:api` (tests : palier initial, montée après remboursement, descente après retard, jamais au-dessus du plafond moteur, dépassement agent avec motif, cloisonnement), `npm run test:engine`, build ; E2E ciblés sur les écrans modifiés seulement.
- Pousser avec exactement `git push origin progressif`. Puis `touch ~/kwedo-ops/DONE`. Blocage : raison dans `~/kwedo-ops/BLOCKED`.
