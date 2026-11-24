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
| `fond` | #f2f4f3 | #141312 | fond (sombre : graphite neutre légèrement chaud, sans teinte verte) |
| `surface` | #ffffff | #1c1b19 | cartes, tableaux |
| `surface-2/3`, `trait` | #e7ecea / #d9e0dd / #c9d2ce | #252422 / #2f2d2a / #3b3936 | survol, chargement, filets |
| `encre`, `encre-2`, `encre-3` | #0e1d18 / #3b4a44 / #56645e | #ecebe7 / #c2beb7 / #a29d95 | texte |
| `marque` (+ `-doux`) | #0a5a47 | #8db3a4 / #263330 | liens, élément actif, petits signaux |
| `action` / `sur-action` | #0a5a47 / #f2f4f3 | #3c5f53 / #f1efea | bouton principal (sobre en sombre) |
| `montant` | #0a5a47 | #ecebe7 | gros montants (texte clair neutre en sombre) |
| `bon` (+ `-doux`) | #1d6b35 | #9ec4a6 | payé, à jour, validé |
| `ambre` (+ `-encre`, `-doux`) | #c98a0b | #cfa55a | à vérifier ; `ambre` jamais en texte |
| `alerte` (+ `-doux`) | #b0261c | #e3a197 | retard, refus, destruction |
| `logo-barre` / `logo-cauri` | #0e1d18 / #0a5a47 | #ecebe7 / #d4c6a1 | marque cauri-K |
| `scene` / `sur-scene` | #0a5a47 / #f2f4f3 | #1f1e1c / #ecebe7 | panneau de marque de la connexion |
| `cadre` | #0e1d18 | #3b3936 | bord des téléphones (démo, accueil) |

Mode sombre (ADR 0012) : la profondeur vient de la clarté des surfaces, pas des ombres ; pas de grand aplat vert ;
l'accent est réservé à une action par écran et aux petits signaux. Les blocs sombres de `globals.css` sont écrits
par `node scripts/theme-sombre.mjs apps/web/app/globals.css` à partir d'une seule liste. Contrastes mesurés sur
**chaque niveau de surface**, dans les deux thèmes : `node scripts/contrastes.mjs --strict`.

## Marque : le cauri-K (ADR 0012)

En fon, *akwɛ́* signifie à la fois « cauri » et « argent ». Barre et jambe d'un K à l'encre, bras supérieur en cauri :
coquille ovale bombée, ouverture fine et légèrement courbe d'une pointe à l'autre, petites dents courtes et
régulières creusées sur ses deux lèvres, encoches aux deux extrémités. Aucune hachure en travers (qui évoquerait des
lacets de ballon). Sous 24 px, version simplifiée : coquille et trait d'ouverture. La géométrie est calculée par
`node scripts/geometrie-cauri.mjs` puis reportée dans `components/motif.tsx` et `app/icon.svg`. Pistes comparées sur `/design`. Composants : `Marque`, `Cauri` (couleur ou `mono`),
`PileCauris` (une pièce par part remboursée), `CauriChargement`. Fichiers : `app/icon.svg` (suit le thème du
système), `app/apple-icon.tsx`, `app/opengraph-image.tsx`, `app/manifest.ts`. Ni récit historique, ni visuel
rituel ; l'étymologie de « Kwedo » n'est pas revendiquée.

## Mise en page pleine largeur

Gouttières fluides `.gouttiere` (`clamp(1.25rem, 4.5vw, 5rem)`) ; grilles qui se réorganisent ; seules les lignes de
texte sont limitées (60 à 70 caractères). Contrôle à 360, 768, 1440 et 1920 px, clair et sombre :
`e2e/vitrine.spec.ts`, captures dans `.captures/revue-vitrine/`.

## Courbes

`CourbeFlux` mesure sa largeur (ResizeObserver) et dessine à l'échelle 1 : mois et valeurs restent à 12 px de 360 à
1920 px, et la hauteur suit la largeur dans une plage lisible (140 px au minimum).

