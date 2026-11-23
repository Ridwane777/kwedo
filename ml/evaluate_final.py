"""Évaluation de la passe de correction, selon `docs/evaluation/protocole-final.md` (critères figés).

Usage :
  nice -n 10 .venv/bin/python ml/evaluate_final.py dev               # réglage (partition v) : seul jeu utilisé pour régler
  nice -n 10 .venv/bin/python ml/evaluate_final.py final <run>       # run FINAL : graines de docs/evaluation/graines-finales.json
Sortie (final) : docs/evaluation/runs/run-<run>.json, conservé même en cas d'échec.
Mesures sur données SIMULÉES.
"""

import json
import os
import platform
import sys
import time
from multiprocessing import Pool
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "1")
RACINE = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(RACINE / "packages/engine"), str(RACINE / "packages/generator"), str(RACINE / "ml")]

import numpy as np  # noqa: E402

from dataset import P, defaut_vectoriel  # noqa: E402
from kwedo_engine import decision  # noqa: E402
from kwedo_engine.moteur import PLAFOND_MIN, annuite, plafond_complet, simuler_seuils  # noqa: E402

HORS = ("artisanat", "quincaillerie")
MULT = (0.5, 0.75, 1.0, 1.25, 1.5, 2.0)
CLASSES_Q3 = [0, 0.02, 0.05, 0.1, 0.2, 0.4, 1.01]
B = 2000


def charger(nom):
    return dict(np.load(RACINE / f"data/generated/{nom}.npz", allow_pickle=False))


def _ind(D, k):
    """Indicateurs nécessaires à plafond_complet, reconstruits depuis le profil stocké (mêmes valeurs)."""
    b = D["profil"][k]
    return {"regularite_cv": b[1], "jours_actifs": b[2], "tendance_hebdo": b[3], "saisonnalite": b[4],
            "payeurs_distincts": int(round(np.expm1(b[5]))), "part_plus_gros_payeur": b[6], "part_flux_pro": b[7]}


