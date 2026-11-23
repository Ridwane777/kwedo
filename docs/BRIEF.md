# Kwedo : brief de construction du prototype

Source de vérité produit : `Kwedo-cahier-de-conception.pdf` (37 pages), à lire EN ENTIER avant de coder.
En cas de conflit, ce brief décide de l'organisation et le cahier décide du produit.

## Mission

Construire le prototype COMPLET et jouable de Kwedo : application commerçant, console prêteur, moteur d'analyse,
générateur de données, modèles entraînés, évaluation, documentation. Pas un projet d'école : viser un produit
qu'on a envie de montrer. Travailler en autonomie, sans attendre de confirmation, jusqu'à la fin du plan.

Périmètre : toutes les lignes « Prototype » et « Prototype (simulé) » du catalogue, priorités écrans 1, 2 et 3.
Les lignes « Phase 2 » et « Vision » ne sont pas construites. Elles peuvent apparaître dans la feuille de route.

## Règles non négociables du produit

- La décision finale est humaine et tracée : proposé, décidé, auteur, date, motif, version moteur et paramètres.
  Le journal est en ajout seul, imposé en base (triggers qui refusent UPDATE et DELETE).
- Le plafond ne dépasse jamais la formule : `R = C_p × m × s`, `L_max = R × (1 - (1+i)^-n) / i`.
  m, s, n, i et le percentile sont des paramètres par institution.
- Le moteur est déterministe : graine enregistrée, une décision se rejoue à l'identique.
- Simulation par blocs de semaines réelles plus chocs. Plafond proposé = plus gros montant sous le seuil de risque et sous L_max.
- Chiffre d'affaires vérifié : hors transferts vers soi-même et circuits circulaires.
- Une alerte de manipulation va à l'agent. Le commerçant n'est jamais accusé automatiquement.
- Consentement explicite, horodaté, révocable, par institution. Journal d'accès : qui a vu quel dossier et quand.
- Aucune variable sensible (genre, origine, religion) en entrée du moteur.
- Relances éthiques : canal choisi, nombre limité, horaires raisonnables, ton respectueux, jamais l'entourage.
- Aucune commission sur le montant prêté, aucun frais de dossier côté commerçant.
- Tout ce qui est simulé porte une étiquette visible à l'écran. Données 100 % synthétiques.
- Personnes et institutions fictives. Ne jamais utiliser le logo ou l'identité visuelle de MTN, Moov, Celtis, DGI ou BCEAO.
- Ne jamais présenter un score sur données simulées comme une performance réelle.
- Chiffres du marché : ils sont marqués « à recontrôler » dans le cahier. Ne pas les afficher comme vérifiés.

## Stack imposée (à justifier en ADR)

