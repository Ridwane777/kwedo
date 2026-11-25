# Mission refonte de la console institution (branche `console`)

À lancer APRÈS la fusion du retrait du crédit progressif. **Le crédit progressif a été retiré (ADR 0018, statut retiré) : aucun palier nulle part.**

Retour du propriétaire : « la section portefeuille, il y a trop de choses au même endroit, et au fur et à mesure que ça va se remplir il faut faire les séparations ; comment ça va se retrouver par dossier ; les dossiers déjà traités, je vais les trouver où ? si je veux voir des trucs. »
Aujourd'hui : `/console` = file des seuls dossiers à décider ; `/console/portefeuille` empile indicateurs, tous les crédits, retards et relances sur une page ; un dossier décidé n'a plus de place.

## Navigation cible (agent et responsable ; Paramètres réservé au responsable comme aujourd'hui)
1. **Aujourd'hui** (`/console`) : à faire maintenant (dossiers à décider, avec alertes, retards du jour, offres sans réponse du commerçant depuis X jours) + 4 indicateurs clés ; chaque carte mène à la liste filtrée correspondante.
2. **Demandes** (`/console/demandes`) : onglets À décider · Complément demandé · En attente du commerçant · Traitées (accordées, contre-proposées, refusées, offres acceptées / refusées). Recherche par nom, filtres (statut, tranche de risque, au-dessus de la tolérance, alertes, période), tri (risque, date, montant), pagination **côté serveur**.
3. **Crédits** (`/console/credits`) : indicateurs (encours, part en retard, PAR 30, recouvrement) puis onglets En cours · En retard · Remboursés · En défaut ; recherche, filtres, tri, pagination serveur.
4. **Recouvrement** (`/console/recouvrement`) : échéances en retard à traiter (reprogrammer avec motif, comme aujourd'hui) + historique des relances filtrable (commerçant, période).
5. **Commerçants** (`/console/commercants`) : ceux qui ont au moins un dossier dans cette institution ; recherche.
6. Paramètres, Journal : inchangés.
L'ancienne URL `/console/portefeuille` redirige vers `/console/credits`.

## Pages de détail
- **Dossier** (`/console/dossiers/[id]`) : consultable à tout statut. Après décision : bandeau décision (type, montant, durée, fréquence, agent, motif, date), réponse du commerçant, lien vers le crédit s'il existe. Les actions de décision n'apparaissent que si le statut le permet.
- **Crédit** (`/console/credits/[id]`, nouvelle) : échéancier complet, paiements, retards, relances, reprogrammations (motif, auteur), lien vers le dossier d'origine et le commerçant.
- **Commerçant** (`/console/commercants/[id]`, nouvelle) : historique **dans cette institution seulement** : demandes, crédits, retards ; indicateurs de flux récents (pas de données d'autres institutions, pas de consentement d'une autre institution).
- Fil d'Ariane et liens croisés entre les trois.

## API
- Routes de liste paginées et filtrées (paramètres validés, taille de page bornée), et routes de détail crédit et commerçant, toutes **filtrées par l'institution de l'utilisateur** côté serveur (ADR 0009) ; 404/403 pour un objet d'une autre institution.
- Lister chaque route nouvelle dans PROGRESS (je mets à jour `attaque.py`).
- Données de démo : assez de dossiers et crédits à tous les statuts pour remplir chaque onglet (générés par le simulateur de remboursement existant ; pas de chiffres écrits à la main).

## Règles
- Pleine largeur, système « comptoir », clair/sombre, 360/1440/1920 : sur mobile, onglets défilants et listes en cartes.
- Ne pas modifier `packages/engine`, `ml/`, `docs/evaluation/runs`. Aucune mention d'IA ou de Claude dans les commits.
- `npm run test:api` (pagination, filtres, cloisonnement de chaque nouvelle route), build ; E2E ciblés sur les écrans de la console seulement ; mettre à jour la démo guidée si elle pointe vers le portefeuille.
- `docs/design.md` (architecture de la console), ADR suivant libre (organisation par objet : demandes / crédits / commerçants), `docs/PROGRESS.md`.
- Pousser avec exactement `git push origin console`. Puis `touch ~/kwedo-ops/DONE`. Blocage : raison dans `~/kwedo-ops/BLOCKED`.
