// Mesures de performance reproductibles. Prérequis : API sur 3460, web (next start) sur 3461.
// Usage : node scripts/perf.mjs > docs/performance/resultats.json
import { chromium } from "@playwright/test";
import os from "node:os";

const API = "http://127.0.0.1:3460", WEB = "http://127.0.0.1:3461";
const q = (v, p) => { const s = [...v].sort((a, b) => a - b); return +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1); };

async function chrono(url, init, n = 30) {
  const t = [];
  for (let k = 0; k < n; k++) {
    const t0 = performance.now();
    const r = await fetch(typeof url === "function" ? url(k) : url, init);
    await r.text();
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    t.push(performance.now() - t0);
  }
  return { n, p50_ms: q(t, 0.5), p95_ms: q(t, 0.95), max_ms: q(t, 1) };
}

await fetch(`${API}/demo/reinitialiser`, { method: "POST", body: "{}" });
const file = await (await fetch(`${API}/dossiers`)).json();
const api = {
  "GET /commercants/{id}/estimation (curseur de choc)": await chrono((k) => `${API}/commercants/com-afiavi/estimation?choc_ventes=-${(k % 7) / 10}`),
  "GET /dossiers (file)": await chrono(`${API}/dossiers?institution_id=inst-lagune`),
  "GET /dossiers/{id} (fiche)": await chrono(`${API}/dossiers/${file[0].id}`),
  "GET /portefeuille": await chrono(`${API}/portefeuille`),
  "POST /demo/reinitialiser": await chrono(`${API}/demo/reinitialiser`, { method: "POST", body: "{}" }, 3),
};

const nav = await chromium.launch();
const pages = {};
for (const [chemin, largeur] of [["/", 1440], ["/app", 360], ["/app/simulateur", 360], ["/console", 1440], [`/console/dossiers/${file[0].id}`, 1440], ["/demo", 1440]]) {
  const mesures = [];
  for (let k = 0; k < 5; k++) {
    const ctx = await nav.newContext({ viewport: { width: largeur, height: 900 } });
    const page = await ctx.newPage();
    let js = 0;
    page.on("response", async (r) => { if (r.url().endsWith(".js")) js += (await r.body().catch(() => Buffer.alloc(0))).length; });
    await page.goto(WEB + chemin, { waitUntil: "networkidle" });
    const m = await page.evaluate(() => new Promise((res) => {
      new PerformanceObserver((l) => {
        const e = l.getEntries().at(-1);
        const n = performance.getEntriesByType("navigation")[0];
        res({ ttfb: n.responseStart, dcl: n.domContentLoadedEventEnd, lcp: e ? e.startTime : null });
      }).observe({ type: "largest-contentful-paint", buffered: true });
    }));
    mesures.push({ ...m, js });
    await ctx.close();
  }
  pages[chemin.replace(/dos-\d+/, "{id}")] = {
    ttfb_ms_p50: q(mesures.map((m) => m.ttfb), 0.5), dcl_ms_p50: q(mesures.map((m) => m.dcl), 0.5),
    lcp_ms_p50: q(mesures.map((m) => m.lcp ?? 0), 0.5), js_ko_non_compresse: Math.round(mesures[0].js / 1024),
  };
}
await nav.close();

console.log(JSON.stringify({
  date: new Date().toISOString(), machine: { cpu: os.cpus()[0].model, coeurs: os.cpus().length, memoire_go: Math.round(os.totalmem() / 2 ** 30), gpu: "aucun" },
  conditions: "Local, 127.0.0.1, build de production (next start), sans limitation réseau ni CPU, machine partagée avec d'autres processus.",
  api, pages,
}, null, 1));