- Monorepo npm workspaces (pnpm est absent du VPS).
- `apps/web` : Next.js, TypeScript strict, Tailwind, Recharts ou visx, Motion si utile.
  `/` présentation, `/app` commerçant (mobile d'abord), `/console` prêteur (desktop dense), `/demo` scénario guidé.
- `services/api` : FastAPI, SQLite (WAL), migrations, schéma séparant simulé et réel.
- `packages/engine` : Python pur, sans état, testable seul, NumPy.
- `ml/` : entraînement LightGBM ou scikit-learn pour prévision, défaut, anomalies. Modèles versionnés et légers.
- Connecteurs externes derrière une interface commune (opérateur, e-MECeF, notifications), implémentés par des simulateurs.

## Direction de design

Le concept : **« le registre vivant »**. Le carnet du marché de Dantokpa devient un instrument financier précis.
Chaleureux côté commerçant, dense et calme côté agent, les deux reliés par la même courbe d'encaissements.

- Détail mémorable : la **courbe de flux** est la signature du produit. Elle se trace à l'arrivée, montre la bande
  prudente, et réagit en direct au curseur « mes ventes baissent de 30 % » (plafond et risque bougent avec elle).
- Motif graphique original inspiré des textiles ouest-africains, géométrique, discret, dessiné en SVG. Pas de cliché.
- Palette en tokens CSS, clair et sombre : papier chaud, encre profonde, indigo teinture, terre cuite, vert feuille,
  safran pour l'attention. Contraste WCAG AA.
- Typographie à caractère : une serif expressive pour les titres et les montants, une sans lisible pour l'interface,
  chiffres tabulaires. Auto-hébergée via `next/font`.
- Commerçant : gros montants, phrases simples, une action par écran, zones tactiles généreuses, utilisable à 360 px.
- Console : tableaux denses, raccourcis clavier, file, fiche en panneaux, lecture rapide.
- Interdits : dégradés violets, blobs, cartes dans des cartes, gabarit SaaS générique, texte qui décrit l'interface.
- Mouvement rare et utile, respect de `prefers-reduced-motion`. États vide, chargement et erreur soignés partout.
- Montants en FCFA formatés à la française. Toute l'interface en français.

## Plan : une étape = au moins un commit poussé sur `origin/main`

Cocher l'avancement dans `docs/PROGRESS.md` (étape, statut, commit, preuve de vérification, blocages) à chaque étape.

0. Socle : lecture du cahier, `docs/PLAN.md`, monorepo, `.gitignore`, README, ADR de stack.
1. Contrats : schéma de données, formats d'échange OpenAPI, règles de calcul figés.
2. Générateur : archétypes, saisonnalité, chocs, manipulations injectées, deux générateurs distincts, jeu de démo figé.
3. Moteur : indicateurs, capacité, plafond, simulation, raisons, règles de manipulation, tests.
4. Modèles : prévision, défaut, anomalies, comparés aux règles naïves sur archétypes jamais vus.
5. API : dossiers, consentements, décisions, offres, échéanciers, paiements, relances, journaux, simulateurs.
6. Design system : tokens, typographie, motif, composants, courbe de flux.
7. App commerçant priorité 1 : estimation avec raisons, simulateur, conseils.
8. Console priorité 1 : file, fiche analysée, décision avec justificatif.
9. Priorité 2 : inscription, compte marchand, flux, envoi et consentements, suivi, offre, échéancier, remboursement, portefeuille, relances.
10. Priorité 3 : tableau de bord, paramètres du moteur, journal d'audit, page de présentation.
11. Évaluation : les 7 questions du cahier, script reproductible, tableau de chiffres réels mesurés.
12. Mode démo : les 9 temps du scénario, données figées, réinitialisation en un clic.
13. Qualité : tests E2E Playwright du parcours complet, captures 360 px et desktop relues visuellement, accessibilité, performance.
14. Dossier final et vérification de la « Définition de terminé » du cahier, case par case, avec preuve.

## Documentation obligatoire, écrite au fil de l'eau

- `docs/adr/` : un fichier par décision (`0001-….md`) plus un index. Statut, date, décideurs, contexte, options, décision,
  conséquences gagné / perdu. Un ADR accepté n'est jamais réécrit, il est remplacé par un nouveau.
- `docs/legal/` : risques, confidentialité, CGU, mentions légales, conformité (brouillons à valider par un juriste ou l'APDP).
- `docs/performance/` : méthode, machine, résultats, seuils, script reproductible.
- `docs/business/` : business plan, SWOT, feuille de route, coûts (mesuré séparé de l'estimé). Aucun prix inventé.
- `docs/dependencies.md` : API, bibliothèques, fournisseurs, secrets, quotas, licences.
- `docs/retrospective/` : regard global, y compris organisation, limites matérielles, échéances, alternatives chiffrées.
- La doc reste alignée sur le code. Chaque chiffre vient d'une mesure ou est marqué estimé.

## Contraintes du VPS : machine PARTAGÉE

- Travailler uniquement dans `~/kwedo`. Ne jamais toucher aux autres processus, conteneurs, sessions tmux, comptes ou dossiers.
- Pas de Docker, pas de sudo, pas de `pkill` ou `killall`, pas de changement système ou crontab.
- **Pas de GPU sur cette machine.** Entraîner sur CPU avec au plus 4 threads, en `nice -n 10`. Le script de simulation doit
  accepter un backend GPU, mais ne jamais prétendre qu'il a tourné sur GPU. L'écrire dans un ADR et la rétrospective.
- Disque presque plein : le projet, dépendances comprises, reste sous 4 Go. Pas de gros jeux de données commités.
- Ports réservés : API `127.0.0.1:3460`, web `127.0.0.1:3461`, E2E `3462` et `3463`. Écoute locale uniquement, rien d'exposé.
- Aucun secret dans le dépôt. Aucun service externe payant.

## Git

- Commits en français, atomiques, poussés sur `origin/main` à la fin de chaque étape. Jamais de force push.
- **Aucune mention de Claude ou d'une IA dans les commits : pas de `Co-Authored-By`, pas de lien de session.**
- Avant chaque push : tests et build de ce qui a changé. Ne jamais pousser un build cassé.

## Fin de mission

Reprendre si la session redémarre : lire `docs/PROGRESS.md` et `git log`, puis continuer à la première étape non terminée.
Si un point bloque, le noter dans `docs/PROGRESS.md`, choisir l'option prudente et avancer.
Quand les 15 étapes sont vérifiées et poussées, et seulement alors, créer le fichier `~/kwedo-ops/DONE`.
