# Mission ajustements (branche `ajustements`)

Demande du propriétaire du produit, à exécuter en entier sans confirmation.

## 1. Écran admin (`apps/web/app/admin/page.tsx`)
À 1440 et 1920 px, le bas de la page reste vide et la mise en page paraît déséquilibrée (colonne « Activité récente » courte, grand vide sous les tableaux).
- Équilibrer les deux colonnes pour que la page occupe la hauteur de l'écran sans vide important.
- Utiliser uniquement des données déjà servies par l'API admin : aucun chiffre inventé, aucun dossier nominatif, aucune valeur de réglage (règle ADR 0009).
- Piste acceptable : journal d'activité plus long avec défilement interne, état du service, versions de paramètres par institution, sans dupliquer ce qui existe déjà.
- Vérifier 360, 768, 1440, 1920 en clair et en sombre, sans débordement horizontal.

## 2. Accueil (`apps/web/app/page.tsx`)
- Supprimer entièrement la section « Où on en est. » (`id="etat"`) et tout lien vers elle.
- Supprimer entièrement la section « Comment le plafond est calculé. » (`id="calcul"`), son lien « Le calcul » dans le pied de page et toute ancre `#calcul`.
- Retirer aussi la mention de « la formule » dans le texte de l'étape « Un plafond prudent » : décrire le résultat sans formule.
- Ne PAS toucher à « Voir le calcul » de l'espace commerçant ni à la fiche de décision de la console.
- Garder l'alternance des fonds de sections cohérente après les suppressions.

## Règles
- Ne pas modifier `packages`, `ml`, `services`, `docs/evaluation/runs`. Ne pas affaiblir les tests : adapter seulement ceux qui vérifient les sections supprimées.
- Aucune mention d'IA ou de Claude dans les commits.
- Avant de finir : build, `npx playwright test` complet vert, captures dans `.captures/revue-ajustements/` (admin et accueil, clair/sombre, 360/1440/1920).
- Mettre à jour `docs/PROGRESS.md` (et `docs/design.md` si la structure de l'accueil y est décrite).
- Commits poussés sur `origin ajustements`, puis `touch ~/kwedo-ops/DONE`. En cas de blocage, écrire la raison dans `~/kwedo-ops/BLOCKED`.

## 3. Téléphone du héros en mode sombre (ajout du propriétaire)
En mode sombre, l écran du téléphone de la section héros de l accueil devient noir. L écran doit afficher l app comme en clair (captures sombres `-sombre.jpg` ou rendu lisible), jamais un rectangle noir. Vérifier aussi les autres téléphones de l accueil en sombre, à 360, 1440 et 1920 px, avec des captures dans `.captures/revue-ajustements/`.
