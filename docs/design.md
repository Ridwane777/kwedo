# Système de design : « comptoir »

Remplace « le registre vivant » (ADR 0010). Guide vivant : `/design` dans l'application web.

## Intention

Kwedo doit avoir l'air d'un produit en service, auquel on confie son argent. Trois principes :

1. **Le prix d'abord.** L'écran commerçant répond en un regard à « combien, à quel prix, que faire » : plafond,
   échéance, durée, coût total, puis un seul bouton principal (« Envoyer mon dossier »).
2. **L'exception d'abord.** La console et l'admin montrent ce qui demande une action (dossiers à décider, alertes,
   accords retirés, institutions avec dossiers en attente) avant le reste.
3. **La couleur porte un sens.** Un seul vert de marque pour l'action et les montants ; ambre = à vérifier,
   rouge = retard, refus ou action destructrice, vert feuille = validé, à jour. Tout le reste est neutre.

Pistes de recherche suivies (voir `docs/MISSION-INTERFACE.md`) : promesse simple et frais annoncés, résumé des
conditions avant l'accord, coût total visible tôt, interface légère sur téléphone modeste ; console dense avec file
de travail, fiche de décision au clavier, ton calme. Aucun écran, logo ni couleur d'une marque n'est repris.

## Tokens (`apps/web/app/globals.css`)

| Token | Clair | Sombre | Rôle |
|---|---|---|---|
| `fond` | #f2f4f3 | #0c1613 | fond minéral froid |
| `surface` | #ffffff | #13201c | cartes, tableaux |
| `surface-2/3`, `trait` | #e7ecea / #d9e0dd / #c9d2ce | #1a2925 / #23352f / #2e423b | survol, chargement, filets |
| `encre`, `encre-2`, `encre-3` | #0e1d18 / #3b4a44 / #56645e | #e8efec / #b5c3bd / #93a39c | texte |
| `marque` (+ `-doux`) | #0a5a47 | #6fd0ae | action principale, montants, élément actif |
| `bon` (+ `-doux`) | #1d6b35 | #87d49a | payé, à jour, validé |
| `ambre` (+ `-encre`, `-doux`) | #c98a0b | #e9b54a | à vérifier ; `ambre` jamais en texte |
| `alerte` (+ `-doux`) | #b0261c | #ff9a8f | retard, refus, destruction |

Le mode sombre suit `prefers-color-scheme` avec les mêmes rôles.

### Contrastes (WCAG 2.1, `node scripts/contrastes.mjs`)

| Paire | Clair | Sombre |
|---|---|---|
| encre / fond | 15,74 | 15,78 |
| encre-2 / fond | 8,45 | 10,09 |
| encre-3 / fond | 5,62 | 6,98 |
| encre-3 / surface-2 | 5,20 | 5,74 |
| marque / fond (et texte fond sur bouton marque) | 7,41 | 9,92 |
| marque / marque-doux | 6,58 | 7,14 |
| alerte / alerte-doux | 5,26 | 7,67 |
| bon / bon-doux | 5,38 | 7,91 |
| ambre-encre / ambre-doux | 7,18 | 9,48 |

## Typographie

- **Bricolage Grotesque** (titres et montants, largeur resserrée `wdth` 85–92) : une grotesque à caractère, qui
  donne aux montants leur poids sans effet décoratif.
- **Public Sans** (interface) : lisible en petit corps, chiffres tabulaires partout (`.chiffres`).
  Elle remplace Instrument Sans, dont l'espace de mot ne mesure que 0,17 em : à 12 px, 2 px seulement, ce qui collait
  les mots des petits textes (« Démosimulée »). Mesure : avec Public Sans, « a b » fait 18 px contre 15 px pour « ab » à 12 px.
- Contrôle : zoomer sur les captures à 360 et 1440 px (`e2e/ecrans.spec.ts`) avant toute nouvelle police.
- Pas de capitales espacées pour les étiquettes ni d'en-têtes de tableau en capitales.

## Composants (`apps/web/components/ui.tsx`)

- `Bouton` / `LienBouton` : 44 px de haut minimum, 56 px en `grand` (parcours commerçant).
- `Pastille` : point de couleur + libellé ; le sens n'est jamais porté par la couleur seule.
- `Simule` : étiquette discrète (point ambre, fond surface) ; toujours présente, jamais criarde.
- `Chargement`, `Vide`, `Erreur` : états soignés ; l'erreur dit quoi faire (réessayer, vérifier le serveur).
- `Marque` : « K » d'une barre et de deux traits de flux dans un carré arrondi, dessiné pour le projet ;
  variante `inverse` sur fond de marque.

## Mise en page par rôle

- **Commerçant** (360 px d'abord) : carte « combien / à quel prix / que faire », puis courbe, raisons, simulateur.
  Barre d'onglets en bas, cibles de 64 px, indicateur actif en pastille.
- **Console** : barre latérale claire (institution et rôle visibles), raccourcis 1–4 ; file avec compteurs
  d'exception, segmenté « À traiter / Tous », lignes à alertes marquées d'un liseré ambre sur téléphone.
- **Admin** : en-tête propre au rôle, chiffres de volume, institutions triées par dossiers en attente,
  activité récente sans données nominatives, commandes de démo avec confirmation avant réinitialisation.
- **Connexion** : panneau de marque à gauche sur grand écran, profils groupés par institution ; « Profils fictifs »
  et l'absence de mot de passe sont dits clairement.

## Mouvement

Une seule apparition (le montant), tracé de la courbe, transitions courtes sur action. Tout est coupé sous
`prefers-reduced-motion`.

## Interdits

Dégradés décoratifs, cartes dans des cartes, capitales espacées, couleur sans sens, chiffres ou partenaires
inventés, texte qui décrit l'interface au lieu de guider.
