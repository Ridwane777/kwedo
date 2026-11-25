# Vidéo de démonstration

Vidéo finale : [`docs/presentation/kwedo-demo.mp4`](../../docs/presentation/kwedo-demo.mp4) (1 min 33, 1440 × 900,
sous-titrée, sans son).

`tourner.js` filme l'app réelle pilotée par Playwright (curseur visible, sous-titres injectés) ; `cartes.js` contient
les cartes de titre, de référence (MTN Bénin) et de résultats, dont les chiffres viennent de
[`docs/RESULTATS.md`](../../docs/RESULTATS.md).

## Régénérer

```
npm i playwright                                   # dans un dossier de travail
KWEDO_URL=http://127.0.0.1:3461 node scripts/video/tourner.js     # vidéo brute dans brut/*.webm
ffmpeg -i brut/*.webm -r 30 -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart -an kwedo-demo.mp4
```

`KWEDO_CHROME` permet d'indiquer un Chromium précis. Le tournage dépose un vrai dossier de démo (Afiavi, Mutuelle
Lagune), le fait accorder par l agent de Lagune, accepte l offre et paie deux échéances : réinitialiser la démo ensuite (admin, « Réinitialiser »).
