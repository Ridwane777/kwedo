import { defineConfig } from "@playwright/test";

// Par défaut : serveurs déjà lancés (API 3460, web 3461). En CI locale : KWEDO_WEB=http://127.0.0.1:3463.
export default defineConfig({
  testDir: "e2e",
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: process.env.KWEDO_WEB ?? "http://127.0.0.1:3461", locale: "fr-FR", timezoneId: "Africa/Porto-Novo" },
});
