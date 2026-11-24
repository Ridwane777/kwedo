import { ArrowRight, Building2, Check, Lock, MessageSquareText, ShieldCheck, Store, UserCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { CourbeFlux } from "@/components/courbe-flux";
import { Cauri, Marque, PileCauris } from "@/components/motif";
import { Simule } from "@/components/ui";
import { BoutonTheme } from "@/components/user-button";
import { Capture, Telephone } from "@/components/vitrine/telephone";
import { SimulateurVitrine } from "@/components/vitrine/simulateur";

// Série d'exemple, simulée, uniquement illustrative.
const EXEMPLE = [182, 205, 176, 230, 214, 198, 252, 268, 231, 219, 204, 246, 262, 289, 255, 237, 221, 249, 301, 334, 276, 258, 247, 266, 281, 240].map((v) => v * 1000);

const SCENE = [
  { t: "Les encaissements", d: "Le commerçant autorise la lecture de son compte marchand. Seuls les paiements de clients comptent : les transferts vers soi-même et les allers-retours sont écartés." },
  { t: "Un plafond prudent", d: "On part d'une mauvaise semaine, pas de la moyenne. La formule donne une échéance supportable, puis le plafond, avec son prix et ses raisons." },
  { t: "Un dossier prêt", d: "Le commerçant choisit à quelle institution il l'envoie. L'agent reçoit indicateurs, alertes de cohérence, montant proposé et facteurs qui ont pesé." },
  { t: "Une décision humaine", d: "L'agent valide, ajuste ou refuse avec un justificatif obligatoire. Tout est tracé ; le commerçant voit l'offre et son coût avant d'accepter." },
];

const FAQ = [
  ["Kwedo prête-t-il de l'argent ?", "Non. Les institutions de crédit prêtent et décident. Kwedo calcule une capacité de remboursement, prépare le dossier et suit les échéances."],
  ["Combien coûte Kwedo au commerçant ?", "Rien : aucun frais de dossier, aucune commission sur le montant. Le seul coût est l'intérêt de l'institution, affiché avant l'accord."],
  ["Quelles données sont lues ?", "Les encaissements du compte marchand, avec l'accord du commerçant, institution par institution. L'accord se retire à tout moment ; le genre, l'origine ou la religion ne sont jamais utilisés."],
  ["Faut-il installer une application ?", "Non. Kwedo est une application web pensée d'abord pour le téléphone ; elle s'ouvre dans le navigateur et peut s'ajouter à l'écran d'accueil."],
  ["Le score décide-t-il à la place de l'agent ?", "Non. Le moteur propose un montant et ses raisons ; une alerte demande un examen, elle ne prouve rien. L'agent tranche, avec un justificatif conservé au journal."],
  ["Les chiffres affichés sont-ils réels ?", "Non. Ce prototype tourne sur des données entièrement simulées, avec des personnes et des institutions fictives."],
];

function Section({ id, titre, intro, children, className = "", fond = false }: { id: string; titre: string; intro?: React.ReactNode; children: React.ReactNode; className?: string; fond?: boolean }) {
  return (
    <section id={id} aria-labelledby={`t-${id}`} className={`gouttiere py-[clamp(4rem,9vw,8rem)] ${fond ? "bg-surface" : ""} ${className}`}>
      <div className="revele mb-[clamp(2rem,4vw,3.5rem)] grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
        <h2 id={`t-${id}`} className="titre max-w-[18ch] text-[clamp(2rem,4.2vw,3.6rem)] leading-[1.02]">{titre}</h2>
        {intro && <div className="max-w-[60ch] text-lg leading-relaxed text-encre-2">{intro}</div>}
      </div>
      {children}
    </section>
  );
}

function Navigateur({ nom, alt, className = "" }: { nom: string; alt: string; className?: string }) {
  return (
    <figure className={`overflow-hidden rounded-2xl border border-trait bg-surface ${className}`}>
      <div aria-hidden="true" className="flex items-center gap-1.5 border-b border-trait px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-surface-3" /><span className="h-2.5 w-2.5 rounded-full bg-surface-3" /><span className="h-2.5 w-2.5 rounded-full bg-surface-3" />
      </div>
      <div className="aspect-[1280/800]"><Capture nom={nom} alt={alt} l={1280} h={800} sizes="(min-width: 1024px) 50vw, 100vw" /></div>
    </figure>
  );
}

export default function Accueil() {
  return (
    <div className="overflow-x-clip">
      <header className="gouttiere sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-transparent bg-fond/85 py-3 backdrop-blur">
        <Link href="/" aria-label="Kwedo, accueil"><Marque /></Link>
        <nav aria-label="Sections" className="hidden items-center gap-1 text-sm font-medium lg:flex">
          {[["#solution", "La solution"], ["#app", "L'app"], ["#simulateur", "Simulateur"], ["#institutions", "Institutions"], ["#faq", "Questions"]].map(([h, l]) => (
            <a key={h} href={h} className="rounded-lg px-3 py-2 text-encre-2 hover:bg-surface-2 hover:text-encre">{l}</a>
          ))}
        </nav>
        <div className="flex items-center gap-1 text-sm sm:gap-2">
          <BoutonTheme />
          <Link href="/connexion" className="hidden whitespace-nowrap rounded-lg px-3 py-2.5 font-medium hover:bg-surface-2 sm:inline-block">Se connecter</Link>
          <Link href="/demo" className="whitespace-nowrap rounded-lg bg-encre px-3 py-2.5 font-semibold text-fond">Démo guidée</Link>
        </div>
      </header>

      <main>
        {/* 1. Héros */}
        <section aria-labelledby="t-heros" className="gouttiere grid items-center gap-[clamp(2.5rem,5vw,5rem)] pb-[clamp(4rem,8vw,7rem)] pt-[clamp(2rem,5vw,4.5rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <Simule quoi="Prototype, données simulées" />
            <h1 id="t-heros" className="titre mt-5 max-w-[14ch] text-[clamp(2.6rem,6.4vw,5.6rem)] leading-[0.98]">Le crédit qui suit le rythme de vos ventes.</h1>
            <p className="mt-6 max-w-[52ch] text-[clamp(1.05rem,1.4vw,1.25rem)] leading-relaxed text-encre-2">
              Kwedo lit les encaissements mobile money d'un petit commerçant, en tire un plafond prudent avec son prix et ses raisons,
              puis donne à l'institution de crédit un dossier prêt à décider.
            </p>
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
              <Link href="/connexion" className="group flex min-h-16 items-center gap-3 rounded-2xl bg-action px-5 font-semibold text-sur-action">
                <Store aria-hidden="true" size={22} strokeWidth={1.75} />
                <span className="flex-1">Je suis commerçant</span>
                <ArrowRight aria-hidden="true" size={20} strokeWidth={1.75} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/connexion" className="group flex min-h-16 items-center gap-3 rounded-2xl border border-trait bg-surface px-5 font-semibold">
                <Building2 aria-hidden="true" size={22} strokeWidth={1.75} />
                <span className="flex-1">Je représente une institution</span>
                <ArrowRight aria-hidden="true" size={20} strokeWidth={1.75} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            {/* Pourquoi nous faire confiance : des engagements vérifiables dans l'app, pas des chiffres. */}
            <ul className="mt-10 grid max-w-2xl gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {[
                [Wallet, "Aucun frais Kwedo, le coût total affiché avant l'accord"],
                [UserCheck, "Un humain décide, avec un justificatif tracé"],
                [Lock, "Accord par institution, retirable à tout moment"],
                [ShieldCheck, "Chaque institution ne voit que ses dossiers"],
              ].map(([I, t]) => {
                const Icone = I as typeof Wallet;
                return <li key={t as string} className="flex items-start gap-2.5"><Icone aria-hidden="true" size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-marque" /><span>{t as string}</span></li>;
              })}
            </ul>
          </div>

          {/* Scène : le téléphone fait défiler les vrais écrans ; la courbe et le montant se construisent. */}
          <div className="relative mx-auto grid w-full max-w-[44rem] grid-cols-[minmax(0,1fr)] place-items-center sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-6">
            <Telephone prioritaire largeur="clamp(15rem, 24vw, 20rem)" ecrans={[
              { nom: "estimation", alt: "Écran Estimation de l'application : montant empruntable, échéance, coût total et bouton d'envoi du dossier" },
              { nom: "simulateur", alt: "" }, { nom: "offre", alt: "" }, { nom: "echeancier", alt: "" },
            ]} />
            <div className="mt-6 grid w-full gap-4 sm:mt-0">
              <div className="rounded-3xl border border-trait bg-surface p-5">
                <p className="text-sm text-encre-2">Plafond d'exemple</p>
                <p className="montant whitespace-nowrap text-[clamp(1.9rem,2.6vw,2.8rem)] leading-none text-montant">
                  <span aria-hidden="true"><span className="compteur" style={{ "--cible": 400 } as React.CSSProperties} /> 000 FCFA</span>
                  <span className="sr-only">400 000 FCFA</span>
                </p>
                <div className="mt-4"><CourbeFlux serie={EXEMPLE} prudent={210000} median={247000} debut="2026-05-25" hauteur={170} /></div>
              </div>
              <div className="flex items-center gap-4 rounded-3xl border border-trait bg-surface p-5">
                <PileCauris part={0.5} total={6} className="h-24 w-12 shrink-0" />
                <p className="text-sm text-encre-2">Chaque échéance payée ajoute un cauri à la pile. En fon, <i lang="fon">akwɛ́</i> signifie à la fois cauri et argent.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Le problème */}
        <Section id="probleme" fond titre="Vendre tous les jours, et rester invisible pour le crédit."
          intro={<p>Une vendeuse encaisse chaque jour par mobile money, mais sans bilan ni historique bancaire, son dossier ne rentre dans aucune case. Les ventes existent ; elles ne se lisent pas.</p>}>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["≈ 11,66 millions", "comptes mobile money actifs au Bénin (2025)"],
              ["≈ 5 222 FCFA", "montant moyen d'une opération (2025)"],
              ["39,8 %", "inclusion financière au sens strict"],
            ].map(([v, l]) => (
              <div key={l} className="revele rounded-3xl border border-trait bg-fond p-6">
                <p className="montant text-[clamp(1.8rem,3vw,2.6rem)] leading-none">{v}</p>
                <p className="mt-2 text-encre-2">{l}</p>
                <span className="mt-4 inline-block rounded-full bg-ambre-doux px-2.5 py-0.5 text-xs font-semibold text-ambre-encre">à recontrôler</span>
              </div>
            ))}
          </div>
          <p className="mt-4 max-w-[70ch] text-sm text-encre-2">Chiffres issus de la recherche préalable de l'équipe, sans source conservée pour chacun : ils seront vérifiés avant toute publication.</p>
        </Section>

        {/* 3. La solution en une scène, racontée au défilement */}
        <Section id="solution" titre="Des ventes à une décision, en quatre temps."
          intro={<p>Chaque étape garde une trace lisible : ce qui a été lu, ce qui a été calculé, ce qui a été décidé et par qui.</p>}>
          <ol className="relative grid gap-[clamp(2rem,4vw,3.5rem)]">
            <span aria-hidden="true" className="absolute bottom-6 left-[1.35rem] top-6 w-px bg-trait" />
            <span aria-hidden="true" className="fil-progres absolute bottom-6 left-[1.35rem] top-6 w-px bg-marque" />
            {SCENE.map((e, k) => (
              <li key={e.t} className="revele relative grid gap-6 pl-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
                <span aria-hidden="true" className="chiffres absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full border border-trait bg-surface font-semibold">{k + 1}</span>
                <div>
                  <h3 className="titre text-[clamp(1.4rem,2.2vw,2rem)]">{e.t}</h3>
                  <p className="mt-2 max-w-[52ch] text-lg leading-relaxed text-encre-2">{e.d}</p>
                </div>
                <div className="rounded-3xl border border-trait bg-surface p-5">
                  {k === 0 && (
                    <ul className="divide-y divide-trait text-sm">
                      {[["Client · tissu", "+ 18 500", true], ["Client · tissu", "+ 7 200", true], ["Vers mon autre compte", "+ 50 000", false], ["Client · pagne", "+ 12 000", true], ["Aller-retour même numéro", "+ 30 000", false]].map(([l, v, ok], i) => (
                        <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                          <span className={ok ? "" : "text-encre-3 line-through"}>{l as string}</span>
                          <span className="flex items-center gap-2"><span className={`chiffres ${ok ? "font-semibold" : "text-encre-3 line-through"}`}>{v as string} FCFA</span>
                            {ok ? <Check aria-label="compté" size={16} className="text-bon" /> : <span className="text-xs text-encre-2">écarté</span>}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {k === 1 && <CourbeFlux serie={EXEMPLE} prudent={210000} median={247000} debut="2026-05-25" hauteur={150} />}
                  {k === 2 && (
                    <div className="space-y-2 text-sm">
                      <p className="flex justify-between"><span className="text-encre-2">Montant proposé</span><span className="chiffres font-semibold">400 000 FCFA</span></p>
                      <p className="flex justify-between"><span className="text-encre-2">Risque annoncé</span><span className="chiffres font-semibold">6,1 % pour un seuil de 10 %</span></p>
                      <p className="rounded-xl border-l-4 border-ambre bg-ambre-doux px-3 py-2 text-ambre-encre">Alerte : pic de ventes juste avant la demande, à vérifier.</p>
                      <p className="text-xs text-encre-2">Exemple de fiche, chiffres d'illustration.</p>
                    </div>
                  )}
                  {k === 3 && (
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-3 gap-2">
                        {["Valider", "Ajuster", "Refuser"].map((b, i) => <span key={b} className={`rounded-xl border px-3 py-2.5 text-center font-semibold ${i === 1 ? "border-marque bg-marque-doux text-marque" : "border-trait"}`}>{b}</span>)}
                      </div>
                      <p className="rounded-xl bg-fond px-3 py-2.5 italic">« Saison creuse en janvier pour les tissus : prudence sur le montant. »</p>
                      <p className="text-xs text-encre-2">Justificatif obligatoire, enregistré au journal, non modifiable.</p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* 4. L'app mobile : vrais écrans */}
        <Section id="app" fond titre="Une app pensée pour le téléphone."
          intro={<p>Combien, à quel prix, que faire maintenant : chaque écran répond à une question. C'est une application web : elle s'ouvre dans le navigateur, sans magasin d'applications.</p>}>
          <ul className="-mx-[clamp(1.25rem,4.5vw,5rem)] flex snap-x snap-mandatory gap-[clamp(1rem,2vw,2rem)] overflow-x-auto px-[clamp(1.25rem,4.5vw,5rem)] pb-4 xl:mx-0 xl:grid xl:grid-cols-5 xl:overflow-visible xl:px-0">
            {[
              ["estimation", "Estimation", "Le plafond, l'échéance et le coût total, d'un coup d'œil."],
              ["simulateur", "Simulateur", "« Et si mes ventes baissaient ? » Le plafond réagit en direct."],
              ["offre", "Offre", "Montant, durée, taux et coût total avant d'accepter."],
              ["echeancier", "Échéancier", "Chaque échéance, payée ou à venir, et le reste dû."],
              ["rappels", "Rappels", "Des messages courtois, sur le canal choisi, trois au plus."],
            ].map(([nom, titre, texte], k) => (
              <li key={nom} className="revele w-[min(17rem,72vw)] shrink-0 snap-center xl:w-auto" style={{ animationDelay: `${k * 60}ms` }}>
                <Telephone largeur="100%" ecrans={[{ nom: nom!, alt: `Écran ${titre} de l'application Kwedo (données simulées)` }]} />
                <h3 className="mt-4 font-semibold">{titre}</h3>
                <p className="max-w-[34ch] text-encre-2">{texte}</p>
              </li>
            ))}
          </ul>
        </Section>

        {/* 5. Simulateur interactif */}
        <Section id="simulateur" titre="Essayez : bougez vos ventes."
          intro={<p>Le plafond part d'une mauvaise semaine. Faites varier les ventes habituelles et une baisse possible : la courbe et le montant suivent.</p>}>
          <SimulateurVitrine />
        </Section>

        {/* 6. Comment le plafond est calculé */}
        <Section id="calcul" fond titre="Comment le plafond est calculé."
          intro={<p>Une formule lisible, un test de résistance, des contrôles, puis une personne. Chaque étape peut baisser le montant ; aucune ne peut dépasser la formule.</p>}>
          <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <li className="revele rounded-3xl border border-trait bg-fond p-6">
              <p className="text-sm font-semibold text-marque">1. La formule</p>
              <p className="montant mt-3 text-[clamp(1.3rem,2vw,1.7rem)] leading-snug">R = Cₚ × m × s</p>
              <p className="montant text-[clamp(1.1rem,1.7vw,1.4rem)] leading-snug">L = R × (1 − (1 + i)⁻ⁿ) / i</p>
              <p className="mt-3 text-encre-2">Cₚ : une mauvaise semaine. m : la marge. s : la part prélevable. L : le plafond, jamais dépassé.</p>
            </li>
            <li className="revele rounded-3xl border border-trait bg-fond p-6">
              <p className="text-sm font-semibold text-marque">2. 2 000 scénarios</p>
              <svg aria-hidden="true" viewBox="0 0 200 90" className="mt-3 h-24 w-full">
                {Array.from({ length: 22 }, (_, k) => {
                  const a = (k - 11) * 2.6;
                  return <path key={k} d={`M0 45 C60 ${45 - a * 0.4} 120 ${45 - a} 200 ${45 - a * 1.7}`} fill="none" stroke="var(--marque)" strokeOpacity={0.12 + (k % 5) * 0.05} />;
                })}
                <path d="M0 45 C60 47 120 52 200 60" fill="none" stroke="var(--alerte)" strokeWidth="2" />
              </svg>
              <p className="mt-2 text-encre-2">Des avenirs plausibles de ventes, avec chocs. On garde le plus gros montant dont le risque reste sous le seuil de l'institution.</p>
            </li>
            <li className="revele rounded-3xl border border-trait bg-fond p-6">
              <p className="text-sm font-semibold text-marque">3. Les contrôles</p>
              <ul className="mt-3 space-y-2 text-encre-2">
                {["Transferts vers soi-même écartés", "Allers-retours repérés", "Pic juste avant la demande signalé", "Concentration sur un seul payeur"].map((c) => (
                  <li key={c} className="flex gap-2"><Check aria-hidden="true" size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-bon" />{c}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-encre-2">Une alerte demande un examen ; elle n'accuse personne.</p>
            </li>
            <li className="revele rounded-3xl border border-trait bg-fond p-6">
              <p className="text-sm font-semibold text-marque">4. Une personne décide</p>
              <UserCheck aria-hidden="true" size={40} strokeWidth={1.5} className="mt-3 text-encre-2" />
              <p className="mt-3 text-encre-2">L'agent de crédit valide, ajuste ou refuse, avec un justificatif. Le montant décidé ne peut pas dépasser la formule.</p>
            </li>
          </ol>
        </Section>

        {/* 7. Pour les institutions */}
        <Section id="institutions" titre="Pour les institutions : une console de décision."
          intro={<p>Une file triée par urgence, une fiche qui tient en un écran, un portefeuille suivi, et des données cloisonnées entre institutions.</p>}>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <Navigateur nom="console-fiche" alt="Fiche de décision de la console : montant proposé, risque, alertes, raisons et formulaire de décision (données simulées)" className="revele" />
            <div className="grid gap-6">
              <Navigateur nom="console-file" alt="File de dossiers de la console, alertes d'abord (données simulées)" className="revele" />
              <ul className="revele grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {[
                  ["File d'exception", "Les dossiers avec alertes passent devant."],
                  ["Fiche au clavier", "Valider, ajuster, refuser : v, a, r."],
                  ["Portefeuille", "Échéances, retards, relances, reprogrammation."],
                  ["Cloisonnement", "Chaque institution ne voit que ses dossiers et ses réglages."],
                ].map(([t, d]) => (
                  <li key={t} className="rounded-2xl border border-trait bg-surface p-4"><p className="font-semibold">{t}</p><p className="text-encre-2">{d}</p></li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* 8. Confiance et limites */}
        <Section id="confiance" fond titre="Ce que Kwedo promet, et ce qu'il ne fait pas.">
          <div className="grid gap-6 lg:grid-cols-2">
            <ul className="revele grid gap-4 sm:grid-cols-2">
              {[
                [Lock, "Accord retirable", "Le commerçant choisit chaque institution et peut retirer son accord ; les données sont alors figées."],
                [Wallet, "Aucun frais Kwedo", "Ni frais de dossier, ni commission sur le montant prêté."],
                [MessageSquareText, "Relances respectueuses", "Canal choisi, trois messages au plus par échéance, entre 8 h et 20 h, jamais à l'entourage."],
                [UserCheck, "Décision humaine", "Le moteur propose ; l'agent tranche et justifie."],
              ].map(([I, t, d]) => {
                const Icone = I as typeof Lock;
                return (
                  <li key={t as string} className="rounded-3xl border border-trait bg-fond p-5">
                    <Icone aria-hidden="true" size={22} strokeWidth={1.75} className="text-marque" />
                    <p className="mt-3 font-semibold">{t as string}</p><p className="text-encre-2">{d as string}</p>
                  </li>
                );
              })}
            </ul>
            <div className="revele rounded-3xl border border-trait bg-fond p-6">
              <h3 className="titre text-2xl">Kwedo ne fait pas</h3>
              <ul className="mt-4 space-y-3 text-encre-2">
                <li><strong className="text-encre">Prêter.</strong> Les institutions agréées prêtent ; Kwedo les outille.</li>
                <li><strong className="text-encre">Accuser automatiquement.</strong> Une alerte va à l'agent, qui tranche.</li>
                <li><strong className="text-encre">Lire genre, origine ou religion.</strong> Le moteur ne lit que des flux d'activité.</li>
                <li><strong className="text-encre">Relancer l'entourage.</strong> Le rappel ne va qu'au commerçant.</li>
                <li><strong className="text-encre">Promettre un gain de temps.</strong> Il n'a pas encore été mesuré avec de vrais agents.</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* 9. Où on en est, FAQ, appel à l'action */}
        <Section id="etat" titre="Où on en est."
          intro={<p>Kwedo est un prototype qui tourne sur des données entièrement simulées. La prochaine étape est un pilote avec une institution, sur de vrais remboursements.</p>}>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="revele rounded-3xl border border-trait bg-surface p-6 lg:col-span-2">
              <h3 className="font-semibold">Ce que montrent les essais, honnêtement</h3>
              <p className="mt-2 max-w-[70ch] text-encre-2">
                Sur le jeu de test simulé, les plafonds proposés ont donné moins d'impayés que deux règles simples (0,93 % contre 1,25 % et 1,23 %).
                <strong className="text-encre"> Sur des activités jamais vues pendant le réglage, l'écart disparaît</strong> (1,41 % contre 1,43 % et 1,40 %),
                et le risque annoncé reste sous-estimé quand la simulation change. Rien de cela n'est une preuve sur le terrain.
              </p>
              <Simule quoi="Résultats sur données simulées" className="mt-4" />
            </div>
            <ol className="revele space-y-3 rounded-3xl border border-trait bg-surface p-6">
              {[["Prototype complet", true], ["Démo guidée de bout en bout", true], ["Pilote avec une institution", false], ["Calibrage sur vrais remboursements", false]].map(([t, fait]) => (
                <li key={t as string} className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${fait ? "bg-bon-doux text-bon" : "border border-trait text-encre-3"}`}>{fait ? <Check aria-hidden="true" size={16} /> : <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-encre-3" />}</span>
                  <span>{t as string}<span className="sr-only">{fait ? " : fait" : " : à venir"}</span></span>
                </li>
              ))}
            </ol>
          </div>
        </Section>

        <Section id="faq" fond titre="Questions fréquentes.">
          <div className="grid gap-x-10 lg:grid-cols-2">
            {FAQ.map(([q, r]) => (
              <details key={q} className="group border-b border-trait py-1">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                  {q}<span aria-hidden="true" className="text-xl text-encre-2 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-[62ch] pb-4 text-encre-2">{r}</p>
              </details>
            ))}
          </div>
        </Section>

        <section aria-labelledby="t-cta" className="gouttiere py-[clamp(4rem,9vw,8rem)]">
          <div className="revele grid items-center gap-8 rounded-[2rem] border border-trait bg-surface p-[clamp(1.5rem,4vw,4rem)] lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <h2 id="t-cta" className="titre max-w-[20ch] text-[clamp(2rem,4vw,3.4rem)] leading-[1.02]">Voyez le parcours complet en quatre minutes.</h2>
              <p className="mt-3 max-w-[56ch] text-lg text-encre-2">La démo guidée joue les deux côtés : le téléphone du commerçant et la console de l'institution.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/demo" className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-action px-6 font-semibold text-sur-action">Lancer la démo guidée<ArrowRight aria-hidden="true" size={20} strokeWidth={1.75} /></Link>
              <Link href="/connexion" className="inline-flex min-h-14 items-center rounded-2xl border border-trait px-6 font-semibold">Ouvrir l'application</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="gouttiere border-t border-trait py-12 text-sm">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div className="space-y-4">
            <Marque />
            <p className="max-w-[40ch] text-encre-2">Le crédit qui suit le rythme des ventes des petits commerçants.</p>
            <Simule quoi="Prototype, données simulées, personnes et institutions fictives" />
          </div>
          {[
            ["Produit", [["#solution", "La solution"], ["#app", "L'app mobile"], ["#simulateur", "Simulateur"], ["#calcul", "Le calcul"]]],
            ["Accès", [["/connexion", "Se connecter"], ["/demo", "Démo guidée"], ["/app/inscription", "Créer un profil commerçant"]]],
            ["Ressources", [["#faq", "Questions fréquentes"], ["#confiance", "Engagements et limites"], ["/design", "Système de design"]]],
          ].map(([titre, liens]) => (
            <nav key={titre as string} aria-label={titre as string}>
              <p className="font-semibold">{titre as string}</p>
              <ul className="mt-3 space-y-1">
                {(liens as string[][]).map(([h, l]) => <li key={h}><Link href={h!} className="inline-flex min-h-9 items-center text-encre-2 hover:text-encre">{l}</Link></li>)}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-trait pt-6 text-encre-2">
          <p className="flex items-center gap-2"><Cauri taille={16} mono /> Kwedo, prototype. Ne prouve pas la performance sur données réelles.</p>
          <p>Aucun magasin d'applications : application web.</p>
        </div>
      </footer>
    </div>
  );
}
