"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Marque } from "@/components/motif";
import { Chargement, Erreur, Simule } from "@/components/ui";
import { connecter, useApi } from "@/lib/api";
import { ROLES, type Utilisateur } from "@/lib/session";

type Profil = { id: string; role: Utilisateur["role"]; nom: string; institution: string | null };

const ACCUEIL: Record<Utilisateur["role"], string> = { commercant: "/app", agent: "/console", responsable: "/console", admin: "/admin" };
const DROITS: Record<Utilisateur["role"], string> = {
  commercant: "Son estimation, son dossier, ses accords et son crédit.",
  agent: "Les dossiers de son institution : il analyse et décide.",
  responsable: "Comme l'agent, et il règle les paramètres de son institution.",
  admin: "Supervise la plateforme, sans lire les dossiers ni les réglages.",
};

function Choix() {
  const router = useRouter();
  const suite = useSearchParams().get("suite");
  const { donnees, erreur, recharger } = useApi<Profil[]>("/auth/profils");
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [echec, setEchec] = useState<string | null>(null);

  async function choisir(p: Profil) {
    setEnvoi(p.id); setEchec(null);
    try {
      await connecter(p.id);
      const racine = ACCUEIL[p.role];
      router.push(suite?.startsWith(`${racine}/`) || suite === racine ? suite : racine);
    } catch (e) { setEchec(e instanceof Error ? e.message : "Erreur"); setEnvoi(null); }
  }

  if (erreur) return <Erreur message={erreur} reessayer={recharger} />;
  if (!donnees) return <Chargement lignes={6} />;
  const groupes: [string, Profil[]][] = [
    ["Commerçant", donnees.filter((p) => p.role === "commercant")],
    ...[...new Set(donnees.filter((p) => p.institution).map((p) => p.institution!))].map((i) => [i, donnees.filter((p) => p.institution === i)] as [string, Profil[]]),
    ["Plateforme Kwedo", donnees.filter((p) => p.role === "admin")],
  ];
  return (
    <div className="space-y-6">
      {echec && <p role="alert" className="rounded-xl bg-alerte-doux p-3 text-sm text-alerte">{echec}</p>}
      {groupes.map(([titre, profils]) => (
        <section key={titre}>
          <h2 className="mb-2 text-sm font-semibold text-encre-2">{titre}</h2>
          <ul className="overflow-hidden rounded-2xl border border-trait bg-surface">
            {profils.map((p) => (
              <li key={p.id} className="border-t border-trait first:border-t-0">
                <button onClick={() => void choisir(p)} disabled={!!envoi} aria-busy={envoi === p.id}
                  className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2 disabled:opacity-60">
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-marque-doux text-sm font-bold text-marque">
                    {(p.role === "commercant" ? p.nom : ROLES[p.role]).split(" ").filter((m) => m.length > 2).map((m) => m[0]!.toUpperCase()).slice(0, 2).join("")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{p.role === "commercant" ? p.nom : ROLES[p.role]}</span>
                    <span className="block text-sm text-encre-2">{DROITS[p.role]}</span>
                  </span>
                  {envoi === p.id
                    ? <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-marque border-t-transparent" aria-label="Connexion en cours" />
                    : <svg aria-hidden="true" className="shrink-0 text-encre-3" width="18" height="18" viewBox="0 0 20 20"><path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-sm text-encre-2">Nouveau commerçant ? <Link href="/app/inscription" className="font-semibold text-marque underline underline-offset-4">Créer un profil</Link></p>
    </div>
  );
}

export default function Connexion() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <aside className="hidden flex-col justify-between bg-marque p-12 text-fond lg:flex">
        <Link href="/" aria-label="Accueil Kwedo"><Marque inverse /></Link>
        <div>
          <p className="titre max-w-md text-[2.6rem] leading-[1.05]">Combien, à quel prix, et quoi faire maintenant.</p>
          <p className="mt-4 max-w-sm opacity-85">Un espace pour le commerçant, une console pour l'institution, une vue de supervision pour la plateforme.</p>
        </div>
        <p className="max-w-sm text-sm opacity-85">Prototype de démonstration : chaque profil est fictif et ne demande pas de mot de passe.</p>
      </aside>
      <div className="mx-auto w-full max-w-xl px-5 py-6 lg:py-12">
        <header className="flex items-center justify-between gap-3 pb-6 lg:justify-end">
          <Link href="/" aria-label="Accueil Kwedo" className="lg:hidden"><Marque /></Link>
          <Simule quoi="Profils fictifs" />
        </header>
        <main>
          <h1 className="titre text-[2.25rem] leading-tight">Se connecter</h1>
          <p className="mb-7 mt-2 text-encre-2">Choisissez un profil de démonstration. Chacun ne voit que ce que son rôle autorise.</p>
          <Suspense fallback={<Chargement lignes={6} />}><Choix /></Suspense>
        </main>
      </div>
    </div>
  );
}
