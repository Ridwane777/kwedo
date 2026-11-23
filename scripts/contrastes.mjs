// Contrastes WCAG 2.1 des paires de tokens du système « comptoir » (docs/design.md).
const L = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const r = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return ((x + 0.05) / (y + 0.05)).toFixed(2); };
const T = {
  clair: { fond: "#f2f4f3", surface: "#ffffff", s2: "#e7ecea", encre: "#0e1d18", encre2: "#3b4a44", encre3: "#56645e", marque: "#0a5a47", marqueDoux: "#d7ebe3", alerte: "#b0261c", alerteDoux: "#fadeda", bon: "#1d6b35", bonDoux: "#daeedd", ambreEncre: "#6b4500", ambreDoux: "#faebc8" },
  sombre: { fond: "#0c1613", surface: "#13201c", s2: "#1a2925", encre: "#e8efec", encre2: "#b5c3bd", encre3: "#93a39c", marque: "#6fd0ae", marqueDoux: "#10362b", alerte: "#ff9a8f", alerteDoux: "#42140f", bon: "#87d49a", bonDoux: "#143220", ambreEncre: "#f3d38a", ambreDoux: "#3a2b08" },
};
const PAIRES = [["encre", "fond"], ["encre2", "fond"], ["encre3", "fond"], ["encre3", "s2"], ["encre2", "surface"], ["marque", "fond"], ["fond", "marque"], ["marque", "marqueDoux"], ["alerte", "alerteDoux"], ["alerte", "surface"], ["bon", "bonDoux"], ["ambreEncre", "ambreDoux"]];
for (const p of PAIRES) console.log(`| ${p[0]} / ${p[1]} | ${r(T.clair[p[0]], T.clair[p[1]])} | ${r(T.sombre[p[0]], T.sombre[p[1]])} |`);
