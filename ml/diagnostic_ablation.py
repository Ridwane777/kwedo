"""Diagnostic du risque : ablation des écarts générateur de réglage → générateur de test (docs/MISSION-DIAGNOSTIC.md).

Part du générateur de RÉGLAGE, active un seul écart à la fois, puis les cumule dans l'ordre d'impact jusqu'au
générateur de test complet. Modèle v3 en production inchangé (lecture seule). Graines NEUVES :
docs/evaluation/diagnostic/graines.json (jamais les graines des runs finaux).

Pour chaque variante : 2 000 commerçants (mélange d'archétypes de la variante) + 1 000 commerçants d'archétypes
jamais vus (artisanat/quincaillerie, mêmes paramètres de bruit et de chocs que la variante).

Usage : nice -n 10 .venv/bin/python ml/diagnostic_ablation.py [n_pop n_hors]
Sortie : docs/evaluation/diagnostic/ablation.json ; points intermédiaires dans data/generated/diagnostic/ (ignoré).
Mesures sur données SIMULÉES.
"""

import dataclasses
import json
import os
import sys
import time
from multiprocessing import Pool
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "1")
RACINE = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(RACINE / "packages/engine"), str(RACINE / "packages/generator"), str(RACINE / "ml")]

import numpy as np  # noqa: E402

from frequences import CELLULES, FREQS, a_periode, contexte, etiquette, lignes, params  # noqa: E402
from kwedo_engine import decision  # noqa: E402
from kwedo_engine.decision import profil  # noqa: E402
from kwedo_engine.moteur import PLAFOND_MIN, indicateurs, l_max  # noqa: E402
from kwedo_gen import REGLAGE, TEST, generer_commercant  # noqa: E402
from kwedo_gen.archetypes import ARCHETYPES, ARCHETYPES_HORS_REGLAGE  # noqa: E402

MODELE = str(RACINE / "ml/artifacts/modeles-v3.json")
SORTIE = RACINE / "docs/evaluation/diagnostic"
INTER = RACINE / "data/generated/diagnostic"
MULT = (0.5, 0.75, 1.0, 1.25, 1.5, 2.0)
B = 1000
FILS = 4

# Écarts réglage → test, lus dans packages/generator/kwedo_gen/core.py (Config REGLAGE / TEST).
ECARTS = {
    "bruit_gamma": {"bruit": "gamma"},
    "chocs_durables": {"p_choc_durable": TEST.p_choc_durable},
    "semaines_vides": {"p_semaine_vide": TEST.p_semaine_vide},
    "perte_client": {"p_perte_client": TEST.p_perte_client},
    "depenses_perso": {"p_depense_perso": TEST.p_depense_perso},
    "tendance": {"derive_tendance": TEST.derive_tendance},
    "archetypes": {"archetypes": TEST.archetypes},
}
assert dataclasses.replace(REGLAGE, nom="test", **{k: v for d in ECARTS.values() for k, v in d.items()}) == TEST


def config(ecarts):
    kw = {k: v for e in ecarts for k, v in ECARTS[e].items()}
    return dataclasses.replace(REGLAGE, nom="diag", **kw)


