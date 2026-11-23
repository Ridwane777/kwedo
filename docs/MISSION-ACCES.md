# Mission : comptes, cloisonnement des institutions et admin général

Tu travailles seul dans `~/kwedo-acces`, branche `cloisonnement`. Va au bout sans demander de confirmation.
Une relecture indépendante aura lieu derrière toi : elle rejouera les contrôles et tentera de contourner les droits.

## Problème à résoudre
Le prototype n'avait ni connexion ni rôle. Une institution pouvait lire **et modifier** les réglages d'une autre, lire son journal
et ouvrir ses dossiers. L'espace admin général n'existait pas.

## Comportement attendu
- Profils de démo : commerçant, agent et responsable pour deux institutions, admin général.
- L'API fait respecter les droits. L'interface ne fait que refléter ces droits.
- Une institution n'accède qu'à ses dossiers, crédits, portefeuille, paramètres et journal.
- L'agent et le responsable décident sur les dossiers de leur institution. Seul le responsable modifie les paramètres.
- Le commerçant n'accède qu'à ses données et ne reçoit jamais m, s, percentile, seuil, L_max, R, alertes ni modèles.
- L'admin supervise (volumes, santé, journal expurgé, commandes de démo). Il ne lit ni dossier, ni nom de commerçant, ni valeur
  de réglage, et ne modifie pas une institution.
- La formule générale reste publique. Les valeurs propres à chaque institution sont privées.

## État reçu (non commité dans ton arbre de travail)
Déjà écrit : `services/api/kwedo_api/auth.py`, règles d'accès dans `app.py`, `service.py`, tests API, `/connexion`, `/admin`,
`lib/session.tsx`, console, démo, E2E. Relis ce code d'un œil critique : il n'a jamais passé le build ni les E2E.

Premier correctif à faire, le build échoue sur 2 erreurs de type :
1. `service.py`, dans `estimation` : remplacer `res["au_dessus_du_seuil"] = ...` par
   `if res.get("souhait"): res["souhait"]["au_dessus_du_seuil"] = res["souhait"]["risque"] > p["seuil_risque"]`.
   Dans `lib/types.ts`, retirer le champ de `Analyse` et l'ajouter en optionnel dans `souhait`.
2. `components/estimation.tsx` : `ChoixInstitution` doit prendre `InstitutionPublique[]`.

## Travail
1. Corriger, puis faire passer tests API, build et **tous** les E2E (`npx playwright test`, ports 3462/3463).
2. Auditer **chaque** route de l'API contre les règles ci-dessus, y compris les réponses qui embarquent des données indirectement.
   Ajouter un test pour tout trou trouvé.
3. Parcourir `/connexion`, `/admin`, la console avec chaque rôle et les 9 temps de `/demo`, à 360 px et 1440 px, sur captures.
   Corriger ce qui est cassé ou moche, dans le design existant. La console et l'admin doivent rester utilisables sur téléphone.
4. Documenter : `docs/adr/0009-*.md` (options, décision, gagné/perdu) et son index, `docs/contracts/openapi.yaml`, README,
   `docs/PROGRESS.md`, analyse de risques dans `docs/legal/`. Écrire clairement la limite : **le choix de profil n'est pas une
   authentification (pas de mot de passe)** ; le cloisonnement est réel, mais n'importe quel visiteur peut choisir n'importe quel profil.
5. Commiter par étape et pousser : `git push origin cloisonnement`.

## Interdits
- Ne modifie ni `packages/engine`, ni `packages/generator`, ni `ml/`, ni `docs/evaluation/runs/` : le run publié doit rester valable.
- Ne touche pas à `main`, à `~/kwedo` ni à l'app en ligne (ports 3460/3461). Ne la redémarre pas.
- VPS partagé : ne touche à aucun autre processus, conteneur ou dossier. Pas de sudo, Docker ni pkill. Disque à 96 % : pas de gros fichiers.
- Aucune mention d'IA, de Claude ni de `Co-Authored-By` dans les commits, le code ou la documentation.
- N'écris jamais qu'une chose passe sans l'avoir exécutée.

## Fin
- Tout vert et poussé : écrire le bilan dans `docs/PROGRESS.md`, pousser, puis `touch /home/ridwane/kwedo-ops/DONE`.
- Blocage réel : décrire le problème avec `tee /home/ridwane/kwedo-ops/BLOCKED`.
