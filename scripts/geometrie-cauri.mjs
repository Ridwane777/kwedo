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

// Fente : lentille de -0,8 A à +0,8 A, demi-largeur maximale W, légèrement courbe (axe bombé de COURBE),
// comme l'ouverture d'un vrai cauri (une couture de ballon est droite).
const L = 0.8 * A, W = 0.85, COURBE = 1.4;
const S = p(-L, 0), E = p(L, 0), Q = p(0, COURBE);
const fente = `M${pt(S)}Q${pt(p(0, COURBE + 2 * W))} ${pt(E)}Q${pt(p(0, COURBE - 2 * W))} ${pt(S)}z`;
const fenteSimple = `M${pt(S)}Q${pt(Q)} ${pt(E)}`;
const bez = (t) => [0, 1].map((i) => (1 - t) ** 2 * S[i] + 2 * t * (1 - t) * Q[i] + t ** 2 * E[i]);

// Dents : petites rainures régulières sur la coquille, de part et d'autre de la fente, symétriques ;
// chacune part de la lèvre vers l'extérieur (elles ne traversent jamais la fente, contrairement à des lacets).
const dents = [];
const N = 12; // dents courtes et serrées, comme un peigne (des rainures longues et espacées évoquent des lacets)
for (let k = 0; k < N; k++) {
  const t = 0.12 + (k * 0.76) / (N - 1);         // position le long de l'ouverture (0 à 1)
  const c = bez(t);
  const dl = 4 * t * (1 - t) * W;                  // demi-largeur locale de la lentille
  const long = 0.55;
  for (const cote of [1, -1]) {
    const a = [c[0] + n[0] * cote * dl, c[1] + n[1] * cote * dl];
    const b = [c[0] + n[0] * cote * (dl + long), c[1] + n[1] * cote * (dl + long)];
    dents.push(`M${pt(a)}L${pt(b)}`);
  }
}
// Canaux : petites encoches aux deux extrémités de la coquille, dans l'axe de la fente.
const canaux = [p(-A, 0), p(A, 0)].map(([x, y]) => ({ cx: f(x), cy: f(y), r: 1.05 }));
const ext = { coquille, fente, fenteSimple, dents: dents.join(""), canaux, pointe: pt(g), avant: pt(d) };
console.log(JSON.stringify(ext, null, 2));
