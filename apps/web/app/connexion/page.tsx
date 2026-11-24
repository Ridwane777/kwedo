"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Cauri, Marque } from "@/components/motif";
import { BoutonTheme } from "@/components/user-button";
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
    <div className="grid gap-6 2xl:grid-cols-2 2xl:items-start">
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
                    : <ChevronRight aria-hidden="true" size={20} strokeWidth={1.75} className="shrink-0 text-encre-3" />}
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
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Univers de marque : la courbe se trace, les cauris s'empilent (CSS, coupé sous mouvement réduit). */}
      <aside className="relative hidden overflow-hidden bg-scene p-[clamp(2.5rem,4vw,4.5rem)] text-sur-scene lg:flex lg:flex-col lg:justify-between">
        <Link href="/" aria-label="Accueil Kwedo"><Marque mono couleur="text-sur-scene" /></Link>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 top-1/3 opacity-90">
          <svg viewBox="0 0 600 300" preserveAspectRatio="none" className="h-full w-full">
            <path className="trace" style={{ "--longueur": 1400 } as React.CSSProperties} fill="none" stroke="currentColor" strokeOpacity=".55" strokeWidth="2.5"
              d="M0 230 C40 220 60 240 100 210 S160 220 200 190 S260 200 300 170 S360 185 400 140 S460 150 500 110 S560 90 600 60" />
            <path fill="none" stroke="currentColor" strokeOpacity=".22" strokeDasharray="6 8" d="M0 205 H600" />
          </svg>
        </div>
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-end gap-8">
          <div>
            <p className="titre max-w-[16ch] text-[clamp(2.2rem,3.6vw,3.6rem)] leading-[1.02]">Combien, à quel prix, et quoi faire maintenant.</p>
            <p className="mt-4 max-w-[46ch] text-sur-scene-2">Un espace pour le commerçant, une console pour l'institution, une vue de supervision pour la plateforme.</p>
          </div>
          <span className="text-sur-scene-2 opacity-80"><Cauri taille={150} mono className="cauri-flotte" /></span>
        </div>
        <p className="relative max-w-[52ch] text-sm text-sur-scene-2">Prototype de démonstration : chaque profil est fictif et ne demande pas de mot de passe.</p>
      </aside>
      <div className="gouttiere w-full py-6 lg:py-12">
        <header className="flex items-center justify-between gap-3 pb-6 lg:justify-end">
          <Link href="/" aria-label="Accueil Kwedo" className="lg:hidden"><Marque /></Link>
          <div className="flex items-center gap-2"><Simule quoi="Profils fictifs" /><BoutonTheme /></div>
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
