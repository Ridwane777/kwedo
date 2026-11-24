import { ImageResponse } from "next/og";
import { CAURI } from "@/components/motif";

// Image de partage (Open Graph) : marque, promesse, mention du prototype. Aucun chiffre.
export const alt = "Kwedo — le crédit qui suit le rythme de vos ventes. Prototype, données simulées.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ImageOg() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#f2f4f3", color: "#0e1d18" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="96" height="96" viewBox="0 0 32 32">
            <path d={CAURI.barre} fill="#0e1d18" />
            <path d={CAURI.jambe} stroke="#0e1d18" strokeWidth="4.6" strokeLinecap="round" fill="none" />
            <path d={CAURI.coquille} fill="#0a5a47" />
            <path d={CAURI.ouverture} fill="#f2f4f3" />
            <path d={CAURI.dents} stroke="#f2f4f3" strokeWidth=".38" strokeLinecap="round" />
            <path d={CAURI.canaux} fill="#f2f4f3" />
          </svg>
          <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>Kwedo</div>
        </div>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 980 }}>Le crédit qui suit le rythme de vos ventes.</div>
        <div style={{ fontSize: 30, color: "#3b4a44" }}>Prototype sur données simulées · personnes et institutions fictives</div>
      </div>
    ),
    size,
  );
}
