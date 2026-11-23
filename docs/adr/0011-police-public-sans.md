# ADR 0011 : Public Sans comme police d'interface

- Statut : accepté (remplace le choix de police d'interface de l'ADR 0010)
- Date : 2026-11-23

## Contexte

Avec Instrument Sans (ADR 0010), les mots se collaient dans tous les petits textes (« Démosimulée »,
« Unealertedemandeun examen »). Mesure dans Chromium : à 12 px, « a b » faisait 16 px contre 14 px pour « ab » ;
l'espace de mot ne valait que 0,17 em, soit 2 px, ramenés à presque rien par l'arrondi des pixels.

## Options

1. Garder Instrument Sans et élargir l'espace (`word-spacing`) : correctif global fragile, qui change le gris
   typographique des titres et des tableaux et ne règle pas les composants tiers.
2. Garder Instrument Sans au-dessus d'une taille minimale : interdit les étiquettes de 11–12 px dont la console a besoin.
3. Changer de police de texte pour une grotesque à espacement normal et chiffres tabulaires : Public Sans.

## Décision

Option 3 : Public Sans via `next/font`, sans nouvelle dépendance. Bricolage Grotesque reste pour les titres et
les montants. Mesure après changement : à 12 px, « a b » fait 18 px contre 15 px pour « ab ».

## Gagné / perdu

- Gagné : petits textes lisibles à 360 et 1440 px, chiffres tabulaires conservés, aucun réglage par composant.
- Perdu : un peu de caractère par rapport à Instrument Sans ; Public Sans est plus neutre. La personnalité repose
  désormais davantage sur Bricolage Grotesque.
