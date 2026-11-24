"use client";

import { ArrowLeft, ArrowRight, FileText, MessageSquareText, Send } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ChoixModalites, MentionPrudente, requeteModalites } from "@/components/estimation";
import { Bouton, Chargement, Erreur, Pastille, Simule, Vide } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { useCommercant } from "@/lib/commercant";
import { date, delai, duree, fcfa, FREQ, phraseEcheance, STATUTS, type Frequence } from "@/lib/format";
import type { Estimation, InstitutionPublique, TableauDeBord } from "@/lib/types";

const SUIVI = ["recu", "en_analyse", "accorde"];
const ACTIFS = ["recu", "en_analyse", "complement", "accorde"];
type Etape = "institution" | "modalites" | "confirmation";
type Choix = { frequence: Frequence; duree: number } | null;

/** Dépôt du dossier : choix de l'institution → fréquence et durée → confirmation signée par code SMS → envoi. */
function Depot({ institutions, dejaEnvoye, initial, onEnvoye, onFermer }: {
  institutions: InstitutionPublique[]; dejaEnvoye: Set<string>;
  initial: { inst: string | null; choix: Choix }; onEnvoye: (nom: string) => Promise<void>; onFermer: () => void;
}) {
  const { id } = useCommercant();
  const [etape, setEtape] = useState<Etape>(initial.inst ? "modalites" : "institution");
  const [inst, setInst] = useState<string | null>(initial.inst);
  const [choix, setChoix] = useState<Choix>(initial.choix);
  const est = useApi<Estimation>(inst ? `/commercants/${id}/estimation?institution_id=${inst}${requeteModalites(choix)}` : null);
  const [code, setCode] = useState<string | null>(null);   // code « reçu par SMS » (affiché : démo)
  const [saisie, setSaisie] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const nom = institutions.find((i) => i.id === inst)?.nom ?? "";
  const a = est.donnees && est.donnees.institution_id === inst ? est.donnees : null;

  async function demanderCode() {
    setOccupe(true); setErreur(null); setSaisie("");
    try { setCode((await api<{ code: string }>(`/commercants/${id}/code-sms`, { body: { institution_id: inst } })).code); }
    catch (e) { setErreur(e instanceof Error ? e.message : "Erreur"); } finally { setOccupe(false); }
  }

  async function envoyer() {
    if (!a || !inst) return;
    setOccupe(true); setErreur(null);
    try {
      // 1. Accord pour cette seule institution, signé par le code ; 2. envoi avec les modalités choisies.
      await api(`/commercants/${id}/consentements`, { body: { institution_id: inst, action: "accorde", code: saisie } });
      await api("/dossiers", { body: { commercant_id: id, institution_id: inst, frequence: a.frequence, duree_mois: a.parametres.duree_mois ?? undefined } });
      await onEnvoye(nom);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur");
      setOccupe(false);
    }
  }

  const titre = { institution: "1. Choisissez l'institution", modalites: "2. Comment rembourser", confirmation: "3. Vérifiez et signez" }[etape];
  return (
    <div className="apparait space-y-5 rounded-3xl bg-surface p-5 shadow-carte" aria-labelledby="titre-depot">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titre-depot" className="titre text-xl">{titre}</h2>
        <button className="min-h-10 px-2 text-sm text-encre-2 underline-offset-4 hover:underline" onClick={onFermer}>Annuler</button>
      </div>

      {etape === "institution" && (
        <fieldset className="space-y-2">
          <legend className="sr-only">Institution</legend>
          {institutions.map((i) => {
            const deja = dejaEnvoye.has(i.id);
            return (
              <label key={i.id} className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 ${deja ? "border-trait opacity-60" : inst === i.id ? "border-marque bg-marque-doux" : "border-trait bg-surface-2"} ${deja ? "" : "cursor-pointer"}`}>
                <input type="radio" name="institution" disabled={deja} checked={inst === i.id} onChange={() => { setInst(i.id); setChoix(null); }} className="h-5 w-5 accent-[var(--marque)]" />
                <span className="flex-1 font-medium">{i.nom}</span>
                {deja && <span className="text-xs text-encre-2">Déjà envoyé</span>}
              </label>
            );
          })}
          <Bouton grand icone={ArrowRight} className="mt-2 w-full" disabled={!inst} onClick={() => setEtape("modalites")}>Continuer</Bouton>
        </fieldset>
      )}

      {etape === "modalites" && (
        est.erreur ? <Erreur message={est.erreur} reessayer={est.recharger} /> : !a ? <Chargement lignes={3} /> : (
          <div className="space-y-4">
            <p className="text-encre-2">{nom}</p>
            <ChoixModalites a={a} desactive={est.charge} onChange={(frequence, d) => setChoix({ frequence, duree: d })} />
            <div className="rounded-2xl bg-fond p-4">
              <p className="text-sm text-encre-2">Montant demandé</p>
              <p className="montant text-3xl text-montant">{fcfa(a.plafond)}</p>
              <p className="mt-1 text-[15px]" data-testid="phrase-echeance">{phraseEcheance(a.echeance, a.frequence, { duree_mois: a.parametres.duree_mois, duree_semaines: a.duree_semaines })}</p>
              <MentionPrudente a={a} />
            </div>
            <div className="flex gap-2">
              <Bouton variante="trait" icone={ArrowLeft} onClick={() => setEtape("institution")}>Retour</Bouton>
              <Bouton grand icone={ArrowRight} className="flex-1" disabled={!a.plafond || est.charge} onClick={() => { setCode(null); setSaisie(""); setEtape("confirmation"); }}>Continuer</Bouton>
            </div>
            {!a.plafond && <p className="text-sm text-alerte">Pas de montant possible pour l'instant avec ces modalités.</p>}
          </div>
        )
      )}

      {etape === "confirmation" && a && (
        <div className="space-y-4">
          <dl className="divide-y divide-trait border-y border-trait text-[15px]">
            <div className="flex justify-between gap-3 py-2.5"><dt className="text-encre-2">Institution</dt><dd className="text-right font-medium">{nom}</dd></div>
            <div className="flex justify-between gap-3 py-2.5"><dt className="text-encre-2">Montant</dt><dd className="chiffres font-semibold">{fcfa(a.plafond)}</dd></div>
            <div className="flex justify-between gap-3 py-2.5"><dt className="text-encre-2">Fréquence</dt><dd>{FREQ[a.frequence].nom}</dd></div>
            <div className="flex justify-between gap-3 py-2.5"><dt className="text-encre-2">Durée</dt><dd>{duree({ duree_mois: a.parametres.duree_mois, duree_semaines: a.duree_semaines })} · {a.nb_echeances} échéances</dd></div>
            <div className="flex justify-between gap-3 py-2.5"><dt className="text-encre-2">{FREQ[a.frequence].echeance}</dt><dd className="chiffres font-semibold">{fcfa(a.echeance)}</dd></div>
            <div className="flex justify-between gap-3 py-2.5"><dt className="text-encre-2">Coût total du crédit</dt><dd className="chiffres">{fcfa(a.cout_total)}</dd></div>
            <div className="flex justify-between gap-3 py-2.5"><dt className="text-encre-2">Versement annoncé</dt><dd>{delai(a.modalites.delai_versement_h)} après accord</dd></div>
          </dl>
          <MentionPrudente a={a} />
          <p className="text-xs text-encre-2">L'institution décide de son côté et peut ajuster le montant, la fréquence ou la durée dans ses limites.</p>

          <div className="space-y-3 rounded-2xl border border-trait bg-fond p-4">
            <p className="font-medium" id="phrase-accord">J'accepte que {nom} consulte mon dossier de crédit.</p>
            <p className="text-sm text-encre-2">Pour donner cet accord, signez avec le code reçu par SMS. Vous pourrez le retirer dans « Mon compte marchand ».</p>
            {!code ? (
              <Bouton variante="trait" icone={MessageSquareText} disabled={occupe} onClick={demanderCode}>Recevoir mon code par SMS</Bouton>
            ) : (
              <>
                <div className="rounded-xl rounded-tl-none bg-surface px-3 py-2 text-sm" role="status">
                  Kwedo : votre code de signature est <strong className="chiffres tracking-widest" data-testid="code-sms">{code}</strong>.
                  <Simule quoi="SMS simulé : code affiché pour la démo" className="ml-1 align-middle" />
                </div>
                <label className="block text-sm">
                  Code reçu par SMS
                  <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={saisie} aria-describedby="phrase-accord"
                    onChange={(e) => setSaisie(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="chiffres mt-1 block min-h-12 w-full rounded-xl border border-trait bg-surface-2 px-3 text-center text-2xl tracking-[0.4em]" />
                </label>
                <button className="text-sm text-marque underline-offset-4 hover:underline" disabled={occupe} onClick={demanderCode}>Renvoyer un code</button>
              </>
            )}
          </div>

          {erreur && <p role="alert" className="text-alerte">{erreur}</p>}
          <div className="flex gap-2">
            <Bouton variante="trait" icone={ArrowLeft} disabled={occupe} onClick={() => setEtape("modalites")}>Retour</Bouton>
            <Bouton grand icone={Send} className="flex-1" disabled={occupe || saisie.length !== 6} onClick={envoyer}>{occupe ? "Envoi…" : "Signer et envoyer"}</Bouton>
          </div>
        </div>
      )}
    </div>
  );
}

function PageDossier() {
  const { id } = useCommercant();
  const params = useSearchParams();
  const tdb = useApi<TableauDeBord>(`/commercants/${id}`);
  const insts = useApi<InstitutionPublique[]>("/institutions");
  const [ouvert, setOuvert] = useState(false);
  const [envoye, setEnvoye] = useState<string | null>(null);
  const instUrl = params.get("institution");
  // Arrivée depuis l'estimation ou les conseils : le parcours s'ouvre avec l'institution et les modalités déjà choisies.
  useEffect(() => { if (instUrl) setOuvert(true); }, [instUrl]);

  if (tdb.erreur || insts.erreur) return <Erreur message={(tdb.erreur ?? insts.erreur)!} reessayer={() => { void tdb.recharger(); void insts.recharger(); }} />;
  if (!tdb.donnees || !insts.donnees) return <Chargement lignes={5} />;
  const dossiers = tdb.donnees.dossiers;
  const dejaEnvoye = new Set(dossiers.filter((d) => ACTIFS.includes(d.statut)).map((d) => d.institution_id));
  const offres = dossiers.filter((d) => d.statut === "accorde");
  const freqUrl = params.get("frequence") as Frequence | null;
  const dureeUrl = Number(params.get("duree"));
  const initial = instUrl && !dejaEnvoye.has(instUrl)
    ? { inst: instUrl, choix: freqUrl && FREQ[freqUrl] && dureeUrl ? { frequence: freqUrl, duree: dureeUrl } : null }
    : { inst: null, choix: null };

  return (
    <section className="space-y-7">
      <div>
        <h1 className="titre text-3xl">Mon dossier</h1>
        <p className="text-encre-2">Vous choisissez l'institution et la façon de rembourser. Elle décide de son côté.</p>
      </div>

      {envoye && <p role="status" className="rounded-xl bg-bon-doux p-3 text-bon">Dossier envoyé à {envoye}. Suivez sa réponse ci-dessous.</p>}
      {ouvert ? (
        <Depot institutions={insts.donnees} dejaEnvoye={dejaEnvoye} initial={initial} onFermer={() => setOuvert(false)}
          onEnvoye={async (nom) => { await tdb.recharger(); setOuvert(false); setEnvoye(nom); }} />
      ) : (
        <Bouton grand icone={FileText} className="w-full" disabled={!tdb.donnees.commercant.nb_transactions}
          onClick={() => { setEnvoye(null); setOuvert(true); }}>Déposer mon dossier de crédit</Bouton>
      )}

      <div className="space-y-3">
        <h2 className="titre text-xl">Suivi</h2>
        {!dossiers.length ? <Vide titre="Aucun dossier envoyé">Vos demandes apparaîtront ici avec leur état.</Vide> : (
          <ul className="space-y-4">
            {dossiers.map((d) => (
              <li key={d.id} className="border-l-2 border-marque pl-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{d.institution}</p>
                  <Pastille ton={d.statut === "accorde" ? "bon" : d.statut === "refuse" ? "alerte" : "info"}>{STATUTS[d.statut]}</Pastille>
                </div>
                <ol className="mt-2 flex gap-1" aria-label="Étapes">
                  {SUIVI.map((s, k) => {
                    const fait = SUIVI.indexOf(d.statut) >= k || ["offre_acceptee", "refuse", "offre_refusee", "accorde"].includes(d.statut);
                    return <li key={s} className={`h-1.5 flex-1 rounded ${fait ? "bg-marque" : "bg-surface-3"}`} title={STATUTS[s]} />;
                  })}
                </ol>
                <p className="mt-1 text-xs text-encre-2">Envoyé le {date(d.cree_le, true)}{d.frequence ? ` · ${FREQ[d.frequence].chaque}${d.duree_mois ? `, ${d.duree_mois} mois` : ""}` : ""}</p>
                {["accorde", "refuse", "offre_acceptee", "complement"].includes(d.statut) && (
                  <Link href={`/app/offre/${d.id}`} className="mt-1 inline-block min-h-10 py-2 font-medium text-marque underline-offset-4 hover:underline">
                    {d.statut === "accorde" ? `Voir l'offre : ${fcfa(d.montant_offre)}` : "Voir la réponse"}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
        {offres.length > 1 && <p className="rounded-xl bg-marque-doux p-3 text-marque">Vous avez {offres.length} offres : comparez-les avant d'accepter.</p>}
      </div>
    </section>
  );
}

export default function Dossier() {
  return <Suspense fallback={<Chargement lignes={5} />}><PageDossier /></Suspense>;
}
