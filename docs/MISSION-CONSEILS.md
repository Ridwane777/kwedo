# Mission conseils (branche `conseils`)

Retour du propriétaire : « niveau conseils, on dirait c'est fiché, je ne vois en quoi ça me donne des conseils ».
Aujourd'hui `apps/web/app/app/conseils/page.tsx` affiche un conseil générique (« Remboursez à l'heure ») puis une liste d'indicateurs bruts (régularité 34 %, part pro 98 %, 559 000 FCFA exclus) sans dire si c'est bien, ni quoi faire, ni ce que ça rapporte.

## Objectif
Transformer la page en vrais conseils personnalisés, rangés du plus utile au moins utile. Chaque levier = une carte :
1. **Où vous en êtes** : la valeur actuelle, avec un repère compréhensible (bon / à améliorer, et le seuil visé), en mots simples (« vos ventes varient beaucoup d'une semaine à l'autre », pas « écart relatif »).
2. **Pourquoi ça compte** : une phrase sur l'effet sur le plafond.
3. **Quoi faire** : 1 ou 2 actions concrètes pour un petit commerçant béninois (ex. faire payer les clients sur le compte marchand plutôt qu'en espèces ou sur le compte personnel ; ne pas faire transiter d'argent personnel par le compte marchand ; garder une activité régulière ; laisser le temps à l'historique ; rembourser à l'heure).
4. **Effet estimé sur le plafond** : « + X FCFA environ si ... », CALCULÉ par le vrai moteur sur un scénario modifié (ex. régularité ramenée au seuil, part pro à 100 %, historique au palier suivant). Si un levier ne peut pas être chiffré honnêtement, écrire « effet non chiffré » plutôt qu'inventer.
- Les leviers déjà au mieux sont regroupés dans un bloc « Ce qui va déjà bien », sans s'étaler.
- Garder les paliers d'historique (3, 6, 12 mois), intégrés au levier « historique ».
- Garder la règle : seul le chiffre d'affaires vérifié compte (pas de moyen de gonfler artificiellement le plafond) ; ne jamais suggérer de contourner les règles.
- En haut : un résumé en une phrase (« Votre plafond peut monter d'environ X FCFA ; le levier le plus efficace : ... »).

## Calcul
- Si l'API ne fournit pas déjà ces effets, ajouter une route dans `services/api` (ex. `GET /commercants/{id}/conseils`), réservée au commerçant lui-même (même règle d'accès que `/estimation`), qui appelle le moteur existant sur des flux modifiés. NE PAS modifier `packages/engine`, `ml`, `docs/evaluation/runs`. Ajouter des tests API (accès refusé aux autres rôles, effets ≥ 0 ou signalés, déterminisme par graine).
- Si une route est ajoutée, le signaler dans PROGRESS : je l'ajouterai moi-même au test de contournement `~/kwedo-ops/attaque.py`.

## Règles
- Pleine largeur, cohérent avec le système « comptoir » (ADR 0010), clair et sombre, 360/768/1440/1920, sans débordement.
- Aucune mention d'IA ou de Claude dans les commits.
- Avant de finir : `npm run test:api`, build, `npx playwright test` complet vert ; captures `.captures/revue-conseils/` (conseils clair/sombre 360/1440/1920).
- Mettre à jour `docs/PROGRESS.md` et `docs/design.md` si utile ; ADR si une nouvelle route d'API est ajoutée.
- Commits poussés sur `origin conseils`, puis `touch ~/kwedo-ops/DONE`. Blocage : raison dans `~/kwedo-ops/BLOCKED`.

## 2. Envoi du dossier simplifié (ajout du propriétaire, même branche)
Retour : « les options de qui peut voir ou pas je trouve que ce n est pas utile, à la limite juste un bouton déposer mon dossier de crédit et il choisit l institution puis il envoie c est plus simple ».
- `apps/web/app/app/dossier/page.tsx` : supprimer le bloc « Qui peut voir mon dossier » avec ses interrupteurs par institution.
- Un seul bouton principal « Déposer mon dossier de crédit » qui ouvre : choix de l institution (liste) → confirmation (montant, échéance, institution, case obligatoire « J accepte que <institution> consulte mon dossier de crédit », non cochée par défaut) → Envoyer. Le consentement reste obligatoire et tracé (exigence légale, docs/legal), mais il est donné dans l envoi, pour cette seule institution, en réutilisant les routes existantes de consentement puis d envoi.
- Le « Suivi » des demandes reste sous le bouton.
- Le retrait d un accord reste possible mais déplacé discrètement dans « Mon compte marchand » (liste des institutions qui ont reçu le dossier, bouton Retirer avec la même phrase sur l historique d un crédit en cours).
- Le bouton « Envoyer mon dossier » de l Estimation et des Conseils mène à ce parcours.
- Adapter les E2E du parcours (ne pas les affaiblir : le consentement doit toujours être vérifié avant envoi) et `docs/legal/` si le texte du consentement y est cité.
