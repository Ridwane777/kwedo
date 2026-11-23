"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chronometre } from "@/components/chronometre";
import { CourbeFlux } from "@/components/courbe-flux";
import { Bouton, Chargement, Erreur, Pastille, Simule } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { useRaccourcis } from "@/lib/clavier";
import { ACTIVITES, date, fcfa, nombre, pct, RECO, STATUTS } from "@/lib/format";
import type { Dossier } from "@/lib/types";

type TypeDecision = "valide" | "ajuste" | "refuse" | "complement";
const LIBELLES: Record<TypeDecision, string> = { valide: "Valider le montant proposé", ajuste: "Ajuster le montant", refuse: "Refuser", complement: "Demander un complément" };

function Ligne({ l, v, aide }: { l: string; v: string; aide?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-trait py-1.5" title={aide}>
      <dt className="text-encre-2">{l}</dt>
      <dd className="chiffres text-right">{v}</dd>
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

export default function Fiche() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { donnees: d, erreur, recharger } = useApi<Dossier>(`/dossiers/${id}`);
  const [type, setType] = useState<TypeDecision | null>(null);
  const [montant, setMontant] = useState<number>(0);
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState<{ etat: "idle" | "envoi" | "erreur"; message?: string }>({ etat: "idle" });
  const [duree, setDuree] = useState<number | null>(null);
  const debut = useRef<number>(performance.now());
  const motifRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (d) setMontant((m) => m || d.analyse.plafond); }, [d]);

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

  async function decider() {
    if (!type) return;
    setEnvoi({ etat: "envoi" });
    try {
      await api(`/dossiers/${id}/decisions`, { body: { type, motif, montant_decide: type === "ajuste" ? montant : undefined } });
      setDuree((performance.now() - debut.current) / 1000);
      setEnvoi({ etat: "idle" });
      await recharger();
    } catch (e) {
      setEnvoi({ etat: "erreur", message: e instanceof Error ? e.message : "Erreur" });
    }
  }

  const motifValide = motif.trim().length >= 10;
  const montantValide = type !== "ajuste" || (montant > 0 && montant <= plafondFormule);

  return (
    <article className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-trait pb-3">
        <div>
          <Link href="/console" className="text-xs text-indigo hover:underline">← File <kbd className="text-encre-2">Échap</kbd></Link>
          <h1 className="titre text-2xl">{d.commercant.nom}</h1>
          <p className="text-encre-2">
            {ACTIVITES[d.commercant.type_activite]} · compte marchand {d.commercant.compte_separe ? "séparé" : "non séparé"} depuis le {date(d.commercant.compte_marchand_ouvert_le)}
            · identité {d.commercant.identite_verifiee ? "vérifiée" : "non vérifiée"} <Simule quoi="vérification simulée" className="ml-1" />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pastille ton="info">{STATUTS[d.statut]}</Pastille>
          {!d.consentement_actif && <Pastille ton="alerte">Accord du commerçant retiré : données figées</Pastille>}
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)_340px]">
        {/* Indicateurs */}
        <section aria-labelledby="t-ind">
          <h2 id="t-ind" className="mb-1 text-xs font-medium uppercase tracking-wide text-encre-2">Indicateurs de flux</h2>
          <dl>
            <Ligne l={`Encaissement prudent (p${a.parametres.percentile})`} v={fcfa(a.encaissement_prudent)} />
            <Ligne l="Encaissement médian" v={fcfa(ind.encaissement_median)} />
            <Ligne l="Régularité (écart relatif)" v={pct(ind.regularite_cv)} />
            <Ligne l="Jours actifs / semaine" v={ind.jours_actifs.toLocaleString("fr-FR")} />
            <Ligne l="Tendance / semaine" v={pct(ind.tendance_hebdo, 1)} />
            <Ligne l="Saisonnalité (pics)" v={pct(ind.saisonnalite)} />
            <Ligne l="Payeurs distincts" v={nombre(ind.payeurs_distincts)} />
            <Ligne l="Part du plus gros payeur" v={pct(ind.part_plus_gros_payeur)} />
            <Ligne l="Part des flux pros" v={pct(ind.part_flux_pro)} />
            <Ligne l="Ancienneté" v={`${ind.semaines} sem.`} />
            <Ligne l="Exclu : vers soi-même" v={fcfa(ind.exclu_transferts_soi)} />
            <Ligne l="Exclu : circulaires" v={fcfa(ind.exclu_circulaires)} />
          </dl>
          {a.modeles && (
            <div className="mt-4">
              <h2 className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-encre-2">Modèles <Simule quoi="entraînés sur données simulées" /></h2>
              <dl>
                <Ligne l={`Prévision (${a.modeles.horizon_semaines} sem.)`} v={`${fcfa(a.modeles.prevision_hebdo)}/sem.`} />
                <Ligne l="Probabilité de défaut" v={pct(a.modeles.proba_defaut, 1)} />
                <Ligne l="Score d'anomalie" v={a.modeles.score_anomalie.toLocaleString("fr-FR")} />
              </dl>
              <p className="mt-1 text-[11px] text-encre-2">La probabilité de défaut est le risque calibré au montant proposé ; la formule reste le plafond.</p>
            </div>
          )}
        </section>

        {/* Analyse */}
        <section aria-labelledby="t-ana" className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="t-ana" className="text-xs font-medium uppercase tracking-wide text-encre-2">Montant proposé par le moteur</h2>
              <p className="montant text-4xl text-indigo">{fcfa(a.plafond)}</p>
              <p className="text-encre-2">{a.duree_semaines} échéances de {fcfa(a.echeance_hebdo)} · risque d'impayé annoncé {pct(a.risque, 1)} (seuil {pct(a.parametres.seuil_risque)})</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-encre-2">Recommandation</p>
              <p className="titre text-xl">{RECO[a.recommandation]}{a.provisoire ? " · provisoire" : ""}</p>
            </div>
          </div>
          <CourbeFlux serie={a.serie_hebdo} prudent={a.encaissement_prudent} median={ind.encaissement_median} debut={ind.debut} dense hauteur={190} />
          <div>
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-encre-2">Raisons</h3>
            <ol className="space-y-1.5">
              {a.raisons.map((r) => (
                <li key={r.code} className="flex justify-between gap-4 border-b border-trait pb-1.5">
                  <span>
                    {pourAgent(r.texte)}
                    {r.code === "tendance" && r.effet < 0 && !!a.alertes?.length && (
                      <span className="mt-0.5 block text-safran-encre">Cette hausse coïncide avec une alerte : à vérifier avant de la retenir.</span>
                    )}
                  </span>
                  <span className="chiffres shrink-0 text-encre-2">{r.effet ? `${r.effet > 0 ? "−" : "+"}${fcfa(Math.abs(r.effet))}` : ""}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-encre-2">Chaîne de calcul</h3>
            <ol className="list-decimal space-y-0.5 pl-5 text-encre-2">{a.chaine_calcul.map((l) => <li key={l}>{decimales(l).replace(/annoncé [\d,]+\s?%/, `annoncé ${pct(a.risque, 1)}`)}</li>)}</ol>
            <p className="mt-1 text-[11px] text-encre-2">Moteur {d.version_moteur} · graine {d.graine} · {decimales(`m=${a.parametres.m} s=${a.parametres.s} n=${a.parametres.n} i=${a.parametres.i}`)} · {nombre(a.parametres.trajectoires)} trajectoires</p>
          </div>
        </section>

        {/* Contrôles et décision */}
        <aside className="space-y-4">
          <section aria-labelledby="t-al">
            <h2 id="t-al" className="mb-1 text-xs font-medium uppercase tracking-wide text-encre-2">Contrôles de cohérence</h2>
            {a.alertes?.length ? (
              <ul className="space-y-2">
                {a.alertes.map((al) => (
                  <li key={al.code} className="rounded-lg border-l-4 border-safran bg-safran-doux px-3 py-2 text-safran-encre">{decimales(al.texte)}</li>
                ))}
                <li className="text-[11px] text-encre-2">Une alerte demande un examen, elle ne prouve rien. Le commerçant n'en est pas informé automatiquement.</li>
              </ul>
            ) : <p className="text-feuille">Aucune alerte : pas d'aller-retour, de pic ni de concentration anormale.</p>}
          </section>

          <section aria-labelledby="t-dec" className="rounded-xl border border-trait bg-papier-2 p-4">
            <h2 id="t-dec" className="titre mb-2 text-lg">Décision</h2>
            {ouvert ? (
              <form onSubmit={(e) => { e.preventDefault(); void decider(); }} className="space-y-3">
                <fieldset className="grid grid-cols-2 gap-2">
                  <legend className="sr-only">Type de décision</legend>
                  {(Object.keys(LIBELLES) as TypeDecision[]).map((t) => (
                    <label key={t} className={`flex cursor-pointer items-center justify-between rounded-lg border px-2.5 py-2 ${type === t ? "border-indigo bg-indigo-doux text-indigo" : "border-trait bg-papier"}`}>
                      <span className="flex items-center gap-2"><input type="radio" name="type" checked={type === t} onChange={() => choisir(t)} className="accent-[var(--indigo)]" />{LIBELLES[t]}</span>
                      <kbd className="text-[11px] text-encre-2">{t[0]}</kbd>
                    </label>
                  ))}
                </fieldset>
                {type === "ajuste" && (
                  <label className="block">
                    Montant décidé (FCFA)
                    <input inputMode="numeric" value={nombre(montant)} onChange={(e) => setMontant(Number(e.target.value.replace(/\D/g, "")) || 0)}
                      className="chiffres mt-1 block w-full rounded-lg border border-trait bg-papier px-2 py-1.5" aria-invalid={!montantValide} />
                    <span className={`text-[11px] ${montantValide ? "text-encre-2" : "text-terre"}`}>Plafond de la formule : {fcfa(plafondFormule)}. Il ne peut pas être dépassé.</span>
                  </label>
                )}
                <label className="block">
                  Justificatif {type === "refuse" ? "(motif du refus)" : ""} <span className="text-terre">*</span>
                  <textarea ref={motifRef} value={motif} onChange={(e) => setMotif(e.target.value)} rows={3} required minLength={10}
                    placeholder="Ex. : saison creuse en janvier, prudence sur le montant."
                    className="mt-1 block w-full rounded-lg border border-trait bg-papier px-2 py-1.5" />
                  <span className="text-[11px] text-encre-2">Obligatoire, 10 caractères au moins. Enregistré au journal, non modifiable.</span>
                </label>
                {envoi.etat === "erreur" && <p role="alert" className="text-terre">{envoi.message}</p>}
                <Bouton type="submit" className="w-full" disabled={!type || !motifValide || !montantValide || envoi.etat === "envoi"}>
                  {envoi.etat === "envoi" ? "Enregistrement…" : "Enregistrer la décision"}
                </Bouton>
              </form>
            ) : (
              <div className="space-y-1">
                {d.decisions.map((x) => (
                  <div key={x.id} className="apparait">
                    <p className="font-medium">{LIBELLES[x.type as TypeDecision]}</p>
                    <p>Proposé {fcfa(x.montant_propose)} → décidé {fcfa(x.montant_decide)}</p>
                    <p className="italic">« {x.motif} »</p>
                    <p className="text-[11px] text-encre-2">{x.auteur} · {date(x.horodatage, true)} · moteur {x.version_moteur} · graine {x.graine}</p>
                  </div>
                ))}
                {duree !== null && <p className="pt-2 font-medium text-feuille">Dossier traité en {Math.floor(duree / 60)} min {Math.round(duree % 60)} s (chronomètre de cette session).</p>}
              </div>
            )}
          </section>

          <Chronometre dossier={String(id)} />

          <details className="text-encre-2">
            <summary className="cursor-pointer">Journal d'accès à ce dossier ({d.acces.length})</summary>
            <ul className="mt-1 space-y-0.5 text-[12px]">{d.acces.map((x, k) => <li key={k}>{x.acteur} · {x.action} · {date(x.horodatage, true)}</li>)}</ul>
          </details>
        </aside>
      </div>
    </article>
  );
}
