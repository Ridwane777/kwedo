# ADR 0017 : demande libre du commerçant, décision de l'institution par le risque

- Statut : accepté
- Date : 2026-11-24

## Contexte

Jusqu'ici, le dossier portait le plafond calculé par le moteur : le commerçant ne choisissait pas le montant, et
l'agent validait ou ajustait ce plafond. Demande du propriétaire : le commerçant met la somme qu'il veut et une
raison ; côté institution, la décision se centre sur le risque. Retour complémentaire : un « plafond » n'a de sens
qu'avec sa fréquence, sa durée et l'institution, et il monte quand la durée s'allonge.

## Décision

- **Dossier** : `montant_demande` (5 000 à 50 000 000 FCFA, borne anti-faute de frappe), `objet_categorie`
  (`stock`, `equipement`, `fonds_roulement`, `ponctuel`, `autre`) et `objet_texte` (une phrase, 200 caractères au
  plus), validés côté serveur (migration `0005_demande.sql`). Une demande au-dessus du plafond est **autorisée** :
  l'interface avertit sans bloquer.
- **Moteur** : aucun changement de modèle. `analyser(..., montant_souhaite=)` calculait déjà le risque calibré v3
  pour un montant ; l'analyse du dossier est faite une seule fois avec le montant demandé (rejouable : `rejouer`
  repasse le montant). Nouvelle fonction `raisons_demande` : échéance demandée rapportée à une mauvaise période
  (« représente 70 % d'une mauvaise semaine »), écart au plafond prudent. Aucune valeur de réglage n'y figure.
- **Console** : en tête, montant demandé, objet, modalités, **risque de défaut pour cette demande** et indicateur
  dans / au-dessus de la tolérance (`seuil_risque` de l'institution). Le plafond prudent et son risque passent en
  repère. Décisions : **Accorder** (type `valide`, montant demandé aux modalités demandées), **Contre-proposer**
  (type `ajuste` : montant ≤ montant demandé, fréquence et durée dans les modalités, risque recalculé à chaque
  changement par `GET /dossiers/{id}/risque`), **Refuser**, complément ; motif obligatoire, risque des termes décidés
  enregistré dans `decisions.risque` (journal en ajout seul). La file affiche montant demandé et risque, triable par
  risque.
- **Garde-fou de la formule** : une contre-proposition ne dépasse jamais le montant demandé ; elle peut dépasser le
  plafond de la formule seulement si le commerçant a demandé plus. Accorder une demande au-dessus du plafond est une
  décision humaine, motivée et tracée, éclairée par un risque chiffré.
- **Offre** : le commerçant voit s'il s'agit de sa demande acceptée ou d'une contre-proposition, avec l'écart.
- **Plafond toujours conditionné** : « Jusqu'à X FCFA, remboursés chaque semaine pendant 6 mois, aux conditions de
  Caisse Lagune », définition accessible au toucher et au survol, tableau « plafond selon la durée » (3, 6, 9, 12
  mois dans les modalités, `GET /commercants/{id}/plafonds`). Conseils calculés pour la fréquence et la durée
  affichées en haut de page.

## Conséquences

- Le commerçant ne voit toujours ni le risque ni le seuil (testé) ; l'admin général ne voit ni objet ni montant
  (journal expurgé, testé ; ADR 0009).
- L'objet du crédit est une donnée nouvelle : collectée pour la décision seulement, catégorie fermée + une phrase
  courte (minimisation), voir `docs/legal/confidentialite.md`.
- Coût : chaque ouverture de fiche relance une analyse courte (≈ 50 ms, sans raisons) ; le tableau selon la durée
  en lance quatre.
