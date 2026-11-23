# Mission : refonte de l'interface en produit fini

**Commence par charger le skill `frontend-design` (outil Skill, `frontend-design:frontend-design`).** S'il est indisponible, lis
`~/.claude/plugins/cache/claude-plugins-official/frontend-design/1.1.1/skills/frontend-design/SKILL.md` et applique-le.

Tu travailles dans `~/kwedo-acces`, branche `cloisonnement`, après la mission d'accès.

## Demande
L'utilisateur n'aime pas l'interface actuelle. Elle doit donner l'impression d'un **produit fini, en service, auquel on confierait
son argent**, pas d'un prototype ni d'un projet d'école. Tu as le droit de tout refaire : palette, typographie, composants, navigation,
mise en page. L'ancien thème « registre vivant » n'est pas sacré. Garde une identité propre à Kwedo : on s'inspire de **principes**,
on ne copie ni le logo, ni les couleurs, ni les écrans d'une marque.

## Ce que montre la recherche sur les plateformes comparables
Sources de qualité inégale : beaucoup de blogs d'agences, et aucune étude directe des écrans de ces produits. Ce sont des pistes.

**Espace commerçant (mobile, public peu à l'aise avec l'écrit)**
- Wave : peu de fonctions, frais simples et annoncés, action immédiate (QR). Une promesse claire vaut mieux qu'un menu riche.
- Shopify Capital : l'offre vient au commerçant dans son outil. Le suivi montre ventes du jour, part remboursée et solde restant.
- MicroSave (apps de crédit au Kenya) : icônes et couleurs porteuses de sens plutôt que texte lourd, menus centrés sur « emprunter »
  et « rembourser », résumé des conditions avant l'accord et après le décaissement, dans l'app.
- CGAP / Banque mondiale : coût total bien visible, détail des frais en langage simple, prix montré tôt, interface légère sur
  téléphone modeste. Un choix actif devant les conditions améliore leur lecture et réduit les retards en test.

**Console prêteur (usage quotidien, dense)**
- Logique d'exception : d'abord ce qui demande une action, le reste en retrait.
- Fiche de décision : facteurs qui ont pesé, points à vérifier par l'humain, décision, trace d'audit, sans quitter l'écran.
- Tableaux de niveau finance : colonnes alignées, tri, filtres persistants, densité réglable, panneau latéral de détail.
- Ton calme et sûr : peu de couleur, réservée au sens (risque, retard, validé).

**Admin général**
- Un rôle = une vue pensée pour lui, pas la même page avec des boutons cachés.
- Santé de la plateforme, institutions à surveiller, activité récente, sans données nominatives.

## Exigences par écran
- **Accueil public** : vraie page produit, proposition claire, aperçu réel de l'app, parcours commerçant et prêteur. Pas de gabarit
  générique, de dégradé violet ni de cartes décoratives.
- **Connexion** : doit ressembler à l'entrée d'un produit, tout en disant clairement que les profils sont fictifs.
- **Commerçant** : l'écran d'accueil répond en 3 secondes à « combien, à quel prix, que faire maintenant ». Parcours emprunter et
  rembourser en très peu de gestes, 360 px d'abord, cibles tactiles de 48 px, montants très lisibles.
- **Console** : file de travail d'abord, fiche de décision utilisable au clavier, responsive sur téléphone.
- **Admin** : à refaire avec le même niveau d'exigence.
- **Démo guidée** : doit mettre le produit en valeur devant un jury.
- États soignés partout : chargement, vide, erreur, succès, confirmation. Micro-interactions sobres, `prefers-reduced-motion` respecté.
- Mode sombre cohérent ou retiré proprement.

## Règles
- Ne change aucun calcul, droit d'accès ni contrat d'API. Les étiquettes « simulé » et « fictif » restent visibles, mais discrètes.
- Aucun chiffre, logo de partenaire, témoignage ou agrément inventé. Ne présente pas le moteur comme meilleur que ne le montre le run.
- Contraste AA, navigation clavier, pas de débordement à 360 px. Pas de nouvelle dépendance sans vraie raison.
- Vérifie **sur captures** chaque écran et chaque rôle à 360 et 1440 px, corrige, recapture. Le build et tous les E2E doivent passer ;
  adapte un test seulement si le libellé a changé, jamais pour masquer une régression.
- Documente la direction dans `docs/design.md` et un ADR si le système de design est remplacé.
- Commits par étape, `git push origin cloisonnement`. Aucune mention d'IA, de Claude ni de `Co-Authored-By`.
- Mêmes interdits que `docs/MISSION-ACCES.md` : ni moteur, ni `main`, ni `~/kwedo`, ni app en ligne, ni autre processus du VPS.

## Fin
Tout vert et poussé : bilan dans `docs/PROGRESS.md`, captures finales dans `~/kwedo-ops/revue-interface/`, puis
`touch /home/ridwane/kwedo-ops/DONE`. Blocage réel : `tee /home/ridwane/kwedo-ops/BLOCKED`.

## Sources
https://nextbillion.net/news/analysis-francophone-africas-first-unicorn-is-disrupting-the-regions-mobile-money-market-but-can-it-last
https://help.shopify.com/en/manual/finances/shopify-capital/united-kingdom
https://www.shopify.com/capital
https://www.microsave.net/how-smart-are-smartphone-lending-apps-in-kenya/
https://digitalfinance.worldbank.org/topics/digital-credit/disclosure-terms-and-conditions
https://www.cgap.org/sites/default/files/publications/Tech%20Guide_Responsible%20Digital%20Credit.pdf
https://adminlte.io/blog/fintech-dashboard-design-examples/
https://www.orbix.studio/blogs/multi-tenant-dashboard-design
