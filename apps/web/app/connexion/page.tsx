"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Lisiere, Marque } from "@/components/motif";
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
    <div className="space-y-7">
      {echec && <p role="alert" className="text-terre">{echec}</p>}
      {groupes.map(([titre, profils]) => (
        <section key={titre}>
          <h2 className="mb-1 text-sm font-medium text-encre-2">{titre}</h2>
          <ul className="divide-y divide-trait border-y border-trait">
            {profils.map((p) => (
              <li key={p.id}>
                <button onClick={() => void choisir(p)} disabled={!!envoi} className="flex min-h-16 w-full items-center justify-between gap-4 px-2 py-3 text-left transition hover:bg-papier-2 disabled:opacity-60">
                  <span>
                    <span className="block font-medium">{p.role === "commercant" ? p.nom : ROLES[p.role]}</span>
                    <span className="block text-sm text-encre-2">{DROITS[p.role]}</span>
                  </span>
                  <span aria-hidden="true" className="text-indigo">{envoi === p.id ? "…" : "→"}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-sm text-encre-2">Nouveau commerçant ? <Link href="/app/inscription" className="text-indigo underline">Créer un profil</Link></p>
    </div>
  );
}

export default function Connexion() {
  return (
    <div className="mx-auto min-h-dvh max-w-xl px-5 py-6">
      <header className="flex items-center justify-between pb-4">
        <Link href="/" aria-label="Accueil Kwedo"><Marque /></Link>
        <Simule quoi="Profils fictifs" />
      </header>
      <Lisiere hauteur={10} />
      <main className="pt-8">
        <h1 className="titre text-4xl">Entrer dans Kwedo</h1>
        <p className="mb-7 mt-2 text-encre-2">Choisissez un profil de démonstration. Chacun ne voit que ce que son rôle autorise.</p>
        <Suspense fallback={<Chargement lignes={6} />}><Choix /></Suspense>
      </main>
    </div>
  );
}
