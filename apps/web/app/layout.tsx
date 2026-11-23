import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["SOFT", "WONK", "opsz"], display: "swap" });
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Kwedo — le registre vivant", template: "%s · Kwedo" },
  description: "Prototype : capacité de remboursement des petits commerçants à partir de leurs encaissements. Données 100 % simulées.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f6f0e4" }, { media: "(prefers-color-scheme: dark)", color: "#16141c" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${plex.variable}`}>
      <body className="min-h-dvh bg-papier text-encre">{children}</body>
    </html>
  );
}
