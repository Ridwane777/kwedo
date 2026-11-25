import path from "node:path";
import type { NextConfig } from "next";

// L'API est jointe par le proxy app/api/[...chemin]/route.ts (adresse lue à l'exécution).
const config: NextConfig = {
  reactStrictMode: true,
  // Serveur autonome pour l'image Docker (ADR 0013) ; sans effet sur `next start`.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  poweredByHeader: false,
};

export default config;
