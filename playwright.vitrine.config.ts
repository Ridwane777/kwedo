import base from "./playwright.config";
import { defineConfig } from "@playwright/test";

// Génère les captures de la vraie app montrées sur l'accueil (apps/web/public/ecrans/).
// Usage : npx playwright test --config playwright.vitrine.config.ts
export default defineConfig({ ...base, testDir: "scripts", testMatch: "ecrans-vitrine.spec.ts" });
