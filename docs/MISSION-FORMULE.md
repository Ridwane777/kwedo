# Mission formule hors des écrans (branche `formule`)

À lancer APRÈS la fusion de `diagnostic`.

Décision du propriétaire : la formule du moteur reste dans le moteur et la documentation, mais ne s'affiche plus devant le commerçant ni l'agent de crédit ; la décision se lit par la demande et son risque. Le journal d'audit n'est PAS concerné : ne pas y toucher.

## 1. Fiche dossier de la console (`apps/web/app/console/dossiers/[id]/page.tsx`)
- Retirer tout affichage du plafond de la formule (`l_max`, « formule X FCFA », « Plafond de la formule », « la formule reste le plafond »).
- Garder : montant demandé, objet, risque de la demande et tolérance ; plafond prudent et son risque comme repère ; raisons.
- La borne de la contre-proposition ne doit plus être expliquée par la formule ; si une borne est nécessaire, l'énoncer en mots (« au-delà, les ventes ne permettent pas de rembourser prudemment »). Le serveur continue de faire respecter `L_max`.

## 2. Commerçant : « Voir le calcul » (`apps/web/components/estimation.tsx` et partout où il apparaît)
- Supprimer la décomposition mathématique.
- Remplacer par « Comment ce montant est calculé » : 3 phrases simples (une mauvaise période de vos ventes, une marge de sécurité, 2 000 scénarios testés, puis l'institution décide), sans symbole ni variable ; ou fusionner avec « Pourquoi ce montant » si c'est redondant (choisir et le dire dans PROGRESS).

## 3. Console, Paramètres (`apps/web/app/console/parametres/page.tsx`)
- Retirer la ligne `R = C_p × m × s · L_max = …`.
- Pour chaque réglage : nom en clair + une phrase d'effet concret (« plus cette marge est haute, plus les plafonds montent ; plus de risque »).
- Aperçu avant enregistrement : effet du nouveau réglage sur les dossiers en attente de l'institution (plafond prudent moyen et risque moyen avant / après), calculé par le moteur via l'API, réservé au responsable de l'institution. Si une route est ajoutée : la lister dans PROGRESS (je l'ajoute à `attaque.py`).

## 4. Ailleurs
- Accueil, démo guidée, simulateur de la vitrine : aucune formule ni symbole (`R`, `C_p`, `L_max`, annuité). Vérifier avec une recherche dans `apps/web`.
- Documentation : la formule reste dans `docs/` (ADR, design, évaluation) ; mettre à jour `docs/design.md` sur ce qui est affiché. ADR suivant libre si utile.

## 5. Données de démo : montrer des profils à risque
Retour du propriétaire : « au niveau des datas, tu ne montres pas à quoi ressemble un profil à risque ».
- D'abord mesurer : lister les commerçants de démo (`data/demo`) avec leur plafond, le risque de leur demande et leurs indicateurs ; l'écrire dans PROGRESS.
- Garantir une palette contrastée, générée par le générateur existant (graine fixée, pas de chiffres écrits à la main), et dont le risque est **calculé par le moteur**, pas imposé :
  - 2 profils sains (déjà présents) ;
  - 1 profil **limite** : demande proche de la tolérance de l'institution ;
  - 2 profils **à risque**, de causes différentes et lisibles, par ex. (a) ventes très irrégulières et en baisse récente, (b) forte dépendance à un seul client et argent personnel mêlé au compte marchand (part pro faible) ; si possible un (c) avec historique court ou retard sur un crédit précédent ;
  - au moins une demande **au-dessus du plafond**.
- Console : ces dossiers apparaissent dans la file de Lagune (et un chez Baobab), triables par risque ; leur fiche montre le risque au-dessus de la tolérance et des raisons qui nomment la cause (ex. « vos ventes ont baissé de 35 % sur 8 semaines », « 62 % des encaissements viennent d'un seul client »). Vérifier que les raisons sont fidèles au moteur.
- Commerçant : un profil de démonstration supplémentaire sur `/connexion` (ex. « Commerçant à risque ») pour voir l'autre côté : plafond bas ou nul, Conseils qui ciblent la cause, avertissement au dépôt.
- Démo guidée : une étape qui compare un dossier sain et un dossier à risque côte à côte (risque, raisons, décision proposée).
- Si le générateur ne produit pas un risque assez marqué avec ses réglages existants, choisir une graine/archétype existant qui le fait ; ne pas modifier le modèle ni truquer les sorties.
- Adapter les tests qui comptent les commerçants ou dossiers de démo ; ajouter un test : au moins un dossier de démo au-dessus de la tolérance, au moins un en dessous.

## Règles
- Ne pas modifier `packages/engine`, `ml/`, `docs/evaluation/runs`. Aucune mention d'IA ou de Claude dans les commits.
- `npm run test:api`, build ; E2E ciblés sur les écrans modifiés seulement (fiche, estimation, paramètres) ; un test qui vérifie qu'aucune page de `/app` et `/console` n'affiche `L_max`, `C_p` ni « formule ».
- Pousser avec exactement `git push origin formule`. Puis `touch ~/kwedo-ops/DONE`. Blocage : raison dans `~/kwedo-ops/BLOCKED`.
