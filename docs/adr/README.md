# Index des ADR

| # | Titre | Statut |
|---|---|---|
| [0001](0001-stack-monorepo.md) | Stack et monorepo | accepté |
| [0002](0002-moteur-simulation.md) | Moteur : simulation par blocs, graine, backend | accepté |
| [0003](0003-modeles-numpy.md) | Modèles en NumPy pur | accepté |
| [0004](0004-api-bibliotheque-standard.md) | API sur la bibliothèque standard | remplacé par 0006 |
| [0005](0005-modulation-modele-defaut.md) | Le modèle de défaut peut baisser le plafond, jamais le monter | accepté |
| [0006](0006-api-fastapi.md) | API sur FastAPI | accepté |
| [0007](0007-modeles-lightgbm.md) | Modèles de défaut et de prévision sur LightGBM | accepté (remplace 0003) |
| [0008](0008-decision-risque-calibre.md) | Plafond fixé par le risque calibré, sous la formule | accepté (remplace la modulation de 0005) |
| [0009](0009-comptes-roles-cloisonnement.md) | Profils de démonstration, rôles et cloisonnement des institutions (pas d'authentification) | accepté |
| [0010](0010-systeme-design-comptoir.md) | Système de design « comptoir » à la place du « registre vivant » | accepté (police d'interface remplacée par 0011) |
| [0011](0011-police-public-sans.md) | Public Sans comme police d'interface | accepté |
| [0012](0012-marque-cauri-vitrine.md) | Marque cauri, vitrine pleine largeur, mode sombre graphite | accepté (remplace la marque et le sombre de 0010) |
| [0013](0013-double-mode-lancement.md) | Double mode de lancement : npm sur le VPS, Docker pour la démo et l'évaluation | accepté |
| [0014](0014-conseils-chiffres.md) | Conseils chiffrés par le moteur sur scénarios, route `GET /commercants/{id}/conseils` | accepté |
| [0015](0015-frequence-duree-au-choix.md) | Fréquence (semaine, quinzaine, mois) et durée (3 à 12 mois) au choix ; risque non validé hors hebdomadaire | accepté (limite levée par 0016) |
| [0016](0016-risque-toutes-frequences.md) | Risque appris, calibré et évalué pour chaque fréquence et durée (modèle v3) | accepté |
| [0017](0017-demande-libre-decision-par-le-risque.md) | Montant demandé librement avec son objet ; décision de l'institution sur le risque de la demande ; plafond toujours conditionné | accepté |
| [0018](0018-credit-progressif.md) | Crédit progressif : palier par institution (versionné) au-dessus du plafond prudent, dérivé des crédits remboursés ; efficacité non mesurée | retiré (2026-11-24) |
| [0019](0019-console-par-objet.md) | Console organisée par objet : Aujourd'hui, Demandes, Crédits, Recouvrement, Commerçants ; listes paginées côté serveur ; historique de démo par le simulateur | accepté |
