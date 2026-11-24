# Mission : pleine largeur, vraie page d'accueil, logo, animations, mode sombre

Sur `~/kwedo-acces`, branche `vitrine` (partie de `main`). Pousse avec `git push origin vitrine`, jamais sur `main`.
**Commence par charger le skill `frontend-design`** (`frontend-design:frontend-design`). Une relecture indépendante suivra, sur captures.

## Demande de l'utilisateur
« ne centre pas tout utilise tout l'espace de l'écran, pour la home page, ajoutes plus de choses parle un peu plus de la solution, app mobile
ainsi de suite, si tu peux trouver des animations encore mieux, faire un vrai logo, des trucs qui ont trait au crédit en mode un objet ou bien
autre chose rend ça plus attrayant [...] pour le mode sombre il faudrait revoir les couleurs en mode clair oui c'est bon mais en mode sombre le vert ressort trop »

## 1. Utiliser tout l'écran, sur toutes les pages
- Plus de colonne étroite centrée (`max-w-*` + `mx-auto`) comme mise en page de page, sur l'accueil, la connexion, l'admin, la console, l'espace commerçant et la démo.
- Les sections occupent la largeur avec des gouttières fluides (`clamp`) et des grilles qui se réorganisent. Contrôle à 360, 768, 1440 et 1920 px.
  Limite seulement la longueur des **lignes de texte** pour la lecture, pas la page.
- Connexion en deux panneaux sur grand écran : univers de marque animé d'un côté, choix du profil de l'autre.
- Admin en vraie vue de supervision pleine largeur. Console : les tableaux et la fiche profitent de toute la largeur.
- **Espace commerçant sur ordinateur** : aujourd'hui c'est une colonne de téléphone au milieu. Fais une vraie mise en page desktop
  (navigation latérale, montant et actions à gauche, courbe et raisons à droite). Sur mobile, garde la barre du bas.

## 2. Un vrai logo, tiré du crédit au Bénin
Piste retenue après recherche : **le cauri**. En fon, *akwɛ́* veut dire à la fois « cauri » et « argent », et le cauri a servi de monnaie dans la région.
- Dessine en SVG une marque originale : un **cauri stylisé et géométrique qui forme un K** ou s'y associe. Propose 3 pistes, garde la meilleure, documente le choix.
- Lisible à 16 px, en couleur, monochrome, sur clair et sur sombre. Livre : composant `Marque`, favicon, icône d'application, image Open Graph.
- Le cauri devient l'objet de marque (motif discret, pile de cauris qui monte avec les remboursements, loader, état vide), avec retenue : un seul symbole fort.
- **Sensibilité** : le cauri a aussi servi de monnaie de la traite négrière et a des usages rituels. Aucun récit historique, aucun visuel de royaume, de vodoun ou de folklore. Ne dis pas que « Kwedo » vient de *akwɛ́* : cette étymologie n'est pas vérifiée. Tu peux écrire seulement que *akwɛ́* signifie cauri et argent en fon.

## 3. Page d'accueil complète
Pleine largeur, rythme varié, pas une suite de cartes identiques. Dans cet ordre ou mieux :
1. **Héros** : promesse, deux entrées (commerçant, institution), grande scène animée avec l'app mobile et la courbe.
2. **Le problème** : vendre tous les jours et rester invisible pour le crédit.
3. **La solution en une scène** : des encaissements deviennent un plafond, un dossier puis une décision humaine, raconté au défilement.
4. **L'app mobile** : plusieurs téléphones avec les vrais écrans (estimation, simulateur, offre, échéancier, rappels). C'est une app web responsive : **aucun badge App Store ou Google Play**.
5. **Simulateur interactif** sur la page : curseurs de ventes et de baisse, la courbe et le montant réagissent, chiffres étiquetés « exemple ».
6. **Comment le plafond est calculé** : formule, 2 000 scénarios, contrôles, humain, de façon visuelle.
7. **Pour les institutions** : aperçu de la console, file, fiche, portefeuille, cloisonnement.
8. **Confiance et limites** : consentement retirable, aucun frais Kwedo, relances respectueuses, ce que Kwedo ne fait pas.
9. **Où on en est** : prototype sur données simulées, prochaine étape un pilote. **FAQ**, puis appel à l'action et vrai pied de page.

