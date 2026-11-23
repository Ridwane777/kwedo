import Link from "next/link";
import { CourbeFlux } from "@/components/courbe-flux";
import { Marque } from "@/components/motif";
import { Simule } from "@/components/ui";
import { BoutonTheme } from "@/components/user-button";

// Série d'exemple, simulée, uniquement illustrative (même forme que l'écran commerçant).
const EXEMPLE = [182, 205, 176, 230, 214, 198, 252, 268, 231, 219, 204, 246, 262, 289, 255, 237, 221, 249, 301, 334, 276, 258, 247, 266, 281, 240]
  .map((v) => v * 1000);

const COMMERCANT = [
  { t: "Connecter son compte marchand", d: "Seuls les paiements de clients comptent : ni transferts vers soi-même, ni allers-retours." },
  { t: "Voir combien, et à quel prix", d: "Un plafond calculé sur une mauvaise semaine, l'échéance et le coût total, avant tout engagement." },
  { t: "Choisir son institution", d: "Le commerçant décide à qui il envoie son dossier, et peut retirer son accord." },
  { t: "Rembourser au fil des ventes", d: "Un paiement en deux gestes, un reçu, des rappels sur le canal choisi, trois au plus." },
];
const PRETEUR = [
  { t: "Une file triée par urgence", d: "Les dossiers avec alertes de cohérence passent devant ; le reste attend en retrait." },
  { t: "Une fiche de décision", d: "Montant proposé, facteurs qui ont pesé, points à vérifier. Utilisable au clavier." },
  { t: "Une décision humaine, tracée", d: "Valider, ajuster ou refuser, avec un justificatif obligatoire. Le journal ne se réécrit pas." },
  { t: "Un portefeuille suivi", d: "Échéances, retards et relances respectueuses, institution par institution." },
];

function Apercu() {
  return (
    <figure className="mx-auto w-full max-w-[340px]">
      <div className="rounded-[2.2rem] border border-trait bg-surface p-2.5 shadow-carte">
        <div className="rounded-[1.8rem] bg-fond px-4 pb-5 pt-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <Marque taille={22} />
            <Simule quoi="Exemple simulé" />
          </div>
          <p className="text-sm text-encre-2">Bonjour Afiavi, vous pourriez emprunter</p>
          <p className="montant mt-1 text-[2.5rem] leading-none text-montant">400 000 FCFA</p>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-surface p-3"><dt className="text-encre-2">Par semaine</dt><dd className="chiffres font-semibold">35 000 FCFA</dd></div>
            <div className="rounded-xl bg-surface p-3"><dt className="text-encre-2">Sur</dt><dd className="chiffres font-semibold">12 semaines</dd></div>
          </dl>
          <div className="mt-4"><CourbeFlux serie={EXEMPLE} prudent={210000} median={247000} debut="2026-05-25" /></div>
          <div aria-hidden="true" className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-marque text-sm font-semibold text-fond">Demander ce crédit</div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-encre-2">Maquette de l'écran commerçant, chiffres d'illustration.</figcaption>
    </figure>
  );
}

function Parcours({ titre, qui, etapes, action }: { titre: string; qui: string; etapes: typeof COMMERCANT; action: string }) {
  return (
    <section className="rounded-3xl border border-trait bg-surface p-6 sm:p-8">
      <p className="text-sm font-semibold text-marque">{qui}</p>
      <h2 className="titre mt-1 text-[1.75rem] leading-tight">{titre}</h2>
      <ol className="mt-6 space-y-5">
        {etapes.map((e, k) => (
          <li key={e.t} className="grid grid-cols-[2rem_1fr] gap-3">
            <span aria-hidden="true" className="chiffres flex h-8 w-8 items-center justify-center rounded-full border border-trait text-sm font-semibold text-encre-2">{k + 1}</span>
            <div><h3 className="font-semibold">{e.t}</h3><p className="text-encre-2">{e.d}</p></div>
          </li>
        ))}
      </ol>
      <Link href="/connexion" className="mt-7 inline-flex min-h-12 items-center rounded-xl border border-trait px-5 font-semibold hover:border-encre-3">{action}</Link>
    </section>
  );
}

