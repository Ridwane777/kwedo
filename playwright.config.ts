import { defineConfig } from "@playwright/test";

// Ports réservés aux tests : API 3462 (base SQLite jetable), web 3463. Rien n'est exposé hors de 127.0.0.1.
const API = "http://127.0.0.1:3462";
const WEB = "http://127.0.0.1:3463";
process.env.KWEDO_API = API;

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: WEB, locale: "fr-FR", timezoneId: "Africa/Porto-Novo" },
  webServer: [
    { command: "rm -f .captures/e2e.sqlite* && python3 services/api/serveur.py --port 3462 --db .captures/e2e.sqlite", url: `${API}/sante`, timeout: 60_000, reuseExistingServer: false },
    { command: "npx next start -H 127.0.0.1 -p 3463", cwd: "apps/web", url: WEB, timeout: 60_000, reuseExistingServer: false, env: { KWEDO_API: API } },
  ],
});