## Animations

CSS seulement, `transform` et `opacity` : `.trace` (courbe), `.compteur` (montant compté via `@property`), `.defile`
(écrans du téléphone en fondu), `.cauri-empile`, `.cauri-flotte`, `.revele` et `.fil-progres` (au défilement, sous
`@supports (animation-timeline: view())`, donc absentes sans prise en charge et le contenu reste visible).
Tout est coupé sous `prefers-reduced-motion`. Console et admin : micro-interactions seulement.

## Thème clair, sombre, système

- Trois choix : **Clair, Sombre, Système** (défaut). Le thème est porté par `data-theme` sur `<html>` ;
  `globals.css` définit les jetons clairs sur `:root`, les sombres sur `[data-theme="dark"]` et, pour « Système »,
  dans `@media (prefers-color-scheme: dark)`. « Système » suit donc le téléphone en direct, sans JavaScript.
- Le choix est mémorisé dans `localStorage` (`kwedo-theme`, lecture et écriture sous try/catch) et appliqué par un
  script en ligne dans `<head>` (`lib/theme-script.ts`) avant le premier rendu : pas de flash, pas d'erreur
  d'hydratation (`suppressHydrationWarning` sur `<html>` seulement).
- Sélecteur : dans le menu de compte (soleil, lune, écran) ; bouton d'icône dans l'en-tête des pages sans session
  (accueil, connexion, inscription, démo) qui passe Système → Clair → Sombre.
