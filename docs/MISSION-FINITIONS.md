# Mission : dernières finitions visuelles

Sur `~/kwedo-acces`, branche `finitions` (partie de `main`). `git push origin finitions`, jamais sur `main`. Charge le skill `frontend-design`.
Mêmes règles et interdits que `docs/MISSION-VITRINE.md` : ni API, ni moteur, ni `packages/`, `ml/`, `services/`, ni `main`, ni app en ligne, aucun dossier supprimé, aucune mention d'IA.

1. **Logo en grand format.** Sur `/connexion`, le cauri-K ressemble encore à un ballon de rugby avec des lacets, et la courbe le traverse. Redessine le symbole pour qu'il se lise comme un cauri à toutes les tailles : coquille ovale bombée, fente centrale fine d'une pointe à l'autre, petites dents régulières sur ses bords, K clairement intégré. Pas de hachures transverses. Une version simplifiée reste permise sous 24 px. La courbe ne doit plus croiser le logo. Mets à jour favicon, icône d'application, image de partage et le dessin de la pile de cauris.
2. **Mois des courbes trop gros** en grande largeur (accueil, simulateur, espace commerçant, fiche) : les libellés et valeurs doivent garder une taille de texte fixe (environ 12 px) quelle que soit la largeur.
3. **Bouton Σ** de l'espace commerçant : personne ne comprend ce qu'il fait. Remplace-le par une icône avec le libellé « Voir le calcul ».
4. **Commandes de l'admin** : icônes seules ambiguës pour des actions globales. Icône + libellé court (« Avancer de 7 jours », « Réinitialiser »).
5. **Vide en bas de l'admin et de l'espace commerçant** à 1920 px : réorganise pour occuper l'écran avec les données existantes (répartition des dossiers par institution et par statut, activité plus large ; côté commerçant, réduire le trou sous le sélecteur). N'invente aucune donnée.
6. Sur mobile, les téléphones de l'accueil ne doivent pas couper le libellé de la barre du bas (« stimation », « Activit »).

Build, tests API, tous les E2E verts. Regarde les captures à 360, 1440 et 1920 px en clair et en sombre dans `.captures/revue-finitions/`. Bilan dans `docs/PROGRESS.md`, commit, push, puis `touch /home/ridwane/kwedo-ops/DONE`. Blocage réel : `tee /home/ridwane/kwedo-ops/BLOCKED`.
