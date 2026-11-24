# ADR 0012 : marque cauri, vitrine pleine largeur, mode sombre graphite

- Statut : accepté
- Date : 2026-11-24

## Contexte

Retour utilisateur : tout était centré dans une colonne étroite, l'accueil parlait trop peu de la solution et de
l'app mobile, la marque « K de flux » n'évoquait pas le crédit, et en mode sombre le vert ressortait trop.

## Décisions

### Marque : le cauri-K

En fon, *akwɛ́* signifie à la fois « cauri » et « argent » ; le cauri a servi de monnaie dans la région. Trois pistes
dessinées (visibles sur `/design`) :

1. **Cauri-K** (retenue) : barre et jambe d'un K à l'encre, bras supérieur formé d'un cauri en amande posé en
   diagonale, avec son ouverture dentée. Se lit comme un K à 16 px, comme un cauri à partir de 32 px.
2. Deux demi-cauris en bras de K : K très lisible, mais le cauri disparaît ; ressemble à une flèche.
3. Cauri en pointe contre une barre : cauri lisible, K faible ; se confond avec un bouton « lecture ».

Le premier dessin du cauri-K avait des dents en travers : il évoquait un ballon de rugby. Les dents sont devenues
des ponts à l'intérieur d'une ouverture longue, d'une pointe à l'autre, comme sur la coquille.

Livrables : composant `Marque` / `Cauri` (couleur et monochrome), favicon SVG qui suit le thème du système,
icône d'application 180 px, image Open Graph, manifeste d'app web. Le cauri sert aussi d'objet de marque, avec
retenue : pile de cauris qui monte avec les remboursements, chargement, panneau de connexion.

**Sensibilité.** Le cauri a aussi servi de monnaie de la traite négrière et a des usages rituels : aucun récit
historique, aucun visuel de royaume, de vodoun ou de folklore. Nous n'affirmons pas que « Kwedo » vient d'*akwɛ́*
(étymologie non vérifiée) ; nous écrivons seulement qu'*akwɛ́* signifie cauri et argent en fon.

### Pleine largeur

Plus de colonne centrée comme mise en page : gouttières fluides (`.gouttiere`, `clamp(1.25rem, 4.5vw, 5rem)`),
grilles qui se réorganisent ; seules les lignes de texte sont limitées (`max-w-[60ch]` environ). Connexion en deux
panneaux, admin en vue de supervision, espace commerçant avec navigation latérale sur ordinateur et barre du bas
sur téléphone. Contrôlé à 360, 768, 1440 et 1920 px (`e2e/vitrine.spec.ts`).

### Accueil

Neuf sections : héros (deux entrées, scène animée avec les vrais écrans), problème, solution racontée au
défilement, app mobile (cinq captures réelles, aucun badge de magasin), simulateur interactif (formule simplifiée,
« exemple »), calcul, institutions, confiance et limites, état du projet et FAQ. Les captures viennent de l'app,
générées par `playwright.vitrine.config.ts`. Aucun chiffre de performance, client, partenaire ou témoignage inventé ;
le résultat du moteur est donné avec sa limite (activités jamais vues) ; aucun gain de temps annoncé ; les chiffres
de contexte restent « à recontrôler ».

### Animations

CSS seulement, `transform` et `opacity` : courbe qui se trace, compteur du montant (`@property`), écrans du
téléphone en fondu, cauris qui s'empilent, révélations au défilement sous `@supports (animation-timeline: view())`
(amélioration progressive : sans prise en charge, tout est visible). Tout est coupé sous
`prefers-reduced-motion`. `motion` n'a pas été ajouté : le CSS suffit.

### Mode sombre graphite

Surfaces graphite neutre légèrement chaud (#141312 → #2f2d2a), profondeur par la clarté des surfaces, accent
désaturé (#8db3a4) ; nouveaux jetons `action` (bouton principal sobre, #3c5f53), `montant` (gros montants en texte
clair neutre), `scene` (panneau de marque), `logo-*`. Le mode clair est inchangé, sauf le logo. Contrastes AA
mesurés sur chaque niveau de surface (`node scripts/contrastes.mjs --strict`).

## Conséquences

- Poids de l'accueil mesuré avant et après (`e2e/poids.spec.ts`, budget 950 ko décompressés).
- L'ADR 0010 reste valable pour les tokens du mode clair ; ce document remplace sa marque et son mode sombre.
