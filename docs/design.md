# Système de design : « le registre vivant »

Guide vivant : `/design` dans l'application web.

## Tokens (`apps/web/app/globals.css`)

Papier chaud, encre profonde, indigo teinture, terre cuite, vert feuille, safran (attention). Thème clair et sombre
via `prefers-color-scheme`.

### Contrastes mesurés (WCAG 2.1, formule de luminance relative, 2026-11-23)

| Paire | Clair | Sombre |
|---|---|---|
| encre / papier | 15,13 | 15,37 |
| encre-2 / papier | 8,15 | 10,23 |
| encre-3 / papier | 5,00 | 6,65 |
| indigo / papier | 9,76 | 9,26 |
| terre / papier | 5,38 | 8,36 |
| feuille / papier | 5,63 | 9,80 |
| safran-encre / safran-doux | 6,36 | 9,19 |
| terre / terre-doux | 4,52 | 6,18 |
| feuille / feuille-doux | 4,98 | 6,70 |
| indigo / indigo-doux | 8,14 | 6,40 |
| encre-3 / papier-3 | **3,95 (échec)** | 5,37 |

Règle : `encre-3` n'est jamais posé sur `papier-3`. Le safran n'est jamais une couleur de texte sur papier.

## Typographie

Fraunces (titres et montants, axes SOFT/WONK) et IBM Plex Sans (interface), auto-hébergées par `next/font`.
Chiffres tabulaires partout. Montants : espace insécable U+00A0 (l'espace fine U+202F manque dans la serif).

## Motif

« Lisière » : losanges à gradins et peignes, dessinés pour le projet, en bande fine uniquement.

## Courbe de flux

Composant `CourbeFlux` : tracé à l'arrivée (désactivé si `prefers-reduced-motion`), bande prudente hachurée entre le
niveau prudent (percentile) et le niveau habituel (médiane), réaction en direct au curseur de baisse des ventes,
résumé textuel complet dans `aria-label`.

## Interdits

Dégradés violets, blobs, cartes dans des cartes, gabarit SaaS générique, texte qui décrit l'interface.
