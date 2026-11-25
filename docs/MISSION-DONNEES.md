# Mission données réelles de calage (branche `donnees`)

Décision du propriétaire : rendre le prototype plus réaliste avec des sources publiques, **sans entraîner ni évaluer aucun modèle dessus** (aucune ne contient de remboursements de commerçants reliés à leurs ventes). La vraie collecte se fera au pilote. Usage actuel : prototype non commercial.

## Sources (recherche du 25/11/2026, déjà vérifiée)
1. **BCEAO** : taux brut de dégradation du portefeuille des SFD du Bénin **9,4 %** au 31/12/2024 (53 SFD, 20 dans l'échantillon) ; UMOA 8,9 %, norme ≤ 3 %. Sources : « Principaux indicateurs des SFD au 31 décembre 2024 » (bceao.int/sites/default/files/inline-files/Principaux%20indicateurs%20des%20SFD%20au%2031%20d%C3%A9cembre%202024.pdf) et « Note sur la situation de la microfinance à fin décembre 2024 » (ns2.bceao.int/sites/default/files/2025-04/…). C'est une dégradation de portefeuille, PAS un taux de défaut par prêt : l'expliquer.
2. **Kiva** : agrégats fournis dans `docs/data/kiva-agregats.json` (copié par moi ; 122 274 prêts financés d'Afrique de l'Ouest dont 5 858 au Bénin ; parts par secteur, activité, fréquence, durée ; quantiles de montant en USD et de durée par secteur). **Pas de défaut dans ces données** (le champ `status` ne décrit que la collecte ; API Kiva fermée, 403). Licence : Kiva Developer Terms, non commercial, attribution « données issues de Kiva », pas de redistribution des données brutes (seuls ces agrégats sont dans le dépôt). Ne pas chercher à télécharger ni aspirer Kiva.
3. **PaySim** (Lopez-Rojas, Elmir, Axelsson, EMSS 2016) : simulateur de transactions mobile money calé sur un mois de journaux réels d'un opérateur africain ; ~6,3 M transactions, fraude 0,13 % ; licence CC BY-SA 4.0 selon un miroir, à vérifier. Utiliser seulement les ordres de grandeur **publiés** (article, page du jeu) ; ne pas télécharger le jeu sur le VPS (disque à 97 %).
4. **Field & Pande** (Inde, essai randomisé) : remboursement hebdomadaire contre mensuel, **aucun effet significatif sur les retards ni les défauts** (users.nber.org/~rdehejia/!@$DRM/Lecture%2005/supplemental/pande_field.pdf). Preuve externe pour l'ADR 0015.

## À faire
1. **Profil « réalisme » du générateur, à côté des existants** : ne PAS modifier les générateurs `reglage` et `test` utilisés par l'évaluation (les runs publiés doivent rester reproductibles). Créer un profil/version distinct utilisé **seulement pour les données de démo** :
   - parts d'activités et durées/fréquences proposées alignées sur les agrégats Kiva Bénin (commerce ~48 %, alimentation ~34 %, services ~10 %…) ; montants des demandes de démo à l'échelle des quantiles Kiva (convertis en FCFA avec un taux documenté et daté) ;
   - rythme et montants des transactions mobile money cohérents avec les ordres de grandeur publiés de PaySim quand c'est pertinent, sinon le dire.
   - Régénérer les données de démo avec ce profil ; garder les profils sains / limite / à risque (leur risque reste calculé par le moteur).
2. **Contrôle de niveau** : comparer la part de dossiers de démo au-dessus de la tolérance et le défaut simulé moyen avec le repère BCEAO 9,4 % ; écrire l'écart et pourquoi ce n'est pas la même mesure. Ne pas « régler » le modèle sur ce chiffre.
3. **Documentation**
   - `docs/data/README.md` : inventaire des sources cherchées (utilisables ou non) avec licence, contenu, raison : BCEAO, Kiva, PaySim, Field & Pande ; non utilisables : Zindi African Credit Scoring (données privées, usage limité à la compétition), API Kiva (fermée), essais IPA hors Afrique de l'Ouest (Mexique CC0, Maroc, Philippines), jeux synthétiques Hugging Face, études de scoring par téléphone (données non publiées). Attribution Kiva visible.
   - ADR 0015 : ne pas réécrire ; ajouter un ADR suivant libre ou une note « preuve externe » qui cite Field & Pande.
   - Business plan : stratégie de données (prototype sur sources publiques et simulation → pilote avec collecte réelle → partenariats), chiffres BCEAO en contexte de marché (risque de portefeuille au Bénin).
   - Légal (`docs/legal/`) : licences des sources, interdiction de redistribution Kiva respectée.
   - Rétrospective : ce que la recherche de données a montré ; `docs/PROGRESS.md`.

## Règles
- Ne pas modifier `ml/`, `packages/engine`, `docs/evaluation/runs`, ni les générateurs `reglage`/`test`. Aucune mention d'IA ou de Claude dans les commits.
- `npm run test:gen`, `npm run test:engine`, `npm run test:api`, build ; E2E ciblés seulement si des écrans changent.
- Pousser avec exactement `git push origin donnees`. Puis `touch ~/kwedo-ops/DONE`. Blocage : raison dans `~/kwedo-ops/BLOCKED`.
