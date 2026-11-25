# Avancement

| # | Étape | Statut | Commit | Preuve | Blocages |
|---|---|---|---|---|---|
| 0 | Socle | fait | 99b8fc1 | poussé sur origin/main | — |
| 1 | Contrats | fait | f4147bd | `schema.sql` chargé dans SQLite en mémoire sans erreur | — |
| 2 | Générateur | fait | voir git log | 7 tests unitaires OK ; `data/demo/demo.json` d'empreinte `b6049c91…` stable | — |
| 3 | Moteur | fait | voir git log | 11 tests unitaires OK ; démo : alertes sur les 2 cas injectés, 0 sur les honnêtes ; 0,01–0,21 s par dossier | — |
| 4 | Modèles | fait (écart ADR 0003) | voir git log | `ml/artifacts/metriques-v1.json` : défaut AUC 0,737 vs règle naïve 0,497 (0,80 hors réglage) ; prévision erreur 12,2 % vs 13,3 % (15,3 % vs 20,3 % hors réglage) ; détection règles+modèle 100 % des 58 cas injectés, 6,1 % de fausses alertes | `pip install` refusé → NumPy pur |
| 5 | API | fait (écart ADR 0004) | voir git log | 5 tests : parcours estimation → consentement → dossier → décision ajustée → offre → échéancier → paiement → retard → relances → portefeuille → rejeu identique ; triggers refusent UPDATE/DELETE ; 403 sans consentement | FastAPI absent → stdlib |
| 6 | Design system | fait | voir git log | `next build` OK ; `/design` capturé à 360 et 1440 px et relu (correctifs : espace insécable des montants, crénage) ; contrastes mesurés dans `docs/design.md` | navigateur Playwright installé dans `~/.cache/ms-playwright` (701 Mo mesurés, hors `~/kwedo`, emplacement par défaut de l'outil) |
| 7 | Commerçant P1 | fait | voir git log | `/app`, `/app/simulateur`, `/app/conseils` construits et capturés à 360 px contre l'API réelle ; correctifs typographiques (espaces insécables avant « ? » et « % ») | — |
| 8 | Console P1 | fait | voir git log | `/console` (file triée, filtres, j/k/Entrée) et fiche `/console/dossiers/[id]` (indicateurs, courbe, raisons, chaîne de calcul, alertes, décision v/a/r/c avec justificatif) capturées à 1440 px ; relecture → bogue moteur corrigé (raison « tendance » de signe inversé) + test de non-régression | — |
| 9 | Priorité 2 | fait | voir git log | Écrans inscription, compte, flux, dossier/consentements/suivi, offre (contre-proposition), crédit (échéancier, paiement, reçus, canal), portefeuille/relances/reprogrammation. `e2e/parcours.spec.ts` passe (43 s) ; relecture des captures → marqueurs internes « [J+n] » retirés des messages | — |
| 10 | Priorité 3 | fait | voir git log | `/app/activite`, `/console/parametres` (versions, jamais de réécriture), `/console/journal` (filtrable), `/` présentation ; captures relues → horloge simulée rendue continue (journal ordonné), montants formatés, mention « à recontrôler » lisible ; E2E repassé (38,6 s) | — |
| 11 | Évaluation | fait | voir git log | `ml/evaluate.py` reproductible (≈ 40 s) → `docs/evaluation/resultats.json` + `README.md`. **Constat : à exposition égale, le moteur ne bat pas de façon démontrée la règle « médiane × k »** (écarts dans le bruit) ; risque annoncé sous-estimé (13 pts) ; stabilité, fidélité des raisons, détection (100 % combinée) et équité OK ; temps humain non mesuré (protocole écrit). Défauts trouvés et corrigés : comparaison initiale à exposition inégale (retirée), plafond qui montait avec le curseur de baisse (modèle nourri du scénario) | critère « bat la règle naïve » non atteint |
| 12 | Mode démo | fait | voir git log | `/demo` : 9 temps du cahier (≈ 3 min 55 s), écrans réels en iframes téléphone + console, actions en un clic, réinitialisation en un clic sur `data/demo/demo.json` figé ; `e2e/demo.spec.ts` passe (44 s). Relecture → total affiché corrigé, tableaux console rendus défilants | — |
| 13 | Qualité | fait | voir git log | `npx playwright test` : **19/19** sur ports isolés 3462/3463 (base jetable) — parcours complet, démo, axe WCAG 2.1 AA (0 violation grave/critique) + 0 erreur JS + 0 débordement à 360 px sur 16 écrans ; captures relues (sélection dans `docs/captures/`) ; `docs/performance/` : seuils respectés sauf reset démo (3–9 s, documenté). Correctifs : contraste ligne sélectionnée, LCP `/app` −25 %, proxy API lu à l'exécution | — |
| 14 | Dossier final | fait | voir git log | `docs/DEFINITION-DE-TERMINE.md` : 5/6 critères ✅ avec preuve, **critère 5 ❌** (le moteur ne bat pas la règle naïve de façon démontrée) ; légal, business, dépendances, rétrospective rédigés ; disque 654 Mo + 701 Mo (< 4 Go) | critère 5 non atteint |

## Fin de mission

Les 15 étapes sont réalisées, vérifiées et poussées. **`~/kwedo-ops/DONE` n'a pas été créé** : la Définition de
terminé du cahier n'est pas entièrement satisfaite (critère 5). Option prudente : laisser la décision à l'équipe
(accepter la limite documentée, ou retravailler le moteur — pistes dans `docs/retrospective/README.md`).

## Passe de correction (`docs/CORRECTIONS.md`)

| # | Correction | Statut | Commit | Preuve | Blocages |
|---|---|---|---|---|---|
| C1 | Stack | fait | voir git log (« C1 Stack ») | `requirements.txt` épinglé, `.venv` ; API FastAPI, contrat inchangé (test des codes 404/422/201) ; ADR 0006 remplace 0004 ; 6 tests API + 19 E2E OK | **push refusé par la session** |
| C2 | Modèles | fait | 9cd2a17 | LightGBM (4 fils, `nice -n 10`) vs NumPy sur le réglage : AUC 0,923 vs 0,917, Brier 0,088 vs 0,094 ; prévision 10,05 % vs 10,27 % ; ADR 0007 remplace 0003 | — |
| C3 | Calibration | fait (réglage) / ❌ au run final | 9cd2a17 | Cause : dépenses perso absentes de la simulation + marge supposée trop haute (`ml/artifacts/diagnostic-calibration.json`) ; isotonique sur partition b : ECE 0,017 sur le réglage, **0,089 au run final** | dérive du générateur de test |
| C4 | Décision | fait / ❌ hors réglage | 9cd2a17, 5ea6a00 | Run final 1 : 0,93 % vs 1,25 / 1,23 % sur le test complet (IC excluant 0) ; hors réglage 1,41 % vs 1,43 / 1,40 % (non significatif) ; plafond ≤ L_max ; raisons 100 % fidèles ; équité 40/40 | critères 1-2 non atteints hors réglage |
| C5 | Temps de traitement | fait | ac8ff67 | Chronomètre dans la fiche dossier, « non mesuré » par défaut, export CSV/JSON ; `e2e/chronometre.spec.ts` OK. Temps humain : **non mesuré**. **Retiré depuis** sur décision produit (mission menu de compte), sans avoir servi | — |
| C6 | Mise à jour | fait | voir git log | Évaluation, performance, Définition de terminé, rétrospective, README, ce fichier | — |

**Runs finaux : 1 sur 3, en échec** (`docs/evaluation/runs/run-1.json`). Pas de run 2 : voir la rétrospective (corriger
la dérive demanderait de rapprocher le réglage des réglages connus du générateur de test). Fin : `~/kwedo-ops/BLOCKED`.

## Environnement constaté (2026-11-23)

- Node 22.22.3, npm 10.9.8, Python 3.12.3, NumPy 1.26.4 (système). 8 cœurs, pas de GPU.
- Disque : 20 Go libres sur 387 Go (96 % utilisé).
- `pip install` dans `.venv` : refusé par la politique de permissions de la session. Option prudente :
  tout en Python pur + NumPy + bibliothèque standard (ADR 0003, 0004).
- `npm install` et le réseau git fonctionnent.

## Mission accès : comptes, cloisonnement, admin général (`docs/MISSION-ACCES.md`, branche `cloisonnement`)

| # | Étape | Statut | Commit | Preuve |
|---|---|---|---|---|
| A1 | Corrections de types, build, tests | fait | 666e235 | `npm run build:web` OK ; `npm run test:api` 12/12 ; `npx playwright test` 24/24 |
| A2 | Audit route par route | fait | cadcf53 | Trous fermés : l'estimation commerçant renvoyait R (plafond et montant souhaité), la recommandation et la graine ; textes moteur citant R, le seuil, s et un encaissement requis (→ m × s) réécrits à la frontière de l'API (moteur inchangé). Tests ajoutés : crédits, échéances, offres, commandes de démo, champs internes. `test:api` 16/16 |
| A3 | Revue des écrans | fait | c8dc63a | `e2e/ecrans.spec.ts` : `/connexion`, `/admin`, console × 4 profils, 9 temps de `/demo`, à 360 et 1440 px, 0 erreur JS, 0 débordement. Défaut trouvé : toute la console et la démo débordaient à 360 px (barre latérale fixe, iframe de 560 px). Corrigé : onglets défilants, cartes de dossiers et d'institutions sur téléphone, tableaux défilants |
| A4 | Documentation | fait | 78df9d9 | ADR 0009 + index, `openapi.yaml` (règle `x-acces` par route), README, `docs/legal/risques.md` |
| A5 | Vérification finale | fait | — | build OK ; `test:api` 16/16 ; `npx playwright test` **38/38** (ports 3462/3463) |

**Limite : le choix de profil n'est pas une authentification (pas de mot de passe).** Le cloisonnement est réel et
testé par appels directs, mais n'importe quel visiteur peut choisir n'importe quel profil. Résiduel : un commerçant
peut inférer approximativement les réglages d'une institution par essais répétés (voir ADR 0009).

## Mission interface : produit fini (`docs/MISSION-INTERFACE.md`, branche `cloisonnement`)

| # | Étape | Statut | Preuve |
|---|---|---|---|
| I1 | Système de design « comptoir » | fait | ADR 0010, `docs/design.md` : tokens sémantiques clair/sombre (AA mesuré, `scripts/contrastes.mjs`), Bricolage Grotesque + Instrument Sans, nouvelle marque, composants (états chargement / vide / erreur / confirmation) |
| I2 | Écrans refaits | fait | Accueil public (aperçu de l'app, parcours commerçant et prêteur, chiffres « à recontrôler » retirés), connexion, accueil commerçant (combien / prix / action), cadre et file console (compteurs d'exception), admin (institutions triées par attente, activité récente, confirmation de réinitialisation) |
| I3 | Revue sur captures | fait | `e2e/ecrans.spec.ts` étendu à l'accueil et aux 6 écrans commerçant ; défauts trouvés et corrigés : débordement de l'accueil à 360 px, icône manquante dans la console, initiales de rôle, journal admin trop long, étiquettes en capitales |
| I4 | Vérification | fait | build OK, `test:api` 16/16, `npx playwright test` **40/40** |

Calculs, droits d'accès et contrat d'API inchangés. Limite : le test du chronomètre a échoué une fois par délai
d'attente sous charge (passé seul puis dans la suite complète) ; à surveiller.

## Relecture de l'interface (`docs/RELECTURE-INTERFACE.md`, branche `finition`)

| # | Correction | Preuve |
|---|---|---|
| 0 | Acceptation de l'offre | Non reproduite en 5 passages. Faille du produit trouvée : après un accord réussi, le bouton se réactivait et la page attendait une navigation sans rien montrer ; si elle tardait, le commerçant restait sur l'offre (un second clic aurait renvoyé « aucune offre en attente »). Corrigé : `/app/credit` préchargé, écran « Offre acceptée » avec lien de secours, bouton jamais réactivé, erreur affichée avec « Réessayer ». Parcours rejoué 5 fois : 15/15 |
| 1 | Mots collés | Cause mesurée : l'espace d'Instrument Sans vaut 0,17 em (2 px à 12 px). Police de texte remplacée par Public Sans (a2d9cb5) ; contrôlé sur captures 360 et 1440 px |
| 2–4 | Barre latérale | Fond porté par la colonne pleine hauteur, raccourcis non compressibles, nom d'institution sur deux lignes au besoin |
| 5 | « ← FileÉchap » | « ← Retour à la file » + touche Échap séparée |
| — | Fiche de décision | Synthèse (montant, risque contre seuil, recommandation), alertes, « ce qui a pesé » (avec l'avertissement de hausse à côté de son montant) et décision au premier écran à 1440 × 900 ; indicateurs, courbe, chaîne de calcul, modèles et journal d'accès en onglets ARIA (flèches, Début, Fin). Sur téléphone, la décision suit les raisons |
| — | Admin | Événements identiques consécutifs regroupés (« 5 fois »), institutions en liste compacte |
| — | Démo | Étiquette courte à 360 px ; captures prises une fois les iframes chargées |
| — | Vérification | build OK, `test:api` 16/16, `npx playwright test` **40/40** ; revue des écrans étendue à l'offre et au crédit en cours |

## Menu de compte, icônes, thème, retrait du chronomètre (`docs/MISSION-MENU-COMPTE.md`, branche `finition`)

| # | Demande | Preuve |
|---|---|---|
| 0 | Relecture précédente | entièrement traitée (voir section précédente) ; captures désormais dans `.captures/revue-finale/` |
| 1 | `UserButton` | `components/user-button.tsx`, seul menu de compte du commerçant, de la console et de l'admin ; « Quitter » et les « Changer de profil » permanents supprimés. Pastille de 48 px, menu ARIA (flèches, Début, Fin, Échap, clic extérieur, focus rendu). Déconnexion réelle puis `location.replace` ; page restaurée du cache rechargée. Masqué dans les iframes de la démo. Défaut trouvé : le raccourci global « Entrée » de la file captait l'Entrée du bouton ; les raccourcis n'interceptent plus Entrée/Espace sur un bouton ou un lien. `e2e/compte.spec.ts` : 3 espaces × 360/1440, refus de l'API et retour arrière vérifiés |
| 2 | Icônes | `lucide-react` (20 px, trait 1,75) ; `BoutonIcone`/`LienIcone` (aria-label, infobulle au survol et au focus, 48/44 px) pour retour, précédent, suivant, trier, réessayer, réinitialiser, avancer l'horloge, replier, voir le calcul, reprogrammer ; icône + libellé pour envoyer, accepter, décliner, payer, enregistrer, se déconnecter. SVG faits main en doublon retirés (la marque reste). Défaut trouvé : les infobulles invisibles élargissaient la page ; elles sont retirées de la mise en page hors survol |
| 3 | Chronomètre | composant, usage, exports et `e2e/chronometre.spec.ts` supprimés ; « Dossier traité en… » remplacé par « Décision enregistrée au journal. » ; README, évaluation, protocole, rétrospective, performance, Définition de terminé alignés : **gain de temps humain non mesuré, non annoncé** |
| 4 | Thème | Clair / Sombre / Système via `data-theme`, script avant rendu (aucun flash), `localStorage` protégé, Système suit le téléphone en direct (CSS), iframes synchronisées. Contrastes AA mesurés dans les deux thèmes (`scripts/contrastes.mjs`) ; axe sur tous les écrans principaux en clair et en sombre (`e2e/qualite.spec.ts`) ; persistance testée |
| 5 | ADR | 0010 restauré tel que sur `main`, statut seul annoté ; ADR 0011 (Public Sans) ajouté à l'index |
| — | Vérification | build OK, `test:api` OK, `npx playwright test` **83/83** ; 178 captures (chaque écran et rôle, 360/1440, clair/sombre, offre, crédit en cours, 9 temps de démo, menus ouverts) dans `.captures/revue-finale/` |

## Mission vitrine (`docs/MISSION-VITRINE.md`, branche `vitrine`)

| # | Demande | Preuve |
|---|---|---|
| 1 | Pleine largeur | Gouttières fluides (`.gouttiere`), plus de colonne centrée : accueil, connexion (deux panneaux, univers de marque animé), admin (deux colonnes en grand écran), console, démo ; espace commerçant avec navigation latérale sur ordinateur (montant et actions à gauche, courbe et raisons à droite), barre du bas sur téléphone. `e2e/vitrine.spec.ts` : 4 groupes d'écrans × 360/768/1440/1920 × clair/sombre, aucun débordement |
| 2 | Logo cauri | Cauri-K (barre et jambe du K, bras supérieur en cauri à ouverture dentée) ; 3 pistes comparées sur `/design` ; deux défauts de dessin corrigés en cours (dents en travers qui évoquaient un ballon, puis feuille sans dents). `Marque`, `Cauri` (couleur, mono), favicon SVG adaptatif, icône d'application, image Open Graph, manifeste ; pile de cauris, chargement. Aucun récit historique ni étymologie revendiquée |
| 3 | Accueil | 9 sections : héros à deux entrées avec vrais écrans, problème (chiffres « à recontrôler »), solution au défilement, 5 vraies captures de l'app sans badge de magasin, simulateur interactif « exemple », calcul, institutions, confiance et limites, état honnête (limite du moteur sur les activités jamais vues), FAQ, appel à l'action, pied de page. Captures générées depuis l'app (`playwright.vitrine.config.ts`) |
| 4 | Animations | CSS seulement (`transform`, `opacity`) : courbe tracée, compteur `@property`, écrans en fondu, cauris, révélations au défilement sous `@supports` ; tout coupé sous mouvement réduit ; `motion` non ajouté |
| 5 | Sombre | Graphite neutre chaud, accent désaturé, jetons `action`, `montant`, `scene`, `logo-*` ; clair inchangé hors logo ; `node scripts/contrastes.mjs --strict` : AA sur chaque niveau de surface |
| — | Poids de l'accueil | Avant : 779 ko bruts. Après : 1 010 ko bruts, 486 ko compressés (images 118, polices 180, JS 150). Défaut trouvé : `sizes` invalide (clamp) qui chargeait les captures en pleine largeur (images 355 → 118 ko) ; préchargement des liens désactivé sur l'accueil. Budget testé : 520 ko compressés (`e2e/poids.spec.ts`) |
| — | Vérification | build OK, `test:api` OK, `npx playwright test` **119/119** (axe en clair et en sombre) ; captures dans `.captures/revue-vitrine/` ; ADR 0012, `docs/design.md` |

Limite : les captures pleine page sont prises en mouvement réduit (sinon les révélations au défilement restent dans
leur état initial hors de la vue) ; les animations elles-mêmes se vérifient dans le navigateur.

## Mission finitions (`docs/MISSION-FINITIONS.md`, branche `finitions`)

| # | Demande | Preuve |
|---|---|---|
| 1 | Logo en grand format | Cauri redessiné par calcul (`scripts/geometrie-cauri.mjs`) : coquille ovale bombée, ouverture fine et légèrement courbe d'une pointe à l'autre, 12 petites dents courtes par lèvre creusées vers l'extérieur, encoches aux deux bouts ; plus aucune hachure en travers. Trois itérations jugées sur captures (dents en travers puis rainures longues évoquaient encore un ballon). Version simplifiée sous 24 px. Favicon, icône d'application, image de partage, pile de cauris mis à jour. Connexion : la courbe passe au-dessus du texte et ne croise plus le logo |
| 2 | Mois des courbes | `CourbeFlux` dessine à l'échelle 1 (largeur mesurée) : libellés et valeurs à 12 px de 360 à 1920 px, hauteur bornée |
| 3 | Bouton Σ | « Voir le calcul » avec icône (et « Masquer le calcul ») |
| 4 | Commandes admin | « Avancer de 7 jours » et « Réinitialiser », icône + libellé |
| 5 | Vide à 1920 px | Admin : répartition des dossiers (à traiter, décidés sans crédit, crédit ouvert), par institution et au total, calculée uniquement depuis l'aperçu existant ; activité sur toute sa colonne. Commerçant : actions sous le sélecteur, colonne gauche collante. Défaut trouvé : débordement à 360 px dû à la grille parente, corrigé |
| 6 | Téléphones de l'accueil | Cause : l'arrondi du cadre mangeait les bords de la barre du bas. Cadre à « menton », écran aux coins bas presque droits, image jamais recadrée ; « Estimation » et « Activité » entiers |
| — | Vérification | build OK, `test:api` OK, `npx playwright test` **119/119** ; captures 360/768/1440/1920 clair et sombre dans `.captures/revue-finitions/`. Un blocage d'attente réseau sur la démo en fin de suite (test passé 4/4 seul) : attente bornée, vérification de fin de chargement conservée |

## Mission ajustements (`docs/MISSION-AJUSTEMENTS.md`, branche `ajustements`)

| # | Demande | Preuve |
|---|---|---|
| 1 | Admin équilibré | Page en colonne pleine hauteur ; en grand écran les deux colonnes s'étirent : à gauche institutions, répartition et « Activité par type » (décisions, accès, interventions, réglages publiés, consentements, et événements par institution), comptée sur le journal déjà servi ; à droite le journal entier avec défilement interne (zone focalisable), commandes de démo dessous. Aucune donnée ajoutée à l'API, aucune valeur de réglage |
| 2 | Accueil | Sections « Où on en est. » et « Comment le plafond est calculé. » supprimées, lien « Le calcul » retiré, plus de mention de la formule dans « Un plafond prudent ». Alternance des fonds : problème, app, institutions, FAQ sur fond de surface. « Voir le calcul » et la fiche de la console inchangés |
| 3 | Téléphone du héros en sombre | Non reproduit en local (capture correcte en sombre système, choix explicite, mouvement réduit). Cause probable : l'écran sombre du héros était chargé à la demande, donc absent tant qu'il n'était pas arrivé ; il est maintenant chargé d'emblée pour le téléphone prioritaire |
| — | Vérification | build OK, `npx playwright test` **119/119** ; captures admin et accueil (par section), 360/768/1440/1920, clair et sombre, dans `apps/web/.captures/revue-ajustements/` (suite lancée depuis `apps/web`) ; téléphones de l'accueil vérifiés en sombre |

## Mission Docker (`docs/MISSION-DOCKER.md`, branche `docker`)

| # | Demande | Preuve |
|---|---|---|
| 1 | `docker/api.Dockerfile` | Python 3.12 slim, `requirements.txt` épinglé, moteur + modèles entraînés + démo figée copiés, base dans le volume `/data` initialisée si vide, écoute `0.0.0.0:3460` via `KWEDO_HOST` (défaut 127.0.0.1 inchangé) |
| 2 | `docker/web.Dockerfile` | Node 22, trois étapes, sortie `standalone` (vérifiée : `next build` produit `.next/standalone/apps/web/server.js`), port 3461, `KWEDO_API` lu à l'exécution |
| 3 | `docker-compose.yml` | `api` et `web`, `web` attend `api` saine (healthcheck `/auth/profils`), volume `kwedo-db`, ports 3460/3461 |
| 4–6 | `.dockerignore`, README, ADR 0013 | faits ; index des ADR mis à jour |
| — | Vérification | `npm run test:api` 16/16 OK, `npm run build:web` OK. **Les images n'ont pas été construites ni lancées : Docker est interdit sur le VPS.** Premier `docker compose up --build` à faire sur une autre machine. `next start` avec `output: "standalone"` peut afficher un avertissement de Next ; non relancé ici |

## Mission échéances (`docs/MISSION-ECHEANCES.md`, branche `echeances`)

| # | Demande | Preuve |
|---|---|---|
| 5 | Dossier simplifié | Interrupteurs « Qui peut voir » supprimés ; un bouton « Déposer mon dossier de crédit » → institution → modalités → confirmation (« J'accepte que <institution> consulte mon dossier de crédit ») → envoi. Suivi sous le bouton ; retrait de l'accord dans « Mon compte marchand ». Boutons « Envoyer mon dossier » de l'Estimation et des Conseils → ce parcours |
| 1 | Moteur | Fréquence `hebdomadaire` / `quinzaine` / `mensuelle`, durée 3–12 mois ; C_p sur encaissements agrégés à la période (sommes glissantes), taux par période, contrôle à chaque échéance (2 000 avenirs à la semaine) ; risque hors hebdo = modèle appliqué au montant équivalent, `risque_valide: false`, pas de réentraînement. **Hebdomadaire identique** : 21 couples commerçant × institution comparés champ à champ avant/après (0 écart) ; Koffi 495 000 FCFA, risque 8,46 %. `test:engine` 24/24 |
| 2 | Institutions | Modalités versionnées dans `parametres_moteur` (fréquences, durée min/max, délai de versement) ; Lagune semaine+mois 3–12 mois 48 h, Baobab mois 6–12 mois 72 h, Mutuelle semaine+quinzaine 3–6 mois 24 h ; éditables par le responsable (console Paramètres), absentes des vues admin (testé) |
| 3 | Commerçant / agent | Choix fréquence + durée dans Estimation, Simuler, dépôt ; échéance exacte (« 151 961 FCFA chaque mois pendant 6 mois »), nombre d'échéances, coût total, délai de versement ; mention prudente hors hebdo ; accord signé par **code SMS simulé** (affiché en démo, empreinte seule en base, 10 min, usage unique, 5 essais, tracé au journal) ; offre/crédit/échéancier/rappels à la fréquence choisie ; fiche console : modalités demandées + ajustement dans les limites |
| 4 | Documentation | ADR 0015, `docs/evaluation/perimetre-frequences.md`, section concurrence PNIF / Alafia III dans `docs/business/README.md` (sources, pnif.bj illisible : certificat invalide), `docs/legal/` (conformité, CGU, risques), `openapi.yaml`, `design.md` |
| — | Vérification | `test:engine` 24/24, `test:api` 23/23, build OK, `npx playwright test` **132/132** (30 min) ; captures 6 écrans + paramètres, clair/sombre, 360/1440 dans `.captures/revue-echeances/` ; relecture → niveau prudent mensuel tracé sur la courbe hebdomadaire (hors échelle), ramené à la semaine ; specs concernées rejouées 46/46 |

**Routes à ajouter à `attaque.py`** :
- `POST /commercants/{id}/code-sms` (nouvelle ; règle : le commerçant lui-même).
- `POST /commercants/{id}/consentements` : **règle changée**, `action: accorde` exige un `code` SMS valide (403 sinon) ; `retire` inchangé.
- Paramètres nouveaux (règles d'accès inchangées) : `GET /commercants/{id}/estimation` (`frequence`, `duree_mois`), `POST /dossiers` (`frequence`, `duree_mois`), `POST /dossiers/{id}/decisions` (`frequence`, `duree_mois`), `POST /institutions/{id}/parametres` (`frequences`, `duree_min_mois`, `duree_max_mois`, `delai_versement_h`).

**Limite** : le risque n'est validé que pour l'hebdomadaire ; quinzaine et mensuel sont des estimations prudentes non évaluées (ADR 0015).

## Mission risque toutes fréquences (`docs/MISSION-RISQUE-FREQUENCES.md`, branche `risque-frequences`)

| # | Demande | Preuve |
|---|---|---|
| 1 | Données simulées | `kwedo_gen.rembourser` (échéancier quelconque, paiement après dépenses, défaut = échéance manquée de plus de 0 jour, identique partout ; hebdo 26 = étiquette d'origine, testé) ; réglage a/b/v et test × 3 fréquences × {3, 6, 9, 12} mois |
| 2 | Modèle | v3 unique (échéancier en entrée) contre un modèle par fréquence, comparés sur v seulement : Brier 0,06776 contre 0,06729 (< 1 %) → unique ; isotonique lissée par fréquence sur b ; moteur v3 pour toutes les fréquences, `risque_valide` vrai partout, `risque_eprouve` ajouté |
| 3 | Évaluation | `protocole-frequences.md` et graines committés avant le run (3d343f6) ; run unique `runs/2026-11-24-frequences/` ; tableau 12 cellules dans `docs/evaluation/README.md`. C1/C2 ✅ partout sur le test complet ; ❌ sur les activités jamais vues ; C3 ❌ (ECE 0,089 / 0,064 / 0,052). Les 3 fréquences « éprouvées » → mention retirée de l'interface |
| — | Non-régression | Hebdo 26 sur le jeu du run 1 : 0,84 % contre 0,93 %, montant total −1,7 %, ECE 0,091 contre 0,089. Koffi 495 000 FCFA, risque 7,85 % (8,46 % avant) |
| 4 | Documentation | ADR 0016 (statut de 0015 mis à jour), rétrospective, README, note de dépassement dans `perimetre-frequences.md` |
| — | Vérification | `test:engine` OK, `test:api` 23/23, `test:gen` OK, build OK, E2E `parcours.spec.ts` 3/3 (seul écran dont l'attendu change) |

**Contrat** : champ `risque_eprouve` ajouté à l'analyse (console) ; `estimation_eprouvee` (commerçant) en dérive. Aucune route nouvelle.

## Mission demande libre et décision par le risque (`docs/MISSION-DEMANDE.md`, branche `demande`)

| # | Demande | Preuve |
|---|---|---|
| 1 | Commerçant : dépôt | Montant souhaité saisi librement (aucun pré-remplissage), repère « jusqu'à X reste prudent pour vos ventes » avec ses conditions ; objet obligatoire (catégorie + phrase ≤ 200 car.) ; au-dessus du plafond : avertissement non bloquant, échéance et coût total recalculés sur le montant demandé ; récapitulatif avant code SMS : montant, objet, fréquence, durée, échéance, coût total |
| 2 | API / moteur | Migration `0005_demande.sql` ; validation serveur (5 000 à 50 000 000 FCFA, catégorie connue, objet non vide ≤ 200) ; risque v3 du montant demandé via `analyser(montant_souhaite=)` (modèle inchangé), `raisons_demande` (« représente 70 % d'une mauvaise semaine », écart au plafond) ; `rejouer` reste identique |
| 3 | Console | Fiche : montant demandé, objet, modalités, risque de la demande, pastille dans / au-dessus de la tolérance ; plafond prudent et son risque en repère ; Accorder / Contre-proposer (risque recalculé à chaque changement) / Refuser, motif obligatoire, risque tracé au journal ; file avec montant demandé et risque, tri par risque ; offre commerçant « demande acceptée » ou « contre-proposition » avec l'écart ; admin sans objet ni montant (testé) |
| 4 | « Plafond » partout | Formulation « Jusqu'à X, remboursés … pendant …, aux conditions de … » + définition (toucher/survol) sur Estimation, Activité (lien « voir selon la durée »), Simuler, Dossier, Conseils (fréquence/durée modifiables en haut, effets calculés pour elles), accueil et démo ; tableau plafond selon la durée (3/6/9/12 mois dans les modalités) avec échéance et coût total |
| 5 | Démo et docs | Dossiers de démo avec montants (0,5 à 1,8 × plafond) et objets variés ; démo guidée mise à jour ; ADR 0017 ; `docs/legal/confidentialite.md` (objet du crédit, minimisation) |

**Routes à ajouter à `attaque.py`** :
- `GET /dossiers/{id}/risque?montant=&frequence=&duree_mois=` (nouvelle ; règle : équipe de l'institution du dossier, 404 sinon).
- `GET /commercants/{id}/plafonds?institution_id=&frequence=` (nouvelle ; règle : le commerçant lui-même).
- `POST /dossiers` : **champs obligatoires** `montant_demande`, `objet_categorie`, `objet` (422 sinon) ; règle d'accès inchangée.
- `GET /dossiers?tri=risque` (nouvelle valeur) ; `GET /commercants/{id}/conseils` (`frequence`, `duree_mois`) ; `POST /dossiers/{id}/decisions` : `valide` accorde désormais le montant demandé, `ajuste` borné au montant demandé.

## Mission diagnostic du risque (`docs/MISSION-DIAGNOSTIC.md`, branche `diagnostic`)

| # | Demande | Preuve |
|---|---|---|
| 1 | Inventaire des écarts | 7 écarts de `Config` + caractéristiques des archétypes nouveaux (marge, crédit, saisonnalité), observabilité de chacun : `docs/evaluation/diagnostic/README.md` §1 ; assertion réglage + écarts = `TEST` |
| 2 | Ablation | `ml/diagnostic_ablation.py` : 15 variantes (réglage, 7 seuls, 7 cumuls), 2 000 + 1 000 commerçants jamais vus chacune, graines neuves (`diagnostic/graines.json`), v3 inchangé, IC bootstrap. Le cumul reproduit le run publié (ECE hebdo 0,099 contre 0,089) |
| 3 | Cause | Activités jamais vues : 50 / 64 / 75 % de (A), 100 % de (B). Profil → activité à 99 % ; extrapolation ticket élevé → sûr (quincaillerie 4,8 % annoncé, 30,8 % observé). Reste : dépenses personnelles et semaines vides, non observables. Pente b ≈ 0,61 |
| 4 | Pistes | Plancher « risque simulé » pour activité inconnue (ECE 0,18 → 0,12, sans réglage sur le test) ; recalibration (0,079 → 0,012, mais réglage 0,007 → 0,084 : rejetée sans données réelles). Rien appliqué, pas d'ADR |
| — | Règles | `docs/evaluation/runs` et `ml/artifacts` intacts ; intermédiaires supprimés ; `test:engine` vert |

## Mission formule hors des écrans (`docs/MISSION-FORMULE.md`, branche `formule`)

| # | Demande | Preuve |
|---|---|---|
| 1 | Fiche console | Plus de « formule X FCFA », « Plafond de la formule », « la formule reste le plafond ». Gardés : montant demandé, objet, risque de la demande et tolérance, plafond prudent et son risque en repère, raisons. Borne de la contre-proposition (`L_max`, toujours appliquée par le serveur) énoncée en mots : « Au-delà, les ventes ne permettent pas de rembourser prudemment. » Onglet « Chaîne de calcul » → « Comment c'est calculé », en mots (moteur + graine pour le rejeu). La raison moteur `formule` est reformulée à l'écran (commerçant et console) ; le dossier stocké, `rejouer` et le journal d'audit gardent la sortie moteur |
| 2 | « Voir le calcul » | Remplacé par le bouton « Comment ce montant est calculé » : 3 phrases sans symbole (mauvaise période + marge de sécurité ; 2 000 scénarios ; l'institution décide) + échéances, durée, coût total. **Choix : pas de fusion avec « Pourquoi ce montant »** — les raisons disent ce qui pèse sur ce commerçant, ce bloc dit la méthode commune ; il reste sous les raisons, replié |
| 3 | Paramètres | Ligne `R = C_p × m × s · L_max = …` retirée ; chaque réglage : nom en clair + phrase d'effet ; historique avec en-têtes en clair. Aperçu avant enregistrement (responsable seul) : plafond prudent moyen, risque moyen de la demande, demandes au-dessus de la tolérance, avant / après, recalculés par le moteur (graine de chaque dossier), rien n'est écrit |
| 4 | Ailleurs | Vitrine : « Exemple, calcul simplifié », phrase en mots (plus de 20ᵉ centile × m × s). « seule formule de cette institution » → « seule option ». Recherche `L_max|C_p|formule|annuit` dans `apps/web` : ne restent que des commentaires de code et des noms de champs. `docs/design.md` : section « Ce qui est affiché du calcul ». Pas d'ADR (décision d'affichage, sans effet sur le moteur ni le contrat de données) |
| 5 | Profils à risque | Voir ci-dessous |
| — | Vérification | `test:api` 33/33 (4 nouveaux : palette, causes, profil à risque, aucune formule dans les raisons ; aperçu réservé et sans écriture), `test:engine` 25/25, `test:gen` 11/11, build OK. E2E : `formule.spec.ts` 3/3 (nouveau : aucune page `/app` et `/console` avec `L_max`, `C_p`, « formule », panneaux repliés compris ; fiche à risque ; aperçu des paramètres), `parcours` 3/3, `demande` 3/3, `demo` 1/1 (10 temps). `ecrans.spec.ts` adapté (10 temps) mais non relancé (captures complètes, hors écrans ciblés) |

**Route à ajouter à `attaque.py`** :
- `POST /institutions/{id}/parametres/apercu` (nouvelle ; corps : `m`, `s`, `n`, `i`, `percentile`, `seuil_risque` ; règle : responsable de cette institution, 403 pour l'agent, une autre institution ou l'admin ; 422 hors bornes ; n'écrit rien).
- `GET /auth/profils` : champ `libelle` ajouté ; nouveau profil `commercant-risque` (`com-yaba`) pour `POST /auth/connexion`.

### Données de démo : mesure avant (`scripts/mesure_demo.py`, file Lagune triée par risque)

| Commerçant | Plafond prudent | Demandé | Risque demande | Tolérance | Régularité (CV) | Tendance / sem. | Plus gros payeur | Part pro | Semaines |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Rachidi | 260 000 | 365 000 | 9,4 % | 10 % | 0,25 | −2,5 % | 15 % | 89 % | 52 |
| Séna | 400 000 | 320 000 | 7,9 % | 10 % | 0,38 | −5,5 % | 20 % | 98 % | 52 |
| Koffi | 495 000 | 495 000 | 7,8 % | 10 % | 0,69 | +29,3 % | 23 % | 95 % | 52 |
| Edwige | 320 000 | 160 000 | 3,8 % | 10 % | 0,25 | +0,1 % | 11 % | 79 % | 52 |
| Gildas | 480 000 | 290 000 | 3,3 % | 10 % | 0,40 | +1,9 % | 16 % | 98 % | 52 |
| Nafissatou | 50 000 | 90 000 | 0,4 % | 10 % | 0,62 | +2,5 % | 23 % | 92 % | 10 |

Constat : **aucune demande au-dessus de la tolérance**, aucun dossier chez Baobab ; le retour du propriétaire est fondé.

### Après : deux profils à risque ajoutés par le générateur existant

Graines cherchées avec `scripts/chercher_profils.py` (générateur `test`, réglages inchangés) puis vérifiées avec
`scripts/raisons_profil.py` ; le risque est **celui du moteur**, seul le montant demandé (multiple du plafond, comme
les autres dossiers de démo) est un choix de scénario. Rien d'écrit à la main, modèle inchangé.

| Commerçant | Profil | Plafond prudent | Demandé | Risque demande | Tolérance | Cause lue dans le moteur |
|---|---|---:|---:|---:|---:|---|
| Hounkpè Dossou (tissus, graine 60025) | à risque (a) | 920 000 | 1 290 000 | **25,2 %** | 10 % | tendance −6,0 %/sem. (ventes −5,5 % sur les 8 dernières semaines contre les 8 précédentes), CV 0,42 ; raison moteur « Votre activité baisse ces dernières semaines, ce qui réduit le plafond » |
| Yaba Agossou (cosmétique, graine 50007, concentration, compte non séparé) | à risque (b) | 355 000 | 530 000 | **17,9 %** | 10 % | un payeur = 52 % des encaissements (alerte moteur), CV 0,49 (raison « varient beaucoup ») ; conseils « Diversifiez… » |
| Yaba Agossou chez Baobab | à risque (b) | 445 000 | 670 000 | **16,8 %** | 7 % | idem, mensuel |
| Rachidi Akanni | limite | 260 000 | 365 000 | 9,4 % | 10 % | demande 40 % au-dessus du plafond, juste sous la tolérance |
| Edwige, Gildas | sains | — | — | 3,8 % / 3,3 % | 10 % | — |

Au-dessus du plafond : Hounkpè, Yaba, Rachidi, Nafissatou. (c) historique court : Nafissatou (10 semaines, décote
d'ancienneté). Écarts honnêtes : la part pro de Yaba reste à 92 % malgré le compte non séparé (le générateur mêle
peu de flux personnels) ; les raisons du moteur ne chiffrent pas la baisse (« vos ventes ont baissé de 35 % »)
— le chiffre est dans les indicateurs de la fiche (tendance par semaine), pas inventé dans une raison. Écarté :
téléphonie graine 40004 (plafond nul, mais raisons « réguliers » et « progresse » : cause illisible).

- Console : file Lagune de 8 dossiers triable par risque (Hounkpè puis Yaba en tête), un dossier chez Baobab ;
  fiche : pastille « Au-dessus de la tolérance » et raisons du moteur (testé : `test_raisons_nomment_la_cause`, E2E).
- Commerçant : profil « Commerçant à risque » (Yaba Agossou) sur `/connexion` : plafond bas au regard de ses ventes,
  Conseils « Diversifiez les clients » et régularité, avertissement au dépôt au-dessus du plafond.
- Démo guidée : temps 6 « Sain ou à risque » (Edwige / Hounkpè côte à côte : risque, raisons, décision proposée).
- Tests adaptés : `demo.spec.ts`, `ecrans.spec.ts` (10 temps), `parcours.spec.ts` (« seule option ») ; test API :
  au moins un dossier au-dessus et un en dessous de la tolérance. Empreinte `data/demo/demo.json` : `f9d7c042…`
  (les 7 commerçants existants sont inchangés, mêmes graines).

## Mission console par objet (`docs/MISSION-CONSOLE.md`, branche `console`)

Retour du propriétaire : « trop de choses au même endroit », « les dossiers déjà traités, je vais les trouver où ? ».
Décision : ADR 0019 (console organisée par objet). Crédit progressif : retiré (ADR 0018), aucun palier nulle part.

- **Navigation** : Aujourd'hui (`/console`), Demandes (`/console/demandes`), Crédits (`/console/credits`),
  Recouvrement (`/console/recouvrement`), Commerçants (`/console/commercants`), Paramètres, Journal ; raccourcis 1–7
  sur toutes les pages ; `/console/portefeuille` redirige vers `/console/credits`.
- **Détails** : dossier à tout statut (bandeau de décision, réponse du commerçant, « Voir le crédit »), crédit
  (`/console/credits/[id]`, nouveau), commerçant (`/console/commercants/[id]`, nouveau, cette institution seulement) ;
  fil d'Ariane et liens croisés.
- **Routes nouvelles** (pour `attaque.py`), toutes filtrées par l'institution de la session, 404 hors périmètre,
  401 sans session ou en session commerçant, 403 pour l'admin, 422 sur paramètre invalide, taille de page ≤ 50 :
  - `GET /console/aujourdhui`
  - `GET /console/demandes` (onglet, q, statut, decision, tranche, hors_tolerance, alertes, du, au, tri, ordre, page, taille)
  - `GET /console/credits` (onglet, q, du, au, tri, ordre, page, taille)
  - `GET /console/credits/{id}`
  - `GET /console/retards` (q, page, taille)
  - `GET /console/relances` (commercant, q, du, au, page, taille)
  - `GET /console/commercants` (q, tri, ordre, page, taille)
  - `GET /console/commercants/{id}`
- **Démo** : 12 dossiers passés rejoués par le parcours normal (`HISTORIQUE_DEMO`), échéances payées selon le
  simulateur de remboursement `kwedo_gen.remboursement.rembourser` ; relances rejouées sur 30 jours. Lagune à
  l'ouverture : 6 à décider, 1 complément, 1 offre en attente (6 jours sans réponse), 9 traitées ; crédits 2 en
  cours, 1 en retard (Hounkpè, 70 j), 3 remboursés, 1 en défaut (Gildas, 189 j) ; 6 relances. Baobab : un crédit
  en cours (Séna), invisible de Lagune.
- **Preuves** : `npm run test:api` **38/38** (nouvelle classe `TestConsoleParObjet` : onglets remplis, pagination,
  validation 422, filtres et tris, cloisonnement de chaque nouvelle route, Aujourd'hui) ; `next build` OK ;
  E2E ciblés console : `console.spec.ts` 7/7 (Aujourd'hui, onglets, recherche, pagination serveur, bandeau →
  crédit → commerçant, redirection, cloisonnement, 360 px clair/sombre sans débordement, cartes), `demande`,
  `parcours`, `formule`, `demo` verts ; `qualite.spec.ts` console + fiche à 1440 px clair/sombre : 16/16
  (0 violation axe grave). Démo guidée : temps « Remboursement » pointe vers `/console/credits`.
- **Écarts** : réinitialisation de démo plus longue de quelques secondes (≈ 40 analyses moteur de plus ; délai des
  hooks E2E porté à 120 s). L'audit axe des deux nouvelles pages de détail a été ajouté à `qualite.spec.ts` mais
  **n'a pas pu tourner** : disque de la machine plein (387 Go, cause extérieure au projet). Listes calculées en
  Python avant pagination (suffisant au prototype, cf. ADR 0019).

## Mission données réelles de calage (`docs/MISSION-DONNEES.md`, branche `donnees`)

- **Profil « réalisme »** (`packages/generator/kwedo_gen/realisme.py`, nouveau) pour la démo seulement : `REALISME`
  (dynamique du réglage, archétypes aux parts Kiva Bénin), `demande_demo` (montant entre p10 et p90 Kiva du secteur à
  1 USD ≈ 555 FCFA, fréquence et durée Kiva bornées à 12 mois), `generer_population`. `reglage`/`test`, `ml/`,
  `packages/engine`, `docs/evaluation/runs` inchangés.
- **Démo régénérée** (`scripts/regenerer_demo.py`) : mêmes personnes et transactions, champ `demande_demo` et
  `calage` ; la file de la console dépose ces demandes (montant, fréquence, durée), sauf Hounkpè et Yaba (à risque).
- **Contrôle de niveau** (`scripts/controle_niveau.py`) : 19 dossiers de démo, 6 au-dessus de la tolérance (31,6 %),
  risque moyen 10,4 % ; population réalisme (300) : défaut simulé 0,3 % ; repère BCEAO Bénin 9,4 % (dégradation de
  portefeuille, autre mesure). Écart expliqué dans `docs/data/README.md`, rien réglé dessus.
- **Docs** : `docs/data/README.md` (inventaire, licences, attribution Kiva), ADR 0020 (Field & Pande),
  business plan (stratégie de données, contexte BCEAO), `docs/legal/sources-donnees.md`, rétrospective.
- **Preuves** : `npm run test:gen` 14/14 (3 nouveaux : réglage intact, parts Kiva, demandes dans les quantiles),
  `test:engine` 25/25 (non-régression Koffi intacte), `test:api` 38/38, build web OK. Pas d'E2E : aucun écran modifié.
- **Écarts** : composition des 9 personnes non alignée sur Kiva (6/2/1 contre 52/34/10 %, voir rétrospective) ;
  PaySim non appliqué aux flux (non pertinent pour des encaissements de commerçants) ; licence PaySim non vérifiée.
