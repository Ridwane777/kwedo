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
