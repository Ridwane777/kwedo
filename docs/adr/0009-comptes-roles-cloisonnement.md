# ADR 0009 : profils de démonstration, rôles et cloisonnement des institutions

- **Statut** : accepté
- **Date** : 2026-11-23

## Contexte

Le prototype n'avait ni connexion ni rôle : l'acteur et l'institution venaient d'en-têtes envoyés par le client
(`X-Acteur`, `X-Institution`). Une institution pouvait donc lire **et modifier** les réglages d'une autre, lire son
journal et ouvrir ses dossiers. Le commerçant recevait des valeurs internes (L_max, R, recommandation). Aucun espace
d'administration n'existait.

> **Limite à lire d'abord : le choix de profil n'est pas une authentification.** Il n'y a pas de mot de passe :
> n'importe quel visiteur peut choisir n'importe quel profil sur `/connexion`. Le cloisonnement entre profils est
> réel et appliqué par l'API, mais il ne protège rien tant qu'une vraie authentification n'est pas en place.

## Options

1. **Garder les en-têtes, filtrer dans l'interface.** Rien à construire ; mais tout client HTTP contourne le filtre.
2. **Profils de démo, session signée, règles d'accès dans l'API** (retenu). Six profils fictifs (commerçant, agent
   et responsable de deux institutions, admin général). Jeton HMAC-SHA256 dans un cookie HttpOnly, SameSite=Lax,
   12 h ; un cookie par espace (commerçant, prêteur) pour qu'un même navigateur joue les deux côtés pendant la démo.
3. **Vrais comptes (mot de passe ou OTP SMS, OIDC).** Nécessaire avant tout pilote ; hors périmètre d'une démo
   sur données fictives, et demanderait gestion de comptes, réinitialisation, verrouillage, journal des connexions.

## Décision

Option 2. Dans `services/api/kwedo_api/app.py`, **chaque route déclare sa règle d'accès**, exécutée avant la logique
métier ; l'acteur et l'institution sont lus **uniquement** dans la session signée (les en-têtes client sont ignorés).

| Rôle | Peut | Ne peut pas |
|---|---|---|
| Commerçant | ses données, son estimation, ses accords, ses dossiers, ses offres, ses crédits, payer | lire m, s, percentile, seuil, L_max, R, recommandation, alertes, modèles ; voir un autre commerçant |
| Agent | file, fiches, décisions, portefeuille, échéances, journal **de son institution** ; lire ses paramètres | modifier les paramètres ; toucher une autre institution |
| Responsable | comme l'agent, et créer une version de paramètres de son institution | toucher une autre institution |
| Admin général | volumes agrégés, santé, journal expurgé (ni dossier, ni nom de commerçant, ni valeur de réglage), commandes de démo | lire un dossier, un crédit, des paramètres ; modifier une institution |

Règles transverses : un dossier ou crédit hors périmètre répond **404** (comme s'il n'existait pas) ; une session
absente répond 401, un rôle insuffisant 403. La liste publique des institutions ne contient que `id` et `nom`.
La formule générale reste publique ; les valeurs propres à chaque institution sont privées.

Audit route par route (tests dans `services/api/tests/test_api.py`, classe `TestCloisonnement`). Trous trouvés et
fermés pendant l'audit : l'estimation commerçant contenait encore R (au plafond et au montant souhaité), la
recommandation (dérivée du seuil) et la graine ; les textes du moteur citaient R, le seuil (« limite de
l'institution : 10 % »), la part prélevable s (raison « formule ») et un encaissement requis dont on déduit m × s.
Ces textes sont réécrits à la frontière de l'API (le moteur n'est pas modifié, le run publié reste valable).

## Gagné / perdu

- **Gagné** : le cloisonnement ne dépend plus de l'interface ; il est testé par des appels directs (jeton falsifié,
  en-tête forgé, accès croisés entre institutions, admin, commerçants). L'interface ne fait que refléter les droits.
- **Gagné** : l'admin supervise sans jamais voir de contenu métier.
- **Perdu** : aucune authentification réelle (voir la limite ci-dessus). Le secret de signature est aléatoire à
  chaque démarrage si `KWEDO_SECRET` n'est pas défini : un redémarrage de l'API déconnecte tout le monde.
- **Perdu / résiduel** : le commerçant peut toujours inférer approximativement les réglages d'une institution en
  faisant varier le montant souhaité et la baisse de ventes (plafond, échéance et indicateur « trop risqué » sont
  des fonctions de ces réglages). C'est inhérent à une estimation utile ; une limitation de débit est à prévoir.
- **Perdu** : pas de révocation de session côté serveur (jeton sans état, valable 12 h).
