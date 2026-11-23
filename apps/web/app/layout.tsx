import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";

const titre = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-titre", axes: ["wdth", "opsz"], display: "swap" });
const texte = Instrument_Sans({ subsets: ["latin"], variable: "--font-texte", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Kwedo — crédit au rythme de vos ventes", template: "%s · Kwedo" },
  description: "Prototype : capacité de remboursement des petits commerçants à partir de leurs encaissements. Données 100 % simulées.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f2f4f3" }, { media: "(prefers-color-scheme: dark)", color: "#0c1613" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${titre.variable} ${texte.variable}`}>
      <body className="min-h-dvh bg-fond text-encre">{children}</body>
    </html>
  );
}
