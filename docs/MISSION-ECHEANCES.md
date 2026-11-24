# Mission échéances (branche `echeances`)

Décision du propriétaire (option B) : le commerçant choisit la **fréquence** et la **durée** de remboursement ; le remboursement uniquement hebdomadaire est trop contraignant.
Contexte terrain (recherche du 24 nov. 2026, à citer dans les docs avec ses sources) :
- PNIF (pnif.bj, lancée le 24/11/2026) : 14 IMF partenaires ; plafond fixé à la main en agence par l'IMF ; connexion NPI + code SMS ; le client choisit montant et **nombre d'échéances**, voit la **mensualité exacte** avant de s'engager ; signature par **code SMS** ; versement sous **48 h** sur Mobile Money ou banque ; 0 FCFA de frais de dossier ; droit de rétractation. Sources : lameteo.info, triomphemag.bj, beninwebtv.bj (articles du 24/11/2026). Le site pnif.bj n'a pas pu être lu (certificat invalide) : le dire.
- Microcrédit Alafia III (FNM, oct. 2025) : 100 001 à 200 000 FCFA ; **6 ou 12 mois** ; 4 % (6 mois) / 8 % (12 mois) ; remboursement **hebdomadaire ou mensuel** via *815#. Sources : fnm.bj, kafoweb.com, banouto.bj. Conditions datées d'octobre 2025, à recontrôler.

## 1. Moteur (`packages/engine`, autorisé pour cette mission uniquement)
- Paramètre de fréquence : `hebdomadaire` (actuel, défaut), `quinzaine`, `mensuelle`. Durée exprimée en mois (3 à 12), convertie en nombre d'échéances.
- Capacité par période : à partir des encaissements agrégés à la période choisie (ex. « mauvais mois » au lieu de « mauvaise semaine », même percentile prudent), puis `R = C_p × m × s` et `L_max = R × (1 − (1+i)^−n) / i` avec le taux par période et n échéances.
- Test de résistance : les 2 000 scénarios restent simulés à la semaine, mais le contrôle de remboursabilité se fait à chaque échéance de la fréquence choisie (cumul entre deux échéances).
- Le modèle de risque n'a été entraîné et évalué que sur des échéances hebdomadaires : ne pas le réentraîner ; pour les autres fréquences, réutiliser le risque calibré en l'appliquant au montant équivalent et marquer le résultat `risque_valide: false`.
- Le cas hebdomadaire doit donner EXACTEMENT les résultats actuels (Koffi : 495 000 FCFA, risque 8,5 %) : test de non-régression obligatoire. Tests unitaires pour quinzaine et mensuel (montants cohérents, déterministes par graine, plafond mensuel jamais au-dessus de L_max).
- Ne PAS modifier `docs/evaluation/runs` ni les résultats publiés.

## 2. Institutions (réglages)
- Chaque institution déclare les fréquences acceptées et une durée min/max (en mois), plus un délai de versement annoncé (ex. 48 h). Valeurs de démo différentes selon l'institution (ex. Lagune : semaine et mois, 3–12 mois ; Baobab : mois seulement, 6–12 mois ; Mutuelle : semaine et quinzaine, 3–6 mois).
- Éditables par le responsable dans la console Paramètres, versionnées comme les autres réglages, invisibles pour l'admin général (ADR 0009).

## 3. Commerçant
- Estimation et Simuler : choix fréquence + durée (seulement les options de l'institution choisie) ; le plafond, l'**échéance exacte** (« 41 500 FCFA chaque mois pendant 6 mois »), le coût total et le nombre d'échéances se recalculent. Si `risque_valide` est faux, une mention discrète : « estimation prudente, moins éprouvée que le remboursement hebdomadaire ».
- Dossier (parcours simplifié de la mission précédente) : la confirmation reprend institution, montant, fréquence, durée, échéance exacte, coût total, délai de versement annoncé ; l'accord se fait par **code SMS simulé** (code affiché à l'écran dans la démo, saisi par l'utilisateur, tracé au journal), à la place de la simple case.
- Offre et Crédit : échéancier à la fréquence choisie ; rappels à la bonne fréquence.
- Console agent : la fiche montre la fréquence et la durée demandées ; l'agent peut les ajuster dans les limites de l'institution.

## 4. Documentation
- ADR suivant libre (0015 si 0014 est pris par les conseils) : fréquence et durée au choix ; options envisagées (hebdo seul, durée seule, fréquence + durée), décision, gagné/perdu, et la limite : risque non validé hors hebdomadaire. Ne réécrire aucun ADR.
- `docs/evaluation/` : une note séparée disant que l'évaluation publiée ne couvre que l'hebdomadaire.
- `docs/business/` : section concurrence/positionnement face à PNIF et Alafia (Kwedo fournit à l'IMF partenaire un plafond justifié par les flux réels, là où PNIF le fixe en agence), avec les sources ci-dessus.
- `docs/PROGRESS.md`, `docs/design.md` si utile.

## Règles
- Ne pas modifier `ml/` ni `docs/evaluation/runs`. Pas d'affaiblissement de tests ; adapter seulement ceux dont le comportement change volontairement.
- Aucune mention d'IA ou de Claude dans les commits.
- Si une route d'API est ajoutée ou change de règle d'accès, la lister dans PROGRESS (j'ajoute le contrôle à `attaque.py`).
- Avant de finir : `npm run test:engine`, `npm run test:api`, build, tests E2E ciblés sur les écrans modifiés seulement (un fichier e2e à la fois), PAS la suite complète : le propriétaire vérifie à la main ; captures `.captures/revue-echeances/` (estimation, simulateur, dossier/confirmation, crédit, console fiche, paramètres ; clair/sombre ; 360/1440).
- Commits poussés sur `origin echeances`, puis `touch ~/kwedo-ops/DONE`. Blocage : raison dans `~/kwedo-ops/BLOCKED`.

## 5. Envoi du dossier simplifié (non fait dans la mission conseils, à faire ici en premier)
Retour : « les options de qui peut voir ou pas je trouve que ce n est pas utile, à la limite juste un bouton déposer mon dossier de crédit et il choisit l institution puis il envoie c est plus simple ».
- `apps/web/app/app/dossier/page.tsx` : supprimer le bloc « Qui peut voir mon dossier » avec ses interrupteurs par institution.
- Un seul bouton principal « Déposer mon dossier de crédit » qui ouvre : choix de l institution (liste) → confirmation (montant, échéance, institution, case obligatoire « J accepte que <institution> consulte mon dossier de crédit », non cochée par défaut) → Envoyer. Le consentement reste obligatoire et tracé (exigence légale, docs/legal), mais il est donné dans l envoi, pour cette seule institution, en réutilisant les routes existantes de consentement puis d envoi.
- Le « Suivi » des demandes reste sous le bouton.
- Le retrait d un accord reste possible mais déplacé discrètement dans « Mon compte marchand » (liste des institutions qui ont reçu le dossier, bouton Retirer avec la même phrase sur l historique d un crédit en cours).
- Le bouton « Envoyer mon dossier » de l Estimation et des Conseils mène à ce parcours.
- Adapter les E2E du parcours (ne pas les affaiblir : le consentement doit toujours être vérifié avant envoi) et `docs/legal/` si le texte du consentement y est cité.
