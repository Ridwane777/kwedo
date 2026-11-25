# ADR 0019 : console institution organisée par objet (demandes, crédits, commerçants)

- Statut : accepté
- Date : 2026-11-24

## Contexte

Retour du propriétaire : la page Portefeuille empilait indicateurs, tous les crédits, retards et relances ; la file
`/console` ne montrait que les dossiers à décider, si bien qu'un dossier décidé n'avait plus de place. Avec le
volume, il faut séparer et retrouver : « les dossiers déjà traités, je vais les trouver où ? ».

## Décision

- **Navigation par objet** (agent et responsable) : Aujourd'hui (`/console`, à faire maintenant + 4 indicateurs,
  chaque carte mène à la liste filtrée), Demandes (`/console/demandes`, onglets À décider · Complément demandé ·
  En attente du commerçant · Traitées), Crédits (`/console/credits`, indicateurs puis onglets En cours · En retard ·
  Remboursés · En défaut), Recouvrement (`/console/recouvrement`, échéances en retard à reprogrammer + historique des
  relances filtrable), Commerçants (`/console/commercants`). Paramètres et Journal inchangés. `/console/portefeuille`
  redirige vers `/console/credits`. Raccourcis 1 à 7 sur toutes les pages.
- **Détails croisés** : dossier consultable à tout statut avec bandeau de décision (type, montant, modalités, agent,
  motif, date), réponse du commerçant et lien vers le crédit ; crédit (`/console/credits/[id]`) : échéancier,
  paiements, relances, reprogrammations (motif, auteur), liens vers le dossier d'origine et le commerçant ;
  commerçant (`/console/commercants/[id]`) : historique **dans cette institution seulement**, flux récents seulement
  tant que l'accord à cette institution est actif. Fil d'Ariane sur les trois.
- **API** (`services/api/kwedo_api/console.py`) : `GET /console/aujourdhui`, `/console/demandes`, `/console/credits`,
  `/console/credits/{id}`, `/console/retards`, `/console/relances`, `/console/commercants`,
  `/console/commercants/{id}`. Institution lue dans la session signée, jamais dans la requête (ADR 0009) ; objet
  d'une autre institution : 404 ; sans session ou session commerçant : 401 ; admin : 403. Filtres, tri et pagination
  **côté serveur**, paramètres validés (422), taille de page bornée à 50, réponse `{elements, total, page, taille,
  pages}` + compteurs par onglet.
- **Statut d'un crédit** dérivé des échéances, jamais stocké : remboursé (rien ne reste dû), en défaut (une échéance
  impayée depuis plus de 90 jours, convention PAR 90), en retard (une échéance en retard), sinon en cours.
- **Données de démo** : historique de 12 dossiers passés (`HISTORIQUE_DEMO`) rejoués par le parcours normal à des
  dates antérieures (consentement, demande, décision, réponse) ; les échéances des crédits sont payées à leur date
  si le simulateur de remboursement (`kwedo_gen.remboursement.rembourser`, encaissements cachés `futur_hebdo`) les
  couvre, sinon restent impayées. Seuls la date, le multiple du plafond demandé et l'issue de la décision sont des
  choix de scénario ; les montants et l'état de chaque crédit sortent du moteur et du simulateur. La tâche de relance
  est rejouée sur les 30 derniers jours pour l'historique des relances.

## Conséquences

- Chaque onglet est rempli dès la réinitialisation (Lagune : 6 à décider, 1 complément, 1 offre en attente,
  9 traitées ; crédits 2 en cours, 1 en retard, 3 remboursés, 1 en défaut).
- La réinitialisation de démo prend quelques secondes de plus (≈ 40 analyses moteur supplémentaires).
- Les listes calculent en Python sur les lignes de l'institution avant de paginer : suffisant pour le prototype
  (dizaines de dossiers) ; au-delà de quelques milliers, il faudrait stocker risque et statut de crédit en colonnes
  indexées et paginer en SQL.
- `GET /portefeuille` et `GET /dossiers` restent servis (démo guidée, compatibilité) mais ne sont plus utilisés par
  les écrans de la console.
