# Mission : menu de compte (UserButton)

Sur `~/kwedo-acces`, branche `finition`. Mêmes règles et interdits que `docs/MISSION-INTERFACE.md`. Charge le skill `frontend-design`.
Vérifie d'abord que `docs/RELECTURE-INTERFACE.md` est entièrement traité, et termine ce qui ne l'est pas.

## Demande de l'utilisateur
« au lieu de quitter fais un userbutton avec l'option pour se déconnecter sur mobile ».

## Attendu
- Supprimer le lien « Quitter » de l'espace commerçant et les boutons « Changer de profil » visibles en permanence.
- Un seul composant `UserButton` réutilisé dans l'espace commerçant, la console et l'admin, sur téléphone comme sur ordinateur :
  pastille aux initiales dans l'en-tête, qui ouvre un menu.
- Le menu affiche le nom, le rôle et l'institution s'il y en a une, puis **Changer de profil** et **Se déconnecter**.
- Se déconnecter ferme réellement la session de l'espace concerné (`/auth/deconnexion`) et renvoie vers `/connexion`.
  Après cela, revenir en arrière ne doit pas rouvrir l'espace.
- Mobile : cible d'au moins 48 px, menu entièrement visible à 360 px, jamais masqué par la barre de navigation du bas.
- Accessibilité : vrai bouton avec `aria-haspopup` et `aria-expanded`, navigation au clavier, Échap et clic extérieur ferment le menu,
  le focus revient sur le bouton.
- Dans les iframes de `/demo`, le menu ne doit pas casser le scénario : le masquer si nécessaire.
- Ajouter un E2E à 360 et 1440 px : ouvrir le menu, se déconnecter, vérifier le retour à `/connexion` et le refus de l'API.

## Deuxième demande : des icônes à la place du texte sur les boutons
Citation de l utilisateur : « à d autre endroit c est du texte il faut mettre des icones au lieu des textes, genre en mode pour les buttons ».

- Passe en revue **tous** les boutons et actions de l accueil, la connexion, l espace commerçant, la console, l admin et la démo.
- Actions courantes et secondaires : **icône seule** (retour, précédent, suivant, fermer, filtrer, trier, exporter, télécharger, actualiser, réinitialiser, avancer l horloge, démarrer et arrêter le chronomètre, replier, voir le détail).
- Actions engageantes ou irréversibles : **icône + libellé court**, car une icône seule y serait ambiguë pour de l argent (envoyer le dossier, accepter ou décliner l offre, payer, valider, ajuster, refuser, demander un complément, enregistrer la décision ou les paramètres, se déconnecter).
- Une seule famille d icônes, même taille et même trait. `lucide-react` est autorisé (`npm install lucide-react --workspace apps/web`) ; retire les icônes SVG écrites à la main quand elles font doublon.
- Chaque bouton à icône seule a un `aria-label` en français et une infobulle au survol et au focus. Cible de 44 px minimum, 48 px sur mobile.
- Un composant commun `BoutonIcone`, pas de variantes recopiées. Adapte les E2E par nom accessible, sans affaiblir ce qu ils vérifient.

## Troisième demande : retirer le chronomètre de traitement
Décision de l utilisateur : « non je pense juste la retirer ». Retrait complet, sans mode caché.

- Supprimer `apps/web/components/chronometre.tsx`, son usage sur la fiche de décision, ses exports CSV/JSON, son stockage et `e2e/chronometre.spec.ts`.
- Retirer aussi le texte « temps de traitement » ou « Dossier traité en… » de l interface et de la démo s il dépend de ce chronomètre ; adapter le parcours E2E sans affaiblir le reste.
- Aligner la documentation (`README`, `docs/PROGRESS.md`, `docs/DEFINITION-DE-TERMINE.md`, `docs/evaluation/`, rétrospective) : l outil a été retiré sur décision produit, **le gain de temps humain reste non mesuré** et ne doit être annoncé nulle part.
- Ne réécris aucun ADR accepté ni aucun run publié.

## Quatrième demande : mode clair et mode sombre
Citation de l utilisateur : « ajoute aussi le mode clair, mode sombre ».

- Trois choix : **Clair, Sombre, Système** (Système par défaut). Sélecteur à icônes (soleil, lune, écran) avec `aria-label`, dans le `UserButton`, et bouton d icône dans l en-tête des pages sans session (accueil, connexion, inscription).
- Thème porté par `data-theme` sur `<html>`, tokens CSS clair et sombre, aucune couleur codée en dur dans les composants.
- Choix mémorisé dans `localStorage` (lecture et écriture protégées par try/catch), appliqué par un petit script avant le premier rendu : **aucun flash** de mauvais thème, aucune erreur d hydratation. En mode Système, suivre le changement du téléphone en direct.
- Le sombre doit être dessiné, pas inversé : surfaces, bordures, courbe de flux, graphiques, alertes, pastilles, champs, logo, ombres, tableaux, cadres de la démo. Les iframes de `/demo` suivent le thème.
- Contraste AA vérifié par mesure dans les deux thèmes (`scripts/contrastes.mjs`).
- E2E : changer de thème, recharger, vérifier la persistance ; passer axe sur les écrans principaux **dans les deux thèmes**.
- Captures finales de chaque écran à 360 et 1440 px **en clair et en sombre**. Documenter dans `docs/design.md`.

## Correction de documentation : ADR 0010
Un ADR accepté n est jamais réécrit. Restaure le texte de décision de `docs/adr/0010-systeme-design-comptoir.md` tel qu il est sur `main` (Instrument Sans). Écris `docs/adr/0011-police-public-sans.md` (contexte : mots collés en petit corps ; options ; décision Public Sans ; gagné/perdu), ajoute-le à l index, et indique uniquement dans le statut de 0010 que son choix de police est remplacé par l ADR 0011.

## Fin
Build, tests API et tous les E2E verts. Captures finales de tous les écrans dans `.captures/revue-finale/` (dans ton dossier de travail), bilan dans
`docs/PROGRESS.md`, commit, `git push origin finition`, puis `touch /home/ridwane/kwedo-ops/DONE`.
