import type { MetadataRoute } from "next";

// App web installable (pas d'app native, aucun magasin d'applications).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kwedo",
    short_name: "Kwedo",
    description: "Prototype : crédit au rythme des ventes des petits commerçants. Données simulées.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f2f4f3",
    theme_color: "#0a5a47",
    lang: "fr",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
