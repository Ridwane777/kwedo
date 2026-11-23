# ADR 0010 : système de design « comptoir » à la place du « registre vivant »

- Statut : accepté
- Date : 2026-11-23

## Contexte

L'interface « registre vivant » (papier chaud, Fraunces, motif tissé) donnait une impression de prototype ou de
projet d'école. La demande : un produit fini, en service, auquel on confierait son argent, avec une identité propre
à Kwedo, sans copier de marque.

## Décision

- Nouveaux tokens sémantiques : `fond`, `surface`, `encre`, `marque`, `bon`, `ambre`, `alerte` (clair et sombre,
  contrastes AA mesurés dans `docs/design.md`). Les anciens noms (`papier`, `indigo`, `terre`, `feuille`, `safran`)
  sont supprimés ; le renommage est fait par `scripts/renommer-tokens.mjs`.
- Typographie : Bricolage Grotesque (titres, montants) et Public Sans (interface ; Instrument Sans, essayée d'abord, collait les mots en petit corps), via `next/font`, sans
  nouvelle dépendance npm.
- Motif « Lisière » retiré ; `Lisiere` devient un simple filet. Nouvelle marque « K » de flux.
- Écrans refaits : accueil public, connexion, accueil commerçant, cadre et file de la console, admin.
  Les autres écrans héritent des tokens et des composants.

## Conséquences

- Aucun calcul, droit d'accès ni contrat d'API modifié ; les étiquettes « simulé » et « fictif » restent.
- Les E2E vérifient l'accueil, la connexion, les écrans commerçant, console, admin et démo à 360 et 1440 px.
- Les fiches internes du design (`/design`) montrent la nouvelle palette.
