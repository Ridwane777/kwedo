# Licences des sources de données publiques — BROUILLON

> Brouillon non juriste. Inventaire technique complet : `docs/data/README.md`.

| Source | Conditions | Respect dans le dépôt |
|---|---|---|
| Kiva (export des prêts, miroir Kaggle 2018) | Kiva Developer Terms : usage **non commercial**, attribution « données issues de Kiva », **pas de redistribution des données brutes** | Seuls des **agrégats** (`docs/data/kiva-agregats.json` : parts et quantiles) sont versionnés ; aucune ligne de prêt, aucun nom d'emprunteur ; attribution affichée dans `docs/data/README.md` et dans `data/demo/demo.json` (champ `calage`). API Kiva fermée : aucun téléchargement ni aspiration |
| BCEAO (indicateurs des SFD 2024) | Publication institutionnelle | Chiffres cités avec la source |
| PaySim (EMSS 2016) | CC BY-SA 4.0 selon un miroir, **non vérifié** | Jeu non téléchargé ; seuls des ordres de grandeur publiés sont cités, avec les auteurs |
| Field & Pande | Article académique | Résultat cité avec la référence (ADR 0020) |

**Conséquence** : le prototype reste non commercial tant qu'il s'appuie sur les agrégats Kiva. Avant toute
exploitation commerciale : retirer le profil « réalisme » (ou obtenir l'accord de Kiva) et vérifier la licence PaySim
si elle devait être utilisée au-delà d'une citation.
