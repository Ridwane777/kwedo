import { ImageResponse } from "next/og";
import { CAURI } from "@/components/motif";

// Icône d'application (écran d'accueil du téléphone) : cauri-K ivoire sur fond vert de marque.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a5a47" }}>
        <svg width="120" height="120" viewBox="0 0 32 32">
          <path d={CAURI.barre} fill="#f2f4f3" />
          <path d={CAURI.jambe} stroke="#f2f4f3" strokeWidth="4.6" strokeLinecap="round" fill="none" />
          <path d={CAURI.coquille} fill="#e9dfc4" />
          <path d={CAURI.ouverture} fill="#0a5a47" />
          <path d={CAURI.dents} stroke="#e9dfc4" strokeWidth=".75" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
