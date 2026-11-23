import type { NextConfig } from "next";

// L'API est jointe par le proxy app/api/[...chemin]/route.ts (adresse lue à l'exécution).
const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default config;
