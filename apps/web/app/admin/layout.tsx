import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin général" };

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return children;
}
