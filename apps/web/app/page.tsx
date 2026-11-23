import Link from "next/link";
import { CourbeFlux } from "@/components/courbe-flux";
import { Lisiere, Marque } from "@/components/motif";
import { Simule } from "@/components/ui";

// Série d'exemple, simulée, uniquement illustrative.
const EXEMPLE = [182, 205, 176, 230, 214, 198, 252, 268, 231, 219, 204, 246, 262, 289, 255, 237, 221, 249, 301, 334, 276, 258, 247, 266, 281, 240]
  .map((v) => v * 1000);

const ETAPES = [
  { t: "Les encaissements", d: "Le commerçant autorise l'accès à son compte marchand. Seuls les paiements de clients comptent : ni transferts vers soi-même, ni allers-retours." },
  { t: "La capacité", d: "On part d'une mauvaise semaine, pas de la moyenne. Échéance supportable R = Cₚ × m × s, plafond L_max = R × (1 − (1 + i)⁻ⁿ) / i." },
  { t: "Le test de résistance", d: "Deux mille avenirs plausibles, avec chocs. Le plafond proposé est le plus gros montant dont le risque reste sous le seuil de l'institution." },
  { t: "La décision humaine", d: "L'agent valide, ajuste ou refuse, avec un justificatif obligatoire. Tout est tracé, rien ne se réécrit." },
];

export default function Accueil() {
  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <header className="flex items-center justify-between py-5">
        <Marque />
        <nav className="flex gap-1 text-sm sm:gap-4" aria-label="Accès">
          <Link href="/connexion" className="whitespace-nowrap rounded-lg px-2 py-2 hover:bg-papier-2">Se connecter</Link>
          <Link href="/demo" className="whitespace-nowrap rounded-lg bg-indigo px-3 py-2 font-medium text-papier">Démo guidée</Link>
        </nav>
      </header>
      <Lisiere />

      <section className="grid items-center gap-10 py-12 lg:grid-cols-[1fr_1.1fr] lg:py-20">
        <div className="space-y-6">
          <h1 className="titre text-[2.6rem] leading-[1.05] sm:text-6xl">Ce que vos ventes disent de ce que vous pouvez rembourser.</h1>
          <p className="max-w-xl text-lg text-encre-2">
            Kwedo lit les encaissements mobile money d'un commerçant sans historique bancaire, en tire un plafond prudent et expliqué,
            et donne à l'agent de crédit un dossier prêt à décider.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/demo" className="inline-flex min-h-12 items-center rounded-xl bg-indigo px-5 font-medium text-papier">Voir la démo en 4 minutes</Link>
            <Link href="/connexion" className="inline-flex min-h-12 items-center rounded-xl border border-indigo px-5 font-medium text-indigo">Ouvrir l'application</Link>
          </div>
          <Simule quoi="Prototype · données 100 % simulées · personnes et institutions fictives" />
        </div>
        <figure className="space-y-3">
          <CourbeFlux serie={EXEMPLE} prudent={210000} median={247000} debut="2026-05-25" />
          <p className="text-xs text-encre-2">Courbe d'encaissements d'illustration, simulée. La bande hachurée : ce sur quoi on peut compter, même une mauvaise semaine.</p>
        </figure>
      </section>

      <section className="border-t border-trait py-12">
        <h2 className="titre mb-8 text-3xl">Comment le plafond est calculé</h2>
        <ol className="grid gap-8 md:grid-cols-4">
          {ETAPES.map((e, k) => (
            <li key={e.t} className="space-y-2">
              <span className="montant block text-4xl text-terre">{k + 1}</span>
              <h3 className="titre text-xl">{e.t}</h3>
              <p className="text-encre-2">{e.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-10 border-t border-trait py-12 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="titre text-3xl">Deux volets, une même courbe</h2>
          <p><strong>Le commerçant</strong> voit combien il peut emprunter et pourquoi, teste « et si mes ventes baissaient », reçoit des conseils et choisit à quelle institution il envoie son dossier. Gratuitement.</p>
          <p><strong>L'agent de crédit</strong> reçoit un dossier analysé : indicateurs, alertes de cohérence, montant proposé et raisons. Il décide, puis suit échéances et relances.</p>
        </div>
        <div className="space-y-3">
          <h2 className="titre text-3xl">Ce que nous ne faisons pas</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-encre-2">
            <li>Prêter : les institutions agréées prêtent, Kwedo outille.</li>
            <li>Prendre une commission sur le montant prêté ou des frais de dossier au commerçant.</li>
            <li>Accuser automatiquement : une alerte va à l'agent, qui tranche.</li>
            <li>Utiliser genre, origine ou religion : le moteur ne lit que des flux d'activité.</li>
            <li>Relancer l'entourage : canal choisi, trois messages au plus, heures raisonnables.</li>
          </ul>
        </div>
      </section>

      <section className="border-t border-trait py-12">
        <h2 className="titre mb-2 text-3xl">Le contexte</h2>
        <p className="mb-6 text-sm text-encre-2">Chiffres issus de la recherche préalable de l'équipe, sans source conservée pour chacun : <strong>à recontrôler</strong> avant toute publication.</p>
        <dl className="grid gap-6 sm:grid-cols-3">
          <div><dt className="text-encre-2">Comptes mobile money actifs au Bénin (2025)</dt><dd className="montant text-3xl">≈ 11,66 millions <span className="ml-1 rounded bg-safran-doux px-1.5 py-0.5 align-middle font-sans text-xs text-safran-encre">à recontrôler</span></dd></div>
          <div><dt className="text-encre-2">Montant moyen d'une opération (2025)</dt><dd className="montant text-3xl">≈ 5 222 FCFA <span className="ml-1 rounded bg-safran-doux px-1.5 py-0.5 align-middle font-sans text-xs text-safran-encre">à recontrôler</span></dd></div>
          <div><dt className="text-encre-2">Inclusion financière au sens strict</dt><dd className="montant text-3xl">39,8 % <span className="ml-1 rounded bg-safran-doux px-1.5 py-0.5 align-middle font-sans text-xs text-safran-encre">à recontrôler</span></dd></div>
        </dl>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-trait py-8 text-sm text-encre-2">
        <p>Kwedo · prototype GPU Challenge, cas d'usage 3. Ne prouve pas la performance sur données réelles : un pilote avec une institution est la prochaine étape.</p>
        <Link href="/design" className="hover:underline">Système de design</Link>
      </footer>
    </div>
  );
}