- Les iframes de `/demo` lisent le même `localStorage` et suivent les changements par l'événement `storage`.
- Le sombre est dessiné : surfaces et filets en vert très sombre, marque éclaircie (#6fd0ae), alertes et pastilles
  sur fonds sombres teintés, ombres plus profondes, courbe et graphiques sur les mêmes jetons. Aucune couleur n'est
  codée en dur dans les composants.

## Menu de compte (`components/user-button.tsx`)

Un seul composant dans l'espace commerçant, la console et l'admin : pastille de 48 px aux initiales, menu avec nom,
rôle, institution, thème, « Changer de profil » et « Se déconnecter ». Vrai bouton (`aria-haspopup`,
`aria-expanded`), menu ARIA (flèches, Début, Fin, Échap, clic extérieur, focus rendu au bouton). La déconnexion
appelle `/auth/deconnexion` puis `location.replace("/connexion")` ; une page restaurée depuis le cache de
l'historique est rechargée, donc le retour arrière ne rouvre pas l'espace. Masqué dans les iframes de la démo.

## Icônes (`components/bouton-icone.tsx`)

- Une seule famille, `lucide-react`, 20 px, trait 1,75.
- **Icône seule** (`BoutonIcone`, `LienIcone`) pour les actions courantes : retour, précédent, suivant, trier,
  réessayer, réinitialiser, avancer l'horloge, replier, voir le calcul, reprogrammer. `aria-label` en français et
  infobulle au survol comme au focus ; 48 px sur téléphone, 44 px au-delà.
- **Icône + libellé court** (`Bouton`/`LienBouton` avec `icone`) pour tout ce qui engage : envoyer le dossier,
  accepter ou décliner l'offre, payer, enregistrer la décision ou les paramètres, se déconnecter.
- Les choix (filtre « À traiter / Tous », type de décision) restent écrits : une icône y serait ambiguë.

### Contrastes (WCAG 2.1, `node scripts/contrastes.mjs`)

Le script lit `globals.css` et mesure chaque texte sur **chaque niveau de surface** (fond, surface, surface-2,
surface-3), dans les deux thèmes, plus les paires dédiées. Plus faible valeur par ligne (2026-11-24) :

| Texte (seuil) | Clair, minimum | Sombre, minimum |
|---|---|---|
| encre (4,5) | 12,97 | 11,51 |
| encre-2 (4,5) | 6,96 | 7,42 |
| encre-3 (4,5) | 4,63 | 5,09 |
| marque (4,5) | 6,10 | 5,96 |
| montant (4,5) | 6,10 | 11,51 |
| alerte (4,5) | 4,99 | 6,41 |
| bon (4,5) | 4,88 | 7,13 |
| ambre-encre (4,5) | 6,32 | 8,75 |
| focus (3) | 6,10 | 7,69 |
| sur-action / action (4,5) | 7,41 | 6,19 |
| marque / marque-doux (4,5) | 6,58 | 5,70 |
| alerte / alerte-doux (4,5) | 5,26 | 6,66 |
| bon / bon-doux (4,5) | 5,38 | 7,12 |
| ambre-encre / ambre-doux (4,5) | 7,18 | 8,42 |
| sur-scene, sur-scene-2 / scene (4,5) | 7,41, 6,58 | 13,96, 9,00 |
| logo-cauri / fond (3, graphique) | 7,41 | 10,95 |

L'`ambre` clair (2,2 à 3,0 selon la surface) n'est jamais seul porteur de sens : c'est un point ou un liseré qui
accompagne un libellé. Il est mesuré pour information.

Les deux thèmes sont aussi contrôlés par axe (WCAG 2.1 AA) sur les écrans principaux : `e2e/qualite.spec.ts`.

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
- `ChoixModalites` (`components/estimation.tsx`, ADR 0015) : fréquence en boutons segmentés (une seule option →
  texte « seule option de cette institution »), durée en liste de mois ; uniquement les options de l'institution.
  L'échéance se lit en une phrase : « 41 500 FCFA chaque mois pendant 6 mois ». `MentionPrudente` : une ligne en
  petit, couleur secondaire, jamais d'alerte rouge (« estimation prudente, moins éprouvée… »).
- Dépôt du dossier : un seul bouton principal, puis trois étapes numérotées dans une carte (institution →
  modalités → vérification et signature). Le code SMS de démo s'affiche dans une bulle de message étiquetée
  « simulé » ; le bouton « Signer et envoyer » reste inactif tant que les 6 chiffres ne sont pas saisis.
- `Marque` : « K » d'une barre et de deux traits de flux dans un carré arrondi, dessiné pour le projet ;
  variante `inverse` sur fond de marque.

## Mise en page par rôle

- **Commerçant** (360 px d'abord) : carte « combien / à quel prix / que faire », puis courbe, raisons, simulateur.
  Barre d'onglets en bas, cibles de 64 px, indicateur actif en pastille.
  Conseils : bandeau-résumé ambre (gain possible, meilleur levier), puis une carte par levier à améliorer
  (Où vous en êtes / Pourquoi ça compte / Quoi faire / Effet estimé), triées par effet ; effet chiffré sur fond
  `bon-doux`, « effet non chiffré » sur `surface-2`. Grille 1 → 2 (lg) → 3 (2xl) colonnes. Les leviers déjà bons
  sont repliés en lignes courtes « Ce qui va déjà bien » ; les paliers 3/6/12 mois restent dans le levier historique.
- **Console** : barre latérale claire (institution et rôle visibles), organisée par objet (ADR 0019), raccourcis
  1–7 sur toutes les pages. Voir « Architecture de la console » ci-dessous.
- **Admin** : en-tête propre au rôle, chiffres de volume, institutions triées par dossiers en attente,
  activité récente sans données nominatives, commandes de démo avec confirmation avant réinitialisation.
- **Connexion** : panneau de marque à gauche sur grand écran, profils groupés par institution ; « Profils fictifs »
  et l'absence de mot de passe sont dits clairement.

## Architecture de la console (ADR 0019)

| Section | URL | Contenu |
|---|---|---|
| Aujourd'hui (1) | `/console` | 4 indicateurs (encours, part en retard, PAR 30, recouvrement) cliquables ; 3 cartes « à faire » : dossiers à décider (bandeau ambre des alertes), échéances en retard (nouvelles depuis hier), offres sans réponse depuis 3 jours ; chaque carte finit par un lien vers la liste filtrée |
| Demandes (2) | `/console/demandes` | onglets À décider · Complément demandé · En attente du commerçant · Traitées (compteurs) ; recherche par nom, statut, décision (Traitées), tranche de risque, alertes, période, tri |
| Crédits (3) | `/console/credits` | indicateurs, puis onglets En cours · En retard · Remboursés · En défaut ; recherche, période, tri |
| Recouvrement (4) | `/console/recouvrement` | échéances en retard (reprogrammer avec motif) ; historique des relances filtrable par commerçant et période |
| Commerçants (5) | `/console/commercants` | commerçants ayant au moins un dossier dans l'institution ; recherche, tri |
| Paramètres (6), Journal (7) | inchangés | |

Détails : dossier (bandeau de décision liseré vert / rouge / ambre, réponse du commerçant, « Voir le crédit »),
crédit (échéancier, paiements, relances, reprogrammations), commerçant (historique de cette institution seulement).
Fil d'Ariane en tête de chaque détail ; noms et rangs d'échéance sont des liens croisés.

Règles communes (`app/console/commun.tsx`) : l'état d'une liste (onglet, filtres, tri, page) vit **dans l'URL**,
partageable et conservé au retour arrière ; la pagination est servie par l'API (20 par page, 50 au plus). Grand
écran : tableau dont la première cellule est un lien (clavier) et la ligne entière cliquable ; téléphone (< 768 px) :
**cartes**, onglets **défilants** horizontalement, recherche sur sa propre ligne. Vides distincts : « rien dans cet
onglet » ou « aucun résultat pour ces filtres » (avec bouton d'effacement).

## Ce qui est affiché du calcul (formule hors des écrans)

Décision du propriétaire : la formule du moteur (plafond, encaissement prudent, part prélevable, annuité) reste dans
le moteur et dans `docs/` (ADR, évaluation) ; elle ne s'affiche ni au commerçant ni à l'agent. La décision se lit par
**la demande et son risque**.

- **Commerçant** : « Pourquoi ce montant » (raisons du moteur) puis un bouton « Comment ce montant est calculé » qui
  ouvre trois phrases sans symbole (une mauvaise période de vos ventes et une marge de sécurité ; 2 000 scénarios ;
  l'institution décide), avec nombre d'échéances, durée et coût total. Les raisons et le « Pourquoi » restent
  séparés : l'un dit ce qui pèse sur *ce* commerçant, l'autre la méthode commune.
- **Console, fiche** : montant demandé, objet, risque de la demande et tolérance ; plafond prudent et son risque en
  repère ; raisons. Onglet « Comment c'est calculé » en mots (moteur et graine pour le rejeu). La borne de la
  contre-proposition, toujours appliquée par le serveur, s'énonce : « au-delà, les ventes ne permettent pas de
  rembourser prudemment ».
- **Console, paramètres** : chaque réglage porte un nom en clair et une phrase d'effet ; l'aperçu (responsable seul)
  montre, avant enregistrement, le plafond prudent moyen, le risque moyen de la demande et le nombre de demandes
  au-dessus de la tolérance pour les dossiers en attente, avant / après, recalculés par le moteur.
- **Vitrine** : simulateur « calcul simplifié », décrit en mots. Le journal d'audit n'est pas concerné.
- Contrôle : `e2e/formule.spec.ts` lit toutes les pages de `/app` et `/console` (panneaux repliés compris) et
  échoue sur `L_max`, `C_p` ou « formule ».

## Mouvement

Une seule apparition (le montant), tracé de la courbe, transitions courtes sur action. Tout est coupé sous
`prefers-reduced-motion`.

## Interdits

Dégradés décoratifs, cartes dans des cartes, capitales espacées, couleur sans sens, chiffres ou partenaires
inventés, texte qui décrit l'interface au lieu de guider.
