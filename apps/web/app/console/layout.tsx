import type { Metadata } from "next";
import { NavConsole } from "./nav";

export const metadata: Metadata = { title: "Console prêteur" };

export default function LayoutConsole({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh text-[13.5px]">
      <NavConsole />
      <main className="min-w-0 flex-1 px-6 py-5">{children}</main>
    </div>
  );
}
