# ADR 0015 : fréquence et durée de remboursement au choix du commerçant

- Statut : accepté
- Date : 2026-11-24

## Contexte

Le remboursement était uniquement hebdomadaire, sur une durée fixée par l'institution (`n` semaines). Le propriétaire
a retenu l'option B : le commerçant choisit la **fréquence** et la **durée**, dans les limites de l'institution.
Le marché béninois va dans ce sens : la PNIF (lancée le 24/11/2026) laisse choisir le nombre d'échéances et
montre la mensualité exacte avant engagement ; le microcrédit Alafia III propose 6 ou 12 mois, avec remboursement
hebdomadaire ou mensuel (sources dans `docs/business/README.md`, section « Concurrence et positionnement »).

## Options envisagées

1. **Hebdomadaire seul (statu quo).** Seule fréquence évaluée. Mais trop contraignant pour beaucoup de commerces
   (encaissements irréguliers d'une semaine à l'autre, achats de stock au mois) et en décalage avec l'offre du marché.
2. **Durée seule au choix, toujours hebdomadaire.** Simple, risque toujours validé, mais ne répond pas à la demande
   principale (rembourser au mois).
3. **Fréquence + durée au choix (retenu).** Hebdomadaire, quinzaine ou mensuelle ; 3 à 12 mois ; chaque institution
   déclare ce qu'elle accepte.

## Décision

**Moteur** (`packages/engine`, modifié pour cette mission uniquement) :
- `Parametres.frequence` (`hebdomadaire` par défaut, `quinzaine`, `mensuelle`) et `Parametres.duree_mois` (3 à 12).
  Nombre d'échéances `n = arrondi(durée en semaines / semaines par période)` (52/12 semaines par mois).
- Capacité par période : `C_p` = même percentile prudent, mais sur les encaissements **agrégés à la période**
  (sommes glissantes de 2 semaines ; de 4 semaines ramenées à 52/12 semaines pour le mois) : « mauvais mois » au
  lieu de « mauvaise semaine ». Puis `R = C_p × m × s` et `L_max = R × (1 − (1+i_p)^−n) / i_p`, avec
  `i_p = (1+i)^w − 1`, taux équivalent par période.
- Test de résistance : les 2 000 avenirs restent simulés **à la semaine** ; le contrôle de remboursabilité se fait à
  chaque échéance (cumul disponible entre deux échéances), plus seulement chaque semaine.
- Risque : le modèle n'est **pas réentraîné**. Hors hebdomadaire, il est appliqué au montant équivalent (échéance
  et seuils simulés ramenés à la semaine, encaissement prudent hebdomadaire) et le résultat porte
  `risque_valide: false`. Le plafond reste borné par `L_max`.
- Hebdomadaire : résultats **identiques au bit près** (Koffi : 495 000 FCFA, risque 8,46 % ; 21 couples
  commerçant × institution de la démo comparés champ à champ), test de non-régression dans `test_moteur.py`.

**Institutions** : modalités versionnées avec les autres réglages (`parametres_moteur` : `frequences`,
`duree_min_mois`, `duree_max_mois`, `delai_versement_h`), éditables par le responsable dans la console, visibles par
le commerçant pour l'institution choisie (dans la réponse d'estimation), jamais par l'admin général (ADR 0009).
Démo : Lagune semaine ou mois, 3–12 mois, 48 h ; Baobab mois seulement, 6–12 mois, 72 h ; Mutuelle semaine ou
quinzaine, 3–6 mois, 24 h.

**Parcours** : choix fréquence + durée dans l'estimation, le simulateur et le dépôt du dossier ; l'échéance exacte
(« 41 500 FCFA chaque mois pendant 6 mois »), le nombre d'échéances et le coût total se recalculent ; l'accord de
consultation est signé par **code SMS simulé** (affiché à l'écran en démo, empreinte seule en base, 10 minutes,
usage unique, 5 essais, chaque essai tracé au journal) ; l'agent voit les modalités demandées et peut les ajuster
dans les limites de l'institution ; échéancier et rappels suivent la fréquence (rappel 2, 3 ou 5 jours avant).

## Conséquences

- Gagné : un crédit qui suit le rythme du commerce ; l'échéance exacte avant tout engagement ; des offres
  comparables à celles du marché ; l'institution garde la main sur ce qu'elle accepte.
- Perdu : la garantie d'évaluation. **Le risque n'a été validé que pour l'hebdomadaire** (`docs/evaluation/`) ;
  hors hebdomadaire c'est une estimation prudente, signalée au commerçant (« moins éprouvée que le remboursement
  hebdomadaire ») et à l'agent. Pour la valider : générer des défauts simulés à la quinzaine et au mois, réentraîner
  et recalibrer, puis rejouer le protocole d'évaluation.
- Limite de méthode : sommes glissantes (pas de mois calendaires) et 52/12 semaines par mois ; échéances mensuelles
  tous les ≈ 30,3 jours, pas à date fixe.
- Contrat : `GET /estimation` accepte `frequence` et `duree_mois` ; `POST /dossiers` aussi ; `POST /decisions`
  accepte `frequence` et `duree_mois` ; nouvelle route `POST /commercants/{id}/code-sms` ; `POST .../consentements`
  avec `action: accorde` exige désormais `code`. Listés dans `docs/PROGRESS.md` pour le test de contournement.