def _un(args):
    h, g, b, p20, futur = args
    mod = decision.charger()
    if h.max() <= 0:
        return 0, [], []
    # Le profil est celui calculé à la construction du jeu (même fonction que le moteur).
    seuils = simuler_seuils(h, P, int(g))
    c_p = float(np.percentile(h, P.percentile))
    from kwedo_engine.moteur import l_max
    lmax = l_max(c_p, P)
    a = annuite(P.i, P.n)
    l_r, _ = decision.montant_max(mod, b, h, seuils, p20, 2 * lmax, P.seuil_risque, a, 5000)
    pl = int(min(lmax, l_r) // 5000 * 5000)
    if pl < PLAFOND_MIN:
        return pl, [], []
    m = pl * np.array(MULT)
    pred = decision.risque(mod, decision.lignes_montant(b, h, seuils, m / a, p20))
    return pl, pred.tolist(), defaut_vectoriel(futur, m / a)[0].tolist()


def plafonds(D):
    with Pool(4) as pool:
        res = pool.map(_un, list(zip(D["hebdo"], D["graine"], D["profil"], D["p20"], D["futur"])), chunksize=16)
    return np.array([r[0] for r in res], float), np.array(sum((r[1] for r in res), [])), np.array(sum((r[2] for r in res), []), float)


def manquees(futur, montants):
    """Nombre d'échéances manquées par dossier (0 si non accordé) et nombre d'échéances dues."""
    acc = montants >= PLAFOND_MIN
    part = np.array([defaut_vectoriel(f, [m / annuite(P.i, P.n)])[1][0] if a else 0.0 for f, m, a in zip(futur, montants, acc)])
    return part * P.n, acc * P.n


def k_exposition(base, total):
    """k tel que la somme des montants accordés (≥ plancher) de k × base égale `total`."""
    lo, hi = 0.0, 50 * total / max(base.sum(), 1)
    for _ in range(80):
        k = (lo + hi) / 2
        m = k * base
        if m[m >= PLAFOND_MIN].sum() < total:
            lo = k
        else:
            hi = k
    return (lo + hi) / 2


def comparer(D, L, rng):
    out = {"n": int(len(L))}
    total = L[L >= PLAFOND_MIN].sum()
    mq_e, du_e = manquees(D["futur"], L)
    out["moteur"] = {"accordes": int((L >= PLAFOND_MIN).sum()), "montant_total": int(total),
                     "part_echeances_manquees": round(float(mq_e.sum() / max(du_e.sum(), 1)), 5)}
    idx = rng.integers(0, len(L), size=(B, len(L)))
    for nom, base in (("naive_moyenne_x_k", D["moyenne"].astype(float)), ("naive_mediane_x_k", D["median"].astype(float))):
        k = k_exposition(base, total)
        M = k * base
        mq, du = manquees(D["futur"], M)
        diff = mq_e.sum() / du_e.sum() - mq.sum() / du.sum()
        boot = mq_e[idx].sum(1) / np.maximum(du_e[idx].sum(1), 1) - mq[idx].sum(1) / np.maximum(du[idx].sum(1), 1)
        lo, hi = np.quantile(boot, [0.025, 0.975])
        out[nom] = {"k": round(float(k), 4), "accordes": int((M >= PLAFOND_MIN).sum()), "montant_total": int(M[M >= PLAFOND_MIN].sum()),
                    "part_echeances_manquees": round(float(mq.sum() / du.sum()), 5),
                    "difference_moteur_moins_regle": round(float(diff), 5),
                    "ic95_bootstrap": [round(float(lo), 5), round(float(hi), 5)],
                    "critere1_moteur_inferieur": bool(diff < 0), "critere2_ic_exclut_zero": bool(hi < 0)}
    return out


def calibration(pred, obs):
    b = np.minimum((pred * 10).astype(int), 9)
    ece = float(sum(abs(pred[b == k].mean() - obs[b == k].mean()) * (b == k).mean() for k in range(10) if (b == k).any()))
    table = []
    for lo, hi in zip(CLASSES_Q3[:-1], CLASSES_Q3[1:]):
        m = (pred >= lo) & (pred < hi)
        if m.sum() >= 30:
            table.append({"classe": f"{lo:.0%}–{min(hi, 1):.0%}", "annonce": round(float(pred[m].mean()), 4),
                          "observe": round(float(obs[m].mean()), 4), "n": int(m.sum())})
    ecart = float(np.mean([abs(t["annonce"] - t["observe"]) for t in table]))
    return {"points": int(len(pred)), "ece_10": round(ece, 4), "ecart_moyen": round(ecart, 4), "classes": table,
            "critere3": bool(ece <= 0.05 and ecart <= 0.05)}


def detection(D):
    mod = decision.charger()["tout"]["anomalies"]
    z = D["anom"] - np.array(mod["mu"])
    alerte = (np.sqrt(np.einsum("ij,jk,ik->i", z, np.array(mod["icov"]), z)) > mod["seuil"]) | D["alerte_regles"].astype(bool)
    manip = D["manip"] != ""
    det, fa = float(alerte[manip].mean()), float(alerte[~manip].mean())
    return {"n_manipules": int(manip.sum()), "detection": round(det, 4), "fausses_alertes": round(fa, 4),
            "critere4_detection": bool(det >= 0.90 and fa <= 0.10)}


def controles(graine, n=40, cfg=None):
    """Stabilité, fidélité des raisons, équité : commerçants du générateur de test tirés depuis la graine du run."""
    import re
    from kwedo_engine import analyser
    from kwedo_engine.moteur import ind_depuis_hebdo, indicateurs, REF_CV
    from kwedo_gen import TEST, generer_commercant
    rng = np.random.default_rng(graine)
    var, effet_ok, ordre_ok, formule_ok, total, identiques, nb_raisons = [], 0, 0, 0, 0, 0, 0
    for k in range(n):
        c = generer_commercant(f"c{k}", int(graine) * 1000 + k, cfg or TEST, manipulation=None)
        r = analyser(c["transactions"], P, graine=k)
        ind, h, fv = indicateurs(c["transactions"])
        # Équité : même flux, activité déclarée différente → décision identique.
        c2 = {**c, "type_activite": "tissus" if c["type_activite"] != "tissus" else "alimentation"}
        r2 = analyser(c2["transactions"], P, graine=k)
        identiques += r["plafond"] == r2["plafond"] and r["recommandation"] == r2["recommandation"]
        if r["plafond"] < PLAFOND_MIN:
            continue
        total += 1
        bruit = h * rng.uniform(0.95, 1.05, len(h))
        var.append(abs(plafond_complet(bruit, P, k, ind_depuis_hebdo(ind, bruit), fv)[0] - r["plafond"]) / r["plafond"])
        nb_raisons += len(r["raisons"])
        for x in r["raisons"]:  # recalcul indépendant de l'effet « régularité »
            if x["code"] == "regularite":
                med, cv = np.median(h), ind["regularite_cv"]
                reg = np.maximum(med + (h - h.mean()) * min(1.0, REF_CV / cv), 0)
                effet_ok += plafond_complet(reg, P, k, ind_depuis_hebdo(ind, reg), fv)[0] - r["plafond"] == x["effet"]
            else:
                effet_ok += 1
        effets = [abs(x["effet"]) for x in r["raisons"] if x["code"] not in ("encaissements", "formule")]
        ordre_ok += effets == sorted(effets, reverse=True)
        formule_ok += (r["l_max"] < r["l_simulation"]) == any(x["code"] == "formule" for x in r["raisons"])
    sens = re.compile(r"\b(genre|sexe|religion|ethnie|ethnique|nationalit|age_|date_naissance)\w*", re.I)
    trouves = [f.name for f in (RACINE / "packages/engine/kwedo_engine").glob("*.py") if sens.search(f.read_text())]
    nb_raisons = max(1, nb_raisons)
    p90 = float(np.quantile(var, 0.9)) if var else 0.0
    out = {"dossiers": total, "stabilite_p90_variation_bruit_5pct": round(p90, 4),
           "raisons_effets_identiques": round(effet_ok / nb_raisons, 4), "raisons_triees": round(ordre_ok / max(1, total), 4),
           "raison_formule_coherente": round(formule_ok / max(1, total), 4),
           "decisions_identiques_activite_changee": f"{identiques}/{n}", "variables_sensibles_dans_le_moteur": trouves}
    out["critere4_stabilite_fidelite_equite"] = bool(p90 <= 0.10 and effet_ok == nb_raisons and ordre_ok == total
                                                     and formule_ok == total and identiques == n and not trouves)
    return out


def evaluer(D, graine_boot=0):
    t0 = time.perf_counter()
    L, pred, obs = plafonds(D)
    rng = np.random.default_rng(graine_boot)
    hors = np.isin(D["archetype"], HORS)
    res = {"test_complet": comparer(D, L, rng)}
    if hors.any():
        res["archetypes_hors_reglage"] = comparer({k: v[hors] for k, v in D.items()}, L[hors], rng)
    res["calibration"] = calibration(pred, obs)
    res["detection"] = detection(D)
    res["controles"] = controles(graine_boot)
    res["plafond_sous_l_max"] = "par construction : min(L_max, montant au risque calibré ≤ seuil)"
    res["duree_s"] = round(time.perf_counter() - t0, 1)
    return res


def main():
    mode = sys.argv[1]
    if mode == "dev":
        res = evaluer(charger("reglage_v"))
        print(json.dumps(res, ensure_ascii=False, indent=1))
        (RACINE / "ml/artifacts/dev-reglage-v.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
        return
    run = sys.argv[2]
    cfg = json.loads((RACINE / "docs/evaluation/graines-finales.json").read_text())["runs"][run]
    D = None
    for g in cfg["graines"]:
        d = charger(f"final_{g}")
        D = d if D is None else {k: np.concatenate([D[k], d[k]]) for k in D}
    res = {"run": run, "graines": cfg["graines"], "commercants_par_graine": cfg["commercants_par_graine"],
           "avertissement": "Données simulées (générateur de test). Pas une performance réelle.",
           "machine": {"python": platform.python_version(), "numpy": np.__version__, "fils": 4, "gpu": "aucun"},
           **evaluer(D, graine_boot=cfg["graine_bootstrap"])}
    sortie = RACINE / "docs/evaluation/runs"
    sortie.mkdir(parents=True, exist_ok=True)
    (sortie / f"run-{run}.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
    print(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