export default function Accueil() {
  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <header className="flex items-center justify-between gap-3 py-5">
        <Marque />
        <nav className="flex items-center gap-1 text-sm sm:gap-2" aria-label="Accès">
          <BoutonTheme />
          <Link href="/connexion" className="hidden whitespace-nowrap rounded-lg px-3 py-2.5 font-medium hover:bg-surface-2 sm:inline-block">Se connecter</Link>
          <Link href="/demo" className="whitespace-nowrap rounded-lg bg-encre px-2.5 py-2.5 font-semibold text-fond sm:px-3">Démo guidée</Link>
        </nav>
      </header>

      <section className="grid items-center gap-12 pb-16 pt-8 lg:grid-cols-[1.15fr_1fr] lg:pb-24 lg:pt-14">
        <div>
          <h1 className="titre text-[2.5rem] leading-[1.02] sm:text-[4.2rem]">Le crédit qui suit le rythme de vos ventes.</h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-encre-2">
            Kwedo lit les encaissements mobile money d'un petit commerçant, en tire un plafond prudent, son prix et ses
            raisons, puis donne à l'institution de crédit un dossier prêt à décider.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/demo" className="inline-flex min-h-12 items-center rounded-xl bg-marque px-5 font-semibold text-fond shadow-carte">Voir la démo guidée</Link>
            <Link href="/connexion" className="inline-flex min-h-12 items-center rounded-xl border border-trait bg-surface px-5 font-semibold">Ouvrir l'application</Link>
          </div>
          <dl className="mt-10 grid max-w-lg grid-cols-1 gap-4 border-t border-trait pt-6 text-sm sm:grid-cols-3">
            <div><dt className="font-semibold">Aucun frais Kwedo</dt><dd className="text-encre-2">pour le commerçant</dd></div>
            <div><dt className="font-semibold">Le prix d'abord</dt><dd className="text-encre-2">échéance et coût total</dd></div>
            <div><dt className="font-semibold">Un humain décide</dt><dd className="text-encre-2">avec justificatif tracé</dd></div>
          </dl>
        </div>
        <Apercu />
      </section>

      <div className="grid gap-5 pb-16 lg:grid-cols-2">
        <Parcours qui="Pour le commerçant" titre="Savoir combien, à quel prix, et quoi faire." etapes={COMMERCANT} action="Essayer comme commerçant" />
        <Parcours qui="Pour l'institution" titre="Décider vite, sans décider à l'aveugle." etapes={PRETEUR} action="Ouvrir la console prêteur" />
      </div>

      <section className="grid gap-8 border-t border-trait py-14 md:grid-cols-[1fr_1.4fr]">
        <h2 className="titre text-[1.75rem] leading-tight">Ce que Kwedo ne fait pas</h2>
        <ul className="grid gap-x-8 gap-y-4 text-encre-2 sm:grid-cols-2">
          <li><strong className="text-encre">Prêter.</strong> Les institutions agréées prêtent ; Kwedo les outille.</li>
          <li><strong className="text-encre">Prendre une commission</strong> sur le montant prêté, ni de frais de dossier.</li>
          <li><strong className="text-encre">Accuser automatiquement.</strong> Une alerte va à l'agent, qui tranche.</li>
          <li><strong className="text-encre">Lire genre, origine ou religion.</strong> Le moteur ne lit que des flux d'activité.</li>
        </ul>
      </section>

      <footer className="flex flex-col gap-3 border-t border-trait py-8 text-sm text-encre-2 sm:flex-row sm:items-center sm:justify-between">
        <Simule quoi="Prototype, données simulées, personnes et institutions fictives" />
        <p className="max-w-md">Ne prouve pas la performance sur données réelles : un pilote avec une institution est la prochaine étape. <Link href="/design" className="underline">Système de design</Link></p>
      </footer>
    </div>
  );
}