def _commercant(args):
    cfg, graine, arch = args
    c = generer_commercant("d", int(graine), cfg, archetype=arch)
    ind, hebdo, fv = indicateurs(c["transactions"])
    h = np.pad(hebdo[-52:], (52 - min(52, len(hebdo)), 0)).astype(float)
    base = profil(ind, hebdo, fv)
    futur = np.array(c["futur_hebdo"], float)
    mod = decision.charger(MODELE)
    cel = []
    for f, d in CELLULES:
        p = params(f, d)
        if h.max() <= 0:
            cel.append(None); continue
        seuils, pru, med = contexte(h, graine, p)
        lm, a = l_max(pru, p), a_periode(p)
        l_r, _ = decision.montant_max_frequence(mod, f, base, h, seuils, pru, med, p.w, p.nb, 2 * lm, p.seuil_risque, a, 5000)
        pl = int(min(lm, l_r) // 5000 * 5000)
        if pl < PLAFOND_MIN:
            cel.append((pl, 0.0, None, None, None)); continue
        e = pl * np.array(MULT) / a
        X = lignes(base, h, seuils, pru, med, p, e)
        pred = decision.risque_frequence(mod, f, X)
        dd, part = etiquette(futur, e, p)
        cel.append((pl, float(part[2]), pred, dd.astype(float), X.astype(np.float32)))
    return {"archetype": c["type_activite"], "profil": base, "futur": futur, "hebdo": h,
            "moyenne": float(h.mean()), "median": max(float(np.median(h)), 1.0), "cel": cel}


def generer(cfg, graines, archs, pool):
    return pool.map(_commercant, [(cfg, g, a) for g, a in zip(graines, archs)], chunksize=8)


def _k_expo(base, total):
    lo, hi = 0.0, 50 * total / max(base.sum(), 1)
    for _ in range(80):
        k = (lo + hi) / 2
        m = k * base
        lo, hi = (k, hi) if m[m >= PLAFOND_MIN].sum() < total else (lo, k)
    return (lo + hi) / 2


def comparaison(R, rng):
    """Moteur contre règle naïve (médiane et moyenne de la période × k), à montant total accordé égal, par cellule.
    Par fréquence : différence des parts d'échéances manquées (4 durées réunies), IC bootstrap par commerçant."""
    n = len(R)
    futur = [r["futur"] for r in R]
    par_cel = {}
    mats = {}
    for j, (f, d) in enumerate(CELLULES):
        p = params(f, d)
        a = a_periode(p)
        L = np.array([0 if r["cel"][j] is None else r["cel"][j][0] for r in R], float)
        part = np.array([0.0 if r["cel"][j] is None else r["cel"][j][1] for r in R])
        acc = L >= PLAFOND_MIN
        mq_e, du_e = part * p.nb * acc, acc * p.nb
        total = L[acc].sum()
        res = {"moteur": round(float(mq_e.sum() / max(du_e.sum(), 1)), 5), "accordes": int(acc.sum())}
        for nom, col in (("mediane", "median"), ("moyenne", "moyenne")):
            base = np.array([r[col] for r in R]) * p.w
            M = _k_expo(base, total) * base
            accr = M >= PLAFOND_MIN
            mq = np.array([etiquette(fu, [m / a], p)[1][0] if ok else 0.0 for fu, m, ok in zip(futur, M, accr)]) * p.nb
            du = accr * p.nb
            res[nom] = round(float(mq.sum() / max(du.sum(), 1)), 5)
            res[f"diff_{nom}"] = round(res["moteur"] - res[nom], 5)
            mats[(f, d, nom)] = (mq_e, du_e, mq, du)
        par_cel[f"{f}-{d}"] = res
    idx = rng.integers(0, n, size=(B, n))
    par_freq = {}
    for f in FREQS:
        out = {}
        for nom in ("mediane", "moyenne"):
            ds = [mats[(f, d, nom)] for ff, d in CELLULES if ff == f]
            me, de, mr, dr = (np.sum([m[i] for m in ds], 0) for i in range(4))
            diff = me.sum() / max(de.sum(), 1) - mr.sum() / max(dr.sum(), 1)
            boot = me[idx].sum(1) / np.maximum(de[idx].sum(1), 1) - mr[idx].sum(1) / np.maximum(dr[idx].sum(1), 1)
            out[nom] = {"diff_moteur_moins_regle": round(float(diff), 5),
                        "ic95": [round(float(x), 5) for x in np.quantile(boot, [0.025, 0.975])],
                        "moteur": round(float(me.sum() / max(de.sum(), 1)), 5),
                        "regle": round(float(mr.sum() / max(dr.sum(), 1)), 5),
                        "cellules_moteur_meilleur": sum(par_cel[f"{f}-{d}"][f"diff_{nom}"] < 0 for ff, d in CELLULES if ff == f)}
        par_freq[f] = out
    return {"n": n, "par_frequence": par_freq, "par_cellule": par_cel}


def ece(pred, obs):
    b = np.minimum((pred * 10).astype(int), 9)
    return float(sum(abs(pred[b == k].mean() - obs[b == k].mean()) * (b == k).mean() for k in range(10) if (b == k).any()))


def points(R):
    """Points de calibration : (prédit, observé, commerçant, cellule)."""
    P, O, I, C, X = [], [], [], [], []
    for i, r in enumerate(R):
        for j, c in enumerate(r["cel"]):
            if c is None or c[2] is None:
                continue
            P.append(c[2]); O.append(c[3]); I.append(np.full(len(c[2]), i)); C.append(np.full(len(c[2]), j)); X.append(c[4])
    return np.concatenate(P), np.concatenate(O), np.concatenate(I), np.concatenate(C), np.vstack(X)


def calibration(R, rng):
    pred, obs, ii, cc, _ = points(R)
    fq = np.array([FREQS.index(CELLULES[j][0]) for j in cc])
    n = len(R)
    idx = rng.integers(0, n, size=(B, n))
    out = {}
    for k, f in enumerate(FREQS):
        m = fq == k
        sp = np.bincount(ii[m], pred[m], n); so = np.bincount(ii[m], obs[m], n); sn = np.bincount(ii[m], None, n)
        boot = (so[idx].sum(1) - sp[idx].sum(1)) / np.maximum(sn[idx].sum(1), 1)
        out[f] = {"points": int(m.sum()), "annonce": round(float(pred[m].mean()), 4), "observe": round(float(obs[m].mean()), 4),
                  "ecart_obs_moins_annonce": round(float(obs[m].mean() - pred[m].mean()), 4),
                  "ic95_ecart": [round(float(x), 4) for x in np.quantile(boot, [0.025, 0.975])],
                  "ece_10": round(ece(pred[m], obs[m]), 4)}
    return out


def evaluer(nom, ecarts, graines_pop, graines_hors, archs_hors, pool, gb):
    t0 = time.perf_counter()
    cfg = config(ecarts)
    Rp = generer(cfg, graines_pop, [None] * len(graines_pop), pool)
    Rh = generer(cfg, graines_hors, archs_hors, pool)
    rng = np.random.default_rng(gb)
    vus = [r for r in Rp if r["archetype"] not in ARCHETYPES_HORS_REGLAGE]
    res = {"ecarts": list(ecarts),
           "A_calibration_ensemble": calibration(Rp, rng),
           "A_calibration_hors_reglage": calibration(Rh, rng),
           "B_ensemble": comparaison(Rp, rng)["par_frequence"],
           "B_archetypes_vus": comparaison(vus, rng)["par_frequence"],
           "B_hors_reglage": comparaison(Rh, rng)["par_frequence"]}
    # Points et profils pour l'analyse (étape 3), fichier intermédiaire supprimé par diagnostic_analyse.py.
    INTER.mkdir(parents=True, exist_ok=True)
    sauve = {}
    for tag, R in (("pop", Rp), ("hors", Rh)):
        pred, obs, ii, cc, X = points(R)
        sauve |= {f"{tag}_pred": pred.astype(np.float32), f"{tag}_obs": obs.astype(np.int8), f"{tag}_i": ii.astype(np.int32),
                  f"{tag}_c": cc.astype(np.int8), f"{tag}_X": X, f"{tag}_profil": np.array([r["profil"] for r in R], np.float32),
                  f"{tag}_arch": np.array([r["archetype"] for r in R])}
    np.savez_compressed(INTER / f"{nom}.npz", **sauve)
    res["duree_s"] = round(time.perf_counter() - t0, 1)
    h = res["A_calibration_ensemble"]["hebdomadaire"]
    print(nom, "hebdo annoncé", h["annonce"], "observé", h["observe"], "ece", h["ece_10"],
          "| B hors diff", res["B_hors_reglage"]["hebdomadaire"]["mediane"]["diff_moteur_moins_regle"], res["duree_s"], "s", flush=True)
    return res


def main():
    g = json.loads((SORTIE / "graines.json").read_text())
    n_pop = int(sys.argv[1]) if len(sys.argv) > 1 else g["commercants_par_variante"]
    n_hors = int(sys.argv[2]) if len(sys.argv) > 2 else g["commercants_hors_reglage_par_variante"]
    gp = np.random.SeedSequence(g["graine_population"]).generate_state(n_pop)
    gh = np.random.SeedSequence(g["graine_hors_reglage"]).generate_state(n_hors)
    ah = [ARCHETYPES_HORS_REGLAGE[k % 2] for k in range(n_hors)]
    gb = g["graine_bootstrap"]
    out = {"avertissement": "Données simulées. Diagnostic, pas un run final ; graines neuves (graines.json).",
           "modele": "ml/artifacts/modeles-v3.json (inchangé)", "commercants_par_variante": n_pop,
           "commercants_hors_reglage_par_variante": n_hors, "variantes": {}}
    with Pool(FILS) as pool:
        V = out["variantes"]
        V["reglage"] = evaluer("reglage", [], gp, gh, ah, pool, gb)
        for e in ECARTS:
            V[f"seul:{e}"] = evaluer(f"seul_{e}", [e], gp, gh, ah, pool, gb)
        # Ordre d'impact : hausse de l'écart observé − annoncé (hebdomadaire, ensemble) de chaque écart seul.
        base = V["reglage"]["A_calibration_ensemble"]["hebdomadaire"]["ecart_obs_moins_annonce"]
        ordre = sorted(ECARTS, key=lambda e: -(V[f"seul:{e}"]["A_calibration_ensemble"]["hebdomadaire"]["ecart_obs_moins_annonce"] - base))
        out["ordre_cumul"] = ordre
        for k in range(2, len(ordre) + 1):
            V[f"cumul:{k}"] = evaluer(f"cumul_{k}", ordre[:k], gp, gh, ah, pool, gb)
    (SORTIE / "ablation.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
