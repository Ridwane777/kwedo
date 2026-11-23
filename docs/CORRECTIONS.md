# Kwedo : passe de correction

Lire d'abord `docs/BRIEF.md`, `docs/PROGRESS.md`, `docs/DEFINITION-DE-TERMINE.md`, `docs/evaluation/README.md`.
Toutes les règles du brief restent valables (machine partagée, ports, Git sans mention d'IA, push à chaque étape).
`pip install` est désormais autorisé, uniquement dans `~/kwedo/.venv`.

## Corrections, dans l'ordre

C1. **Stack.** Installer les dépendances dans `.venv`, épinglées. Migrer l'API vers FastAPI sans changer le contrat.
    Nouvel ADR qui remplace ADR 0004.
C2. **Modèles.** Passer le défaut et la prévision à LightGBM (ou scikit-learn si meilleur), au plus 4 threads, `nice -n 10`.
    Comparer à la version NumPy. Nouvel ADR qui remplace ADR 0003. La formule reste le garde-fou du plafond.
C3. **Calibration du risque.** Corriger la sous-estimation de 13 points : chercher la cause dans la simulation, puis
    calibrer (isotonique ou Platt) sur une partition dédiée du générateur de réglage.
C4. **Décision.** Améliorer le moteur pour battre les règles naïves à exposition égale, sans dépasser `L_max`,
    sans variable sensible, avec des raisons toujours fidèles au calcul.
C5. **Temps de traitement.** Ajouter à la console un chronomètre de dossier, avec export. Ne jamais inventer de mesure :
    tant qu'aucun humain n'a chronométré, le résultat reste « non mesuré ». Ce point ne bloque pas la fin.
C6. **Mise à jour.** Évaluation, performance, Définition de terminé, rétrospective, README et `docs/PROGRESS.md`.

## Critères de réussite, figés

Les écrire dans `docs/evaluation/protocole-final.md` et les committer AVANT le premier run final.

1. Sur le générateur de test et les archétypes hors réglage, à exposition égale, la part d'échéances manquées du moteur est
   inférieure à celle de CHACUNE des deux règles naïves.
2. L'intervalle de confiance bootstrap à 95 % de la différence appariée exclut zéro, pour chaque règle, sur au moins
   10 graines jamais utilisées pendant le développement.
3. Erreur de calibration (ECE, 10 classes) au plus 0,05 sur ces mêmes données, et écart moyen risque annoncé/observé au plus 5 points.
4. Détection : au moins 90 % des cas injectés, au plus 10 % de fausses alertes. Stabilité, fidélité des raisons et équité restent OK.
5. Tous les tests unitaires et E2E passent, `next build` passe, 0 violation axe grave ou critique.

## Intégrité de l'évaluation

- Interdit : modifier un seuil, une métrique, une règle naïve, le générateur de test ou les graines finales pour faire passer un critère.
- Interdit : régler quoi que ce soit sur les données finales. Tout réglage se fait sur le générateur de réglage.
- Les graines finales sont choisies et committées avant le run, et chaque run final est conservé dans `docs/evaluation/runs/`,
  y compris les échecs.
- Si un run final échoue, le nombre d'essais augmente et doit être publié. Pour réessayer, améliorer le moteur sur le réglage
  et utiliser un NOUVEAU jeu de graines finales. Au plus 3 runs finaux.
- Les résultats restent annoncés comme obtenus sur données simulées.

## Fin

- Tous les critères atteints et poussés : créer `~/kwedo-ops/DONE`.
- Échec après 3 runs finaux, ou blocage réel : documenter honnêtement, pousser, puis créer `~/kwedo-ops/BLOCKED` avec la raison.
