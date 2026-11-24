"use client";

import { ArrowLeft, Save } from "lucide-react";
import { LienIcone } from "@/components/bouton-icone";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CourbeFlux } from "@/components/courbe-flux";
import { Bouton, Chargement, Erreur, Pastille, Simule } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { useRaccourcis } from "@/lib/clavier";
import { ACTIVITES, date, duree, fcfa, FREQ, nombre, pct, RECO, STATUTS, type Frequence } from "@/lib/format";
import type { Dossier } from "@/lib/types";

type TypeDecision = "valide" | "ajuste" | "refuse" | "complement";
const LIBELLES: Record<TypeDecision, string> = { valide: "Valider le montant proposé", ajuste: "Ajuster le montant", refuse: "Refuser", complement: "Demander un complément" };
const COURTS: Record<TypeDecision, string> = { valide: "Valider", ajuste: "Ajuster", refuse: "Refuser", complement: "Complément" };

function Ligne({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-trait py-2 last:border-b-0">
      <dt className="text-encre-2">{l}</dt>
      <dd className="chiffres text-right font-medium">{v}</dd>
    </div>
  );
}

// Le moteur rédige ses raisons pour le commerçant ; l'agent les lit à la troisième personne.
const pourAgent = (t: string) => t
  .replace(/vous encaissez/g, "le commerçant encaisse")
  .replace(/Vos encaissements/g, "Ses encaissements")
  .replace(/Votre activité/g, "Son activité")
  .replace(/Votre historique/g, "Son historique");
const decimales = (t: string) => t.replace(/(\d)\.(\d)/g, "$1,$2");

const ONGLETS = ["Flux et indicateurs", "Chaîne de calcul", "Modèles", "Journal d'accès"] as const;

/** Onglets ARIA : flèches gauche/droite, Début/Fin ; chaque panneau reste dans le DOM pour ne rien retirer. */
function Onglets({ panneaux }: { panneaux: React.ReactNode[] }) {
  const [actif, setActif] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const aller = (k: number) => { const n = (k + ONGLETS.length) % ONGLETS.length; setActif(n); refs.current[n]?.focus(); };
  const clavier = (e: KeyboardEvent) => {
    const t = { ArrowRight: actif + 1, ArrowLeft: actif - 1, Home: 0, End: ONGLETS.length - 1 }[e.key];
    if (t !== undefined) { e.preventDefault(); aller(t); }
  };
  return (
    <section aria-label="Détail du dossier" className="rounded-2xl border border-trait bg-surface">
      <div role="tablist" aria-label="Détail du dossier" onKeyDown={clavier} className="flex gap-1 overflow-x-auto border-b border-trait px-2 pt-2">
        {ONGLETS.map((o, k) => (
          <button key={o} ref={(el) => { refs.current[k] = el; }} role="tab" id={`onglet-${k}`} aria-selected={actif === k} aria-controls={`panneau-${k}`}
            tabIndex={actif === k ? 0 : -1} onClick={() => setActif(k)}
            className={`min-h-11 shrink-0 whitespace-nowrap rounded-t-lg border-b-2 px-3 font-medium ${actif === k ? "border-marque text-marque" : "border-transparent text-encre-2 hover:text-encre"}`}>
            {o}
          </button>
        ))}
      </div>
      {panneaux.map((p, k) => (
        <div key={k} role="tabpanel" id={`panneau-${k}`} aria-labelledby={`onglet-${k}`} hidden={actif !== k} tabIndex={0} className="p-4">{p}</div>
      ))}
    </section>
  );
}