Le héros doit répondre à « pourquoi vous faire confiance ? ». Les captures des écrans doivent venir de la vraie app.

**Interdits de contenu** : aucun chiffre de performance, client, partenaire, témoignage, agrément, téléchargement ou note inventé. Ne dis pas que le moteur bat les règles simples sans préciser la limite sur les activités jamais vues. Aucun gain de temps annoncé. Les chiffres de contexte restent marqués « à recontrôler ».

## 4. Animations
- Intention : montrer l'argent qui circule et le crédit qui se construit. Courbe qui se trace, compteur du montant, cauris qui s'empilent, écrans de téléphone qui se succèdent, sections qui se révèlent, transitions de page.
- Technique : CSS d'abord. Les animations liées au défilement (`animation-timeline: view()`) sont une **amélioration progressive** sous `@supports`, car Firefox ne les a pas toutes : **le contenu reste visible sans elles**.
  `motion` est autorisé (`npm install motion --workspace apps/web`) si le CSS ne suffit pas, chargé seulement là où il sert.
- Uniquement `transform` et `opacity`. Pas de saccade sur téléphone modeste, pas de décalage de mise en page, `prefers-reduced-motion` respecté partout.
- Dans la console et l'admin : micro-interactions discrètes seulement.

## 5. Mode sombre : le vert ressort trop
Le mode clair est validé, **ne change pas ses couleurs** sauf le logo.
- Surfaces en **graphite neutre** légèrement chaud, sans teinte verte (fond, cartes, barre latérale, bordures). Profondeur par la clarté des surfaces, pas par des ombres.
- Remplace le vert menthe vif par un accent **nettement désaturé et plus sombre**. Pas de grands aplats verts : gros montants en texte clair neutre, bouton principal sobre, l'accent réservé à une action par écran et aux petits signaux.
- Vert, rouge, ambre seulement pour un **sens** (validé, retard, alerte), désaturés, jamais comme seul signal.
- Contraste AA mesuré sur **chaque niveau de surface** (`scripts/contrastes.mjs`). Vérifie courbes, onglets, pastilles, champs, éléments actifs et iframes de la démo.

## Règles
- Ne change ni l'API, ni les droits, ni le moteur, ni `packages/`, `ml/`, `services/`, `docs/evaluation/runs/`. Ne touche pas à `main`, `~/kwedo`, à l'app en ligne ni aux autres processus du VPS. Ne supprime aucun dossier.
- Aucune mention d'IA, de Claude ni de `Co-Authored-By`.
- ADR 0012 pour la marque et la direction de la page. Un ADR accepté n'est pas réécrit. Mets à jour `docs/design.md` et `docs/PROGRESS.md`.
- Performance : mesure le poids de l'accueil avant et après, garde-le raisonnable.
- Build, tests API et tous les E2E verts, axe en clair et en sombre, aucun débordement à 360 px. Adapte un test seulement si un libellé a changé.
- Regarde les captures de **chaque** écran, clair et sombre, à 360, 1440 et 1920 px, puis corrige. Dépose-les dans `.captures/revue-vitrine/`.
- Commits par étape, `git push origin vitrine`. À la fin : `touch /home/ridwane/kwedo-ops/DONE`. Blocage réel : `tee /home/ridwane/kwedo-ops/BLOCKED`.

## Sources de la recherche (qualité inégale, pistes et non preuves)
- Pages fintech : https://www.webanatomy.ai/best-landing-pages/fintech , https://designrevision.com/blog/fintech-saas-landing-pages , https://www.saasframe.io/landing-page-examples/fintech
- Animations : https://tympanus.net/codrops/2024/01/17/a-practical-introduction-to-scroll-driven-animations-with-css-scroll-and-view/
- Cauri et fon : https://fongbebenin.com/traduction/fongbe-francais/traductions-fongbe-francais-vocabulaires-a.html , https://fr.wikipedia.org/wiki/Histoire_mon%C3%A9taire_de_l'Afrique_de_l'Ouest , https://www.projectmanifest.eu/les-cauris-la-monnaie-de-la-traite/
- Logo : https://technext24.com/2025/10/09/designing-fintech-products-for-africa/ , https://kreafolk.com/blogs/articles/african-logo-design
- Mode sombre : https://m2.material.io/design/color/dark-theme.html , https://colorarchive.org/guides/dark-mode-palette-guide/
