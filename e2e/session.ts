import type { APIRequestContext } from "@playwright/test";

/** Ouvre un profil de démo dans le contexte du navigateur (`page.request` partage ses cookies). */
export async function connecter(r: APIRequestContext, ...profils: string[]) {
  for (const profil of profils) {
    const x = await r.post("/api/auth/connexion", { data: { profil } });
    if (!x.ok()) throw new Error(`connexion ${profil} : ${x.status()}`);
  }
}

export async function reinitialiser(r: APIRequestContext) {
  await connecter(r, "admin");
  const x = await r.post("/api/demo/reinitialiser", { data: {} });
  if (!x.ok()) throw new Error(`réinitialisation : ${x.status()}`);
}
