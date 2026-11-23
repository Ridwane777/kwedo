import type { Metadata } from "next";
import { CadreConsole } from "./nav";

export const metadata: Metadata = { title: "Console prêteur" };

export default function LayoutConsole({ children }: { children: React.ReactNode }) {
  return <CadreConsole>{children}</CadreConsole>;
}