export default function Fiche() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { donnees: d, erreur, recharger } = useApi<Dossier>(`/dossiers/${id}`);
  const [type, setType] = useState<TypeDecision | null>(null);
  const [montant, setMontant] = useState<number>(0);
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState<{ etat: "idle" | "envoi" | "erreur"; message?: string }>({ etat: "idle" });
  const [enregistree, setEnregistree] = useState(false);
  const motifRef = useRef<HTMLTextAreaElement>(null);

  const [freq, setFreq] = useState<Frequence>("hebdomadaire");
  const [mois, setMois] = useState(6);
  useEffect(() => { if (d) setMontant((m) => m || d.analyse.plafond); }, [d]);
  // Modalités demandées par le commerçant : point de départ de l'ajustement.
  useEffect(() => {
    if (!d) return;
    setFreq(d.frequence);
    setMois(d.duree_mois ?? Math.round((d.analyse.duree_semaines * 12) / 52));
  }, [d]);

  const choisir = (t: TypeDecision) => { setType(t); setTimeout(() => motifRef.current?.focus(), 0); };
  const raccourcis = useMemo(() => ({
    v: () => choisir("valide"), a: () => choisir("ajuste"), r: () => choisir("refuse"), c: () => choisir("complement"),
    Escape: () => router.push("/console"),
  }), [router]);
  const ouvert = d ? ["recu", "en_analyse", "complement"].includes(d.statut) : false;
  useRaccourcis(raccourcis, ouvert);

  if (erreur) return <Erreur message={erreur} reessayer={recharger} />;
  if (!d) return <Chargement lignes={8} label="Chargement du dossier" />;
  const a = d.analyse, ind = a.indicateurs;
  const plafondFormule = a.l_max;
  const alertes = a.alertes ?? [];
  const seuil = a.parametres.seuil_risque;
  const partRisque = Math.min(1, a.risque / Math.max(seuil, 1e-9));
  const moisDemandes = d.duree_mois ?? Math.round((a.duree_semaines * 12) / 52);
  const modifie = freq !== d.frequence || mois !== moisDemandes;

  async function decider() {
    if (!type) return;
    setEnvoi({ etat: "envoi" });
    try {
      await api(`/dossiers/${id}/decisions`, { body: {
        type, motif, montant_decide: type === "ajuste" ? montant : undefined,
        ...(type === "ajuste" && modifie ? { frequence: freq, duree_mois: mois } : {}),
      } });
      setEnregistree(true);
      setEnvoi({ etat: "idle" });
      await recharger();
    } catch (e) {
      setEnvoi({ etat: "erreur", message: e instanceof Error ? e.message : "Erreur" });
    }
  }

  const motifValide = motif.trim().length >= 10;
  const montantValide = type !== "ajuste" || (montant > 0 && (modifie || montant <= plafondFormule));

  return (
    <article className="space-y-4">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <LienIcone href="/console" icone={ArrowLeft} label="Retour à la file (Échap)" ancre="gauche" className="border border-trait" />
          <h1 className="titre text-[1.75rem] leading-tight">{d.commercant.nom}</h1>
          <Pastille ton="info">{STATUTS[d.statut]}</Pastille>
          {!d.consentement_actif && <Pastille ton="alerte">Accord du commerçant retiré : données figées</Pastille>}
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-encre-2">
          <span>{ACTIVITES[d.commercant.type_activite]}, {ind.semaines} semaines d'historique.</span>
          <span>Compte marchand {d.commercant.compte_separe ? "séparé" : "non séparé"} depuis le {date(d.commercant.compte_marchand_ouvert_le)}.</span>
          <span>Identité {d.commercant.identite_verifiee ? "vérifiée" : "non vérifiée"}</span>
          <Simule quoi="vérification simulée" />
        </p>
      </header>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="order-1 min-w-0 space-y-4 xl:order-none xl:col-start-1 xl:row-start-1">
          {/* Synthèse : montant, risque, recommandation */}
          <section aria-labelledby="t-ana" className="grid gap-4 rounded-2xl border border-trait bg-surface p-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div>
              <h2 id="t-ana" className="text-sm font-semibold text-encre-2">Montant proposé par le moteur</h2>
              <p className="montant mt-1 text-[2.6rem] leading-none text-montant">{fcfa(a.plafond)}</p>
              <p className="mt-2 text-encre-2">{a.nb_echeances ?? a.duree_semaines} échéances de {fcfa(a.echeance ?? a.echeance_hebdo)}. Plafond de la formule : {fcfa(plafondFormule)}.</p>
              <p className="mt-1 text-sm" data-testid="modalites-demandees">
                Demandé : <strong>{FREQ[d.frequence_demandee].chaque}</strong>, {duree({ duree_mois: d.duree_mois_demandee, duree_semaines: a.duree_semaines })}
                {(d.frequence !== d.frequence_demandee || d.duree_mois !== d.duree_mois_demandee) && <> · retenu : {FREQ[d.frequence].chaque}, {duree({ duree_mois: d.duree_mois, duree_semaines: d.duree_offre })}</>}
              </p>
              {a.risque_valide === false && <p className="mt-1 text-xs text-ambre-encre">Risque non validé pour cette fréquence : modèle hebdomadaire appliqué à l'échéance équivalente par semaine (ADR 0015).</p>}
            </div>
            <dl className="grid content-start gap-3">
              <div>
                <dt className="text-sm font-semibold text-encre-2">Recommandation</dt>
                <dd className="titre text-xl">{RECO[a.recommandation]}{a.provisoire ? ", provisoire" : ""}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-encre-2">Risque d'impayé annoncé</dt>
                <dd>
                  <span className="chiffres text-lg font-semibold">{pct(a.risque, 1)}</span>
                  <span className="text-encre-2"> pour un seuil de {pct(seuil)}</span>
                  <span aria-hidden="true" className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <span className={`block h-full rounded-full ${partRisque > 0.8 ? "bg-ambre" : "bg-marque"}`} style={{ width: `${partRisque * 100}%` }} />
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          {/* Alertes avant le détail */}
          <section aria-labelledby="t-al">
            <h2 id="t-al" className="mb-2 text-sm font-semibold">Contrôles de cohérence</h2>
            {alertes.length ? (
              <>
                <ul className="space-y-2">
                  {alertes.map((al) => (
                    <li key={al.code} className="flex gap-2 rounded-xl border-l-4 border-ambre bg-ambre-doux px-3 py-2 text-ambre-encre">
                      <span className="sr-only">Alerte : </span>{decimales(al.texte)}
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-xs text-encre-2">Une alerte demande un examen, elle ne prouve rien. Le commerçant n'en est pas informé automatiquement.</p>
              </>
            ) : <p className="rounded-xl bg-bon-doux px-3 py-2 text-bon">Aucune alerte : pas d'aller-retour, de pic ni de concentration anormale.</p>}
          </section>

          {/* Ce qui a pesé */}
          <section aria-labelledby="t-rai">
            <h2 id="t-rai" className="mb-2 text-sm font-semibold">Ce qui a pesé sur le montant</h2>
            <ol className="divide-y divide-trait rounded-2xl border border-trait bg-surface">
              {a.raisons.map((r) => (
                <li key={r.code} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-4 py-2.5">
                  <span>
                    {pourAgent(r.texte)}
                    {r.code === "tendance" && r.effet < 0 && alertes.length > 0 && (
                      <span className="mt-1 flex items-start gap-1.5 text-ambre-encre">
                        <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ambre" />
                        Cette hausse coïncide avec une alerte : à vérifier avant de la retenir.
                      </span>
                    )}
                  </span>
                  <span className="chiffres whitespace-nowrap text-right font-medium text-encre-2">{r.effet ? `${r.effet > 0 ? "−" : "+"}${fcfa(Math.abs(r.effet))}` : ""}</span>
                </li>
              ))}
            </ol>
          </section>

        </div>

        {/* Second niveau : après la décision sur téléphone, sous la synthèse sur grand écran */}
        <div className="order-3 min-w-0 xl:order-none xl:col-start-1">
          <Onglets panneaux={[
            <div key="flux" className="space-y-4">
              <CourbeFlux serie={a.serie_hebdo} prudent={a.encaissement_prudent} median={ind.encaissement_median} debut={ind.debut} dense hauteur={190} />
              <dl className="grid gap-x-8 md:grid-cols-2">
                <Ligne l={`Encaissement prudent (p${a.parametres.percentile})`} v={fcfa(a.encaissement_prudent)} />
                <Ligne l="Encaissement médian" v={fcfa(ind.encaissement_median)} />
                <Ligne l="Régularité (écart relatif)" v={pct(ind.regularite_cv)} />
                <Ligne l="Jours actifs par semaine" v={ind.jours_actifs.toLocaleString("fr-FR")} />
                <Ligne l="Tendance par semaine" v={pct(ind.tendance_hebdo, 1)} />
                <Ligne l="Saisonnalité (pics)" v={pct(ind.saisonnalite)} />
                <Ligne l="Payeurs distincts" v={nombre(ind.payeurs_distincts)} />
                <Ligne l="Part du plus gros payeur" v={pct(ind.part_plus_gros_payeur)} />
                <Ligne l="Part des flux pros" v={pct(ind.part_flux_pro)} />
                <Ligne l="Ancienneté" v={`${ind.semaines} sem.`} />
                <Ligne l="Exclu : vers soi-même" v={fcfa(ind.exclu_transferts_soi)} />
                <Ligne l="Exclu : circulaires" v={fcfa(ind.exclu_circulaires)} />
              </dl>
            </div>,
            <div key="calcul">
              <ol className="list-decimal space-y-1 pl-5">{a.chaine_calcul.map((l) => <li key={l}>{decimales(l).replace(/annoncé [\d,]+\s?%/, `annoncé ${pct(a.risque, 1)}`)}</li>)}</ol>
              <p className="mt-3 text-xs text-encre-2">Moteur {d.version_moteur}, graine {d.graine}, {decimales(`m=${a.parametres.m}, s=${a.parametres.s}, n=${a.parametres.n}, i=${a.parametres.i}`)}, {nombre(a.parametres.trajectoires)} trajectoires.</p>
            </div>,
            <div key="modeles">
              {a.modeles ? (
                <>
                  <Simule quoi="Modèles entraînés sur données simulées" />
                  <dl className="mt-2 max-w-md">
                    <Ligne l={`Prévision (${a.modeles.horizon_semaines} sem.)`} v={`${fcfa(a.modeles.prevision_hebdo)} par sem.`} />
                    <Ligne l="Probabilité de défaut" v={pct(a.modeles.proba_defaut, 1)} />
                    <Ligne l="Score d'anomalie" v={a.modeles.score_anomalie.toLocaleString("fr-FR")} />
                  </dl>
                  <p className="mt-2 text-xs text-encre-2">La probabilité de défaut est le risque calibré au montant proposé ; la formule reste le plafond.</p>
                </>
              ) : <p className="text-encre-2">Aucun modèle appliqué à ce dossier.</p>}
            </div>,
            <ul key="acces" className="space-y-1">
              {d.acces.length ? d.acces.map((x, k) => <li key={k} className="flex flex-wrap gap-x-3"><span className="chiffres text-encre-2">{date(x.horodatage, true)}</span><span>{x.acteur}</span><span className="text-encre-2">{x.action}</span></li>)
                : <li className="text-encre-2">Aucun accès enregistré.</li>}
            </ul>,
          ]} />
        </div>

        {/* Décision : colonne fixe à droite sur grand écran, juste après les raisons sur téléphone */}
        <aside className="order-2 space-y-4 xl:order-none xl:sticky xl:top-5 xl:col-start-2 xl:row-span-2 xl:row-start-1">
          <section aria-labelledby="t-dec" className="rounded-2xl border border-trait bg-surface p-4 shadow-carte">
            <h2 id="t-dec" className="titre mb-3 text-lg">Décision</h2>
            {ouvert ? (
              <form onSubmit={(e) => { e.preventDefault(); void decider(); }} className="space-y-3">
                <fieldset className="grid grid-cols-2 gap-2">
                  <legend className="sr-only">Type de décision</legend>
                  {(Object.keys(LIBELLES) as TypeDecision[]).map((t) => (
                    <label key={t} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 ${type === t ? (t === "refuse" ? "border-alerte bg-alerte-doux text-alerte" : "border-marque bg-marque-doux text-marque") : "border-trait bg-fond hover:border-encre-3"}`}>
                      <input type="radio" name="type" checked={type === t} onChange={() => choisir(t)} className="accent-[var(--marque)]" aria-label={LIBELLES[t]} />
                      <span className="flex-1 font-medium" aria-hidden="true">{COURTS[t]}</span>
                      <kbd className="rounded border border-trait px-1.5 text-[11px] text-encre-2">{t[0]}</kbd>
                    </label>
                  ))}
                </fieldset>
                {type === "ajuste" && (
                  <label className="block">
                    Montant décidé (FCFA)
                    <input inputMode="numeric" value={nombre(montant)} onChange={(e) => setMontant(Number(e.target.value.replace(/\D/g, "")) || 0)}
                      className="chiffres mt-1 block min-h-11 w-full rounded-xl border border-trait bg-fond px-3" aria-invalid={!montantValide} />
                    <span className={`text-xs ${montantValide ? "text-encre-2" : "text-alerte"}`}>
                      {modifie ? "Nouvelles modalités : le plafond de la formule est recontrôlé à l'enregistrement." : `Plafond de la formule : ${fcfa(plafondFormule)}. Il ne peut pas être dépassé.`}
                    </span>
                  </label>
                )}
                {type === "ajuste" && (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-sm">
                      Fréquence
                      <select value={freq} onChange={(e) => setFreq(e.target.value as Frequence)} className="mt-1 block min-h-11 w-full rounded-xl border border-trait bg-fond px-2">
                        {d.modalites.frequences.map((f) => <option key={f} value={f}>{FREQ[f].nom}</option>)}
                      </select>
                    </label>
                    <label className="block text-sm">
                      Durée
                      <select value={mois} onChange={(e) => setMois(Number(e.target.value))} className="mt-1 block min-h-11 w-full rounded-xl border border-trait bg-fond px-2">
                        {Array.from({ length: d.modalites.duree_max_mois - d.modalites.duree_min_mois + 1 }, (_, k) => d.modalites.duree_min_mois + k)
                          .map((m) => <option key={m} value={m}>{m} mois</option>)}
                      </select>
                    </label>
                    <span className="col-span-2 text-xs text-encre-2">Limites de l'institution : {d.modalites.frequences.map((f) => FREQ[f].chaque).join(", ")} ; {d.modalites.duree_min_mois} à {d.modalites.duree_max_mois} mois.</span>
                  </div>
                )}
                <label className="block">
                  Justificatif {type === "refuse" ? "(motif du refus)" : ""} <span className="text-alerte">*</span>
                  <textarea ref={motifRef} value={motif} onChange={(e) => setMotif(e.target.value)} rows={3} required minLength={10}
                    placeholder="Ex. : saison creuse en janvier, prudence sur le montant."
                    className="mt-1 block w-full rounded-xl border border-trait bg-fond px-3 py-2" />
                  <span className="text-xs text-encre-2">Obligatoire, 10 caractères au moins. Enregistré au journal, non modifiable.</span>
                </label>
                {envoi.etat === "erreur" && <Erreur message={envoi.message ?? "Erreur"} />}
                <Bouton type="submit" icone={Save} className="w-full" disabled={!type || !motifValide || !montantValide || envoi.etat === "envoi"}>
                  {envoi.etat === "envoi" ? "Enregistrement…" : "Enregistrer la décision"}
                </Bouton>
              </form>
            ) : (
              <div className="space-y-3">
                {d.decisions.map((x) => (
                  <div key={x.id} className="apparait space-y-1">
                    <p className="font-semibold">{LIBELLES[x.type as TypeDecision]}</p>
                    <p className="chiffres">Proposé {fcfa(x.montant_propose)}, décidé {fcfa(x.montant_decide)}</p>
                    <p className="italic">« {x.motif} »</p>
                    <p className="text-xs text-encre-2">{x.auteur}, {date(x.horodatage, true)}, moteur {x.version_moteur}, graine {x.graine}</p>
                  </div>
                ))}
                {enregistree && <p role="status" className="rounded-xl bg-bon-doux px-3 py-2 font-medium text-bon">Décision enregistrée au journal.</p>}
              </div>
            )}
          </section>
        </aside>
      </div>
    </article>
  );
}
