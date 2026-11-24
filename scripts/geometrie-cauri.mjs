// Géométrie du cauri-K (grille de 32), calculée plutôt que dessinée à la main (docs/MISSION-FINITIONS.md).
// Coquille : ellipse bombée posée en diagonale, pointe arrière contre la barre du K.
// Fente : lentille fine dans le grand axe, d'une extrémité à l'autre.
// Dents : petites encoches régulières sur les DEUX lèvres de la fente, qui avancent dans la fente sans la traverser.
// Usage : node scripts/geometrie-cauri.mjs  → affiche les chemins à reporter dans apps/web/components/motif.tsx
const C = [20.6, 10.6];          // centre de la coquille
const A = 9.4, B = 6.9;          // demi-axes (bombé : B / A ≈ 0,73)
const ANGLE = -38;               // degrés
const r = (ANGLE * Math.PI) / 180;
const u = [Math.cos(r), Math.sin(r)];       // grand axe
const n = [-Math.sin(r), Math.cos(r)];      // petit axe
const p = (t, s) => [C[0] + u[0] * t + n[0] * s, C[1] + u[1] * t + n[1] * s];
const f = (x) => Math.round(x * 100) / 100;
const pt = ([x, y]) => `${f(x)} ${f(y)}`;

const [g, d] = [p(-A, 0), p(A, 0)];
const coquille = `M${pt(g)}A${A} ${B} ${ANGLE} 1 1 ${pt(d)}A${A} ${B} ${ANGLE} 1 1 ${pt(g)}z`;

// Fente : lentille de -0,82 A à +0,82 A, demi-largeur maximale W.
const L = 0.8 * A, W = 0.95;
const fente = `M${pt(p(-L, 0))}Q${pt(p(0, 2 * W))} ${pt(p(L, 0))}Q${pt(p(0, -2 * W))} ${pt(p(-L, 0))}z`;
const fenteSimple = `M${pt(p(-L, 0))}L${pt(p(L, 0))}`;

// Dents : petites rainures régulières sur la coquille, de part et d'autre de la fente, symétriques ;
// chacune part de la lèvre vers l'extérieur (elles ne traversent jamais la fente, contrairement à des lacets).
const dents = [];
const N = 13; // dents fines et serrées, comme un peigne (des rainures longues et espacées évoquent des lacets)
for (let k = 0; k < N; k++) {
  const t = -L * 0.8 + (k * (2 * L * 0.8)) / (N - 1);
  const dl = W * (1 - (t / L) ** 2); // largeur locale de la lentille (parabole)
  const long = 0.7;
  for (const cote of [1, -1]) dents.push(`M${pt(p(t, cote * dl))}L${pt(p(t, cote * (dl + long)))}`);
}
// Canaux : petites encoches aux deux extrémités de la coquille, dans l'axe de la fente.
const canaux = [p(-A, 0), p(A, 0)].map(([x, y]) => ({ cx: f(x), cy: f(y), r: 1.05 }));
const ext = { coquille, fente, fenteSimple, dents: dents.join(""), canaux, pointe: pt(g), avant: pt(d) };
console.log(JSON.stringify(ext, null, 2));
