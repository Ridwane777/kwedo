// Proxy vers l'API locale. L'adresse est lue à l'exécution (KWEDO_API) : les tests E2E pointent vers un autre port.
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

async function relayer(req: NextRequest, { params }: { params: Promise<{ chemin: string[] }> }) {
  const { chemin } = await params;
  const base = process.env.KWEDO_API ?? "http://127.0.0.1:3460";
  const url = `${base}/${chemin.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const entetes: Record<string, string> = { "Content-Type": "application/json" };
  const acteur = req.headers.get("x-acteur");
  if (acteur) entetes["X-Acteur"] = acteur;
  try {
    const r = await fetch(url, {
      method: req.method, headers: entetes, cache: "no-store",
      body: req.method === "GET" ? undefined : await req.text(),
    });
    return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json; charset=utf-8" } });
  } catch {
    return Response.json({ erreur: "Le serveur Kwedo ne répond pas (API arrêtée ?)." }, { status: 502 });
  }
}

export { relayer as GET, relayer as POST };
