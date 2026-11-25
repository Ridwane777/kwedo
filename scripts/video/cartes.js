// Cartes HTML de la vidéo (titre, référence, résultats, fin). Chiffres repris de docs/RESULTATS.md.
const STYLE = `
<style>
  *{box-sizing:border-box;margin:0}
  body{width:1440px;height:900px;background:#f3f5f2;color:#13201b;font-family:"Public Sans",system-ui,sans-serif;
       display:flex;flex-direction:column;justify-content:center;padding:72px 96px}
  .tag{display:inline-block;align-self:flex-start;font-size:18px;font-weight:600;color:#0c5a46;background:#d9ebe2;border-radius:999px;padding:6px 16px;margin-bottom:22px}
  h1{font-size:62px;line-height:1.05;letter-spacing:-0.02em;margin-bottom:22px}
  h2{font-size:40px;line-height:1.1;letter-spacing:-0.01em;margin-bottom:28px}
  p{font-size:26px;line-height:1.4;color:#33433d;max-width:1150px}
  .k{color:#0c5a46}
  table{border-collapse:collapse;width:100%;font-size:22px}
  th,td{text-align:left;padding:12px 14px;border-bottom:1px solid #d5ddd8;vertical-align:top}
  th{font-size:18px;color:#56655f;font-weight:600}
  td:first-child{font-weight:600;width:24%}
  .grille{display:grid;grid-template-columns:1fr 1fr;gap:28px}
  .boite{background:#fff;border-radius:22px;padding:26px 30px;box-shadow:0 1px 2px #0001}
  .boite h3{font-size:24px;margin-bottom:12px}
  .boite li{font-size:21px;line-height:1.45;margin-left:22px;color:#26352f}
  .note{font-size:17px;color:#56655f;margin-top:18px}
</style>`;

const page = (corps) => `<!doctype html><html lang="fr"><head><meta charset="utf-8">${STYLE}</head><body>${corps}</body></html>`;

module.exports = {
  titre: page(`
    <span class="tag">GPU Challenge · cas d'usage 3 · prototype</span>
    <h1>Kwedo<br><span class="k">Le crédit qui suit le rythme des ventes.</span></h1>
    <p>Au Bénin, les petits commerçants encaissent chaque jour par mobile money, mais restent invisibles pour le crédit.
       Kwedo transforme leurs ventes vérifiées en un plafond prudent, expliqué, que l'institution décide d'accorder.</p>`),

  reference: page(`
    <span class="tag">Notre référence</span>
    <h2>Le crédit mobile money de MTN Bénin<br><span class="k">(Prêt Xpress, MoMo Kash)</span></h2>
    <table>
      <tr><th></th><th>MTN Bénin</th><th>Kwedo</th></tr>
      <tr><td>Décide sur</td><td>l'usage du compte MoMo et des services MTN</td><td>les encaissements vérifiés du commerce</td></tr>
      <tr><td>Montant</td><td>jusqu'à 100 000 FCFA</td><td>selon les ventes, montant demandé libre</td></tr>
      <tr><td>Coût d'accès</td><td>10 % du montant + taxes</td><td>aucun frais Kwedo</td></tr>
      <tr><td>Décision</td><td>automatique, refus non expliqué</td><td>expliquée, prise par un agent de l'institution</td></tr>
    </table>
    <p class="note">Sources : Banouto (22/03/2024), Cadreco (22/10/2025).</p>`),

  resultats: page(`
    <span class="tag">Résultats face à la référence</span>
    <h2>Ce qu'on mesure, ce qu'on ne peut pas comparer</h2>
    <div class="grille">
      <div class="boite"><h3>MTN Bénin (publié)</h3><ul>
        <li>170 000 crédits, ~13 Md FCFA (MoMo Kash)</li>
        <li>remboursement « > 95 % », défaillance « < 0,5 % »</li>
        <li>annonce des partenaires, <b>méthode non publiée</b></li></ul></div>
      <div class="boite"><h3>Kwedo (données simulées, 4 000 commerçants)</h3><ul>
        <li>échéances manquées : <b>0,86 %</b> (semaine) à <b>1,89 %</b> (mois), 6 mois</li>
        <li>raisons affichées fidèles au calcul : 100 %</li>
        <li>protocole figé avant le calcul, un seul run</li></ul></div>
      <div class="boite"><h3>Erreurs</h3><ul>
        <li>risque sous-estimé : 11,8 % annoncé, 20,6 % observé</li>
        <li>activités jamais vues : quincaillerie 4,8 % annoncé, 30,8 % observé</li></ul></div>
      <div class="boite"><h3>Limites</h3><ul>
        <li>aucune comparaison chiffrée possible avec MTN</li>
        <li>données simulées : validation au pilote avec une institution</li></ul></div>
    </div>`),

  fin: page(`
    <span class="tag">Kwedo</span>
    <h1>Décider sur les ventes réelles.<br><span class="k">Expliquer chaque montant.</span></h1>
    <p>Un plafond prudent pour le commerçant, un risque lisible pour l'institution, qui garde la décision.</p>
    <p class="note" style="font-size:20px;margin-top:30px">Fiche de résultats : github.com/Ridwane777/kwedo/blob/main/docs/RESULTATS.md</p>`),
};
