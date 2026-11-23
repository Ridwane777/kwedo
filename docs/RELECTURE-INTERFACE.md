# Relecture de la refonte : corrections à faire

Reprends sur `~/kwedo-acces`, branche `cloisonnement`. Les règles et interdits de `docs/MISSION-INTERFACE.md` restent valables.
Les 40 E2E passent, mais les captures montrent des défauts qu'ils ne voient pas. Charge le skill `frontend-design`.

## Bloquants
1. **Mots collés dans tous les petits textes.** Exemples sur captures : « Unealertedemandeun examen », « Démosimulée »,
   « Exemplesimulé », « Maquettedel'écran », « Démarréetarrêtépar ». Trouve la cause (police, `text-rendering`, crénage, sous-ensemble,
   espaces de la police) et corrige-la globalement. Contrôle en zoomant sur des captures à 360 et 1440 px. Change de police de texte
   si elle en est la cause.
2. **Barre latérale de la console** : son fond s'arrête à la hauteur de l'écran sur une page longue (fiche de dossier).
3. **Raccourci « 3 »** : il sort de la barre latérale sur « Paramètres du moteur ».
4. **Nom de l'institution tronqué** (« Caisse Lagune Microfina… ») : il doit se lire en entier.
5. **« ← FileÉchap »** : libellé et raccourci collés.

## Fiche de décision : à repenser
C'est l'écran central côté prêteur et il reste un mur de chiffres en 3 colonnes, proche de l'ancienne version.
- Au premier écran à 1440 × 900, sans défiler : qui, montant proposé, risque, recommandation, alertes, ce qui a pesé, et la décision.
- Indicateurs détaillés, chaîne de calcul, modèles, chronomètre et journal d'accès passent en second niveau (onglets ou sections repliables),
  toujours accessibles au clavier et sans retirer aucune information.
- « Recommandation » est mal aligné. Les alertes doivent se voir avant le détail.
- Le texte « Cette hausse coïncide avec une alerte » reste visible près du montant concerné.

## Admin
- Journal : regrouper les événements identiques et consécutifs (« 6 consentements modifiés ») au lieu de les répéter.
- Institutions : éviter la carte orpheline, une liste ou un tableau compact convient mieux.

## Contrôle final
- Regarde **toutes** les captures fraîches, chaque rôle, 360 et 1440 px, y compris offre, crédit en cours avec échéancier, et les 9 temps de la démo
  après avoir joué leurs actions. Supprime d'abord les anciennes captures `.captures/q-*` et `.captures/ecrans-*`, qui mélangent les versions.
- Build, tests API et tous les E2E doivent passer.
- Dépose les captures finales dans `~/kwedo-ops/revue-interface/` (obligatoire, le dossier était vide), complète `docs/PROGRESS.md`,
  commite, `git push origin cloisonnement`, puis `touch /home/ridwane/kwedo-ops/DONE`.
