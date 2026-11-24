"""Évaluation du risque toutes fréquences, selon `docs/evaluation/protocole-frequences.md` (figé avant le run).

Usage :
  nice -n 10 .venv/bin/python ml/evaluate_frequences.py dev                 # réglage (partition v) : seul jeu de réglage
  nice -n 10 .venv/bin/python ml/evaluate_frequences.py final <dossier>     # run FINAL unique → docs/evaluation/runs/<dossier>/
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
sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np  # noqa: E402

from frequences import CELLULES, FILS, FREQS, RACINE, a_periode, contexte, etiquette, lignes, params  # noqa: E402
from kwedo_engine import decision  # noqa: E402
from kwedo_engine.moteur import PLAFOND_MIN, l_max  # noqa: E402

HORS = ("artisanat", "quincaillerie")
MULT = (0.5, 0.75, 1.0, 1.25, 1.5, 2.0)
CLASSES = [0, 0.02, 0.05, 0.1, 0.2, 0.4, 1.01]
B = 2000


def charger(nom):
    return dict(np.load(RACINE / f"data/generated/{nom}.npz", allow_pickle=False))


def _un(args):
    """Pour un commerçant, chaque cellule : plafond, part d'échéances manquées au plafond, points de calibration."""
    h, futur, base, g, chemin = args
    mod = decision.charger(chemin)
    out = []
    for f, d in CELLULES:
        p = params(f, d)
        if h.max() <= 0:
            out.append((0, 0.0, [], [])); continue
        seuils, pru, med = contexte(h, g, p)
        lm, a = l_max(pru, p), a_periode(p)
        l_r, _ = decision.montant_max_frequence(mod, f, base, h, seuils, pru, med, p.w, p.nb, 2 * lm, p.seuil_risque, a, 5000)
        pl = int(min(lm, l_r) // 5000 * 5000)
        if pl < PLAFOND_MIN:
            out.append((pl, 0.0, [], [])); continue
        e = pl * np.array(MULT) / a
        pred = decision.risque_frequence(mod, f, lignes(base, h, seuils, pru, med, p, e))
        d_, part = etiquette(futur, e, p)
        out.append((pl, float(part[2]), pred.tolist(), d_.astype(float).tolist()))
    return out


def plafonds(D, chemin):
    with Pool(FILS) as pool:
        res = pool.map(_un, [(h, f, b, g, chemin) for h, f, b, g in zip(D["hebdo"], D["futur"], D["profil"], D["graine"])],
                       chunksize=8)
    L = np.array([[r[j][0] for j in range(len(CELLULES))] for r in res], float)
    part = np.array([[r[j][1] for j in range(len(CELLULES))] for r in res], float)
    pred = [np.array(sum((r[j][2] for r in res), [])) for j in range(len(CELLULES))]
    obs = [np.array(sum((r[j][3] for r in res), [])) for j in range(len(CELLULES))]
    return L, part, pred, obs


def part_manquee(futur, montants, p):
    a = a_periode(p)
    return np.array([etiquette(f, [m / a], p)[1][0] if m >= PLAFOND_MIN else 0.0 for f, m in zip(futur, montants)])


def k_exposition(base, total):
    lo, hi = 0.0, 50 * total / max(base.sum(), 1)
    for _ in range(80):
        k = (lo + hi) / 2
        m = k * base
        lo, hi = (k, hi) if m[m >= PLAFOND_MIN].sum() < total else (lo, k)
    return (lo + hi) / 2


def comparer(D, L, part_e, p, rng):
    """Moteur contre règles naïves adaptées à la fréquence (k × encaissement moyen / médian de la PÉRIODE),
    à montant total accordé égal. Métrique : échéances manquées / échéances dues sur les prêts accordés."""
    acc = L >= PLAFOND_MIN
    total = L[acc].sum()
    out = {"n": int(len(L)), "moteur": {"accordes": int(acc.sum()), "montant_total": int(total),
                                        "part_echeances_manquees": round(float(part_e[acc].mean()) if acc.any() else 0.0, 5)}}
    if not acc.any():
        return out
    mq_e, du_e = part_e * p.nb, acc * p.nb
    idx = rng.integers(0, len(L), size=(B, len(L)))
    for nom, base in (("naive_moyenne_x_k", D["moyenne"].astype(float) * p.w), ("naive_mediane_x_k", D["median"].astype(float) * p.w)):
        k = k_exposition(base, total)
        M = k * base
        accr = M >= PLAFOND_MIN
        mq, du = part_manquee(D["futur"], M, p) * p.nb, accr * p.nb
        diff = mq_e.sum() / du_e.sum() - mq.sum() / du.sum()
        boot = mq_e[idx].sum(1) / np.maximum(du_e[idx].sum(1), 1) - mq[idx].sum(1) / np.maximum(du[idx].sum(1), 1)
        lo, hi = np.quantile(boot, [0.025, 0.975])
        out[nom] = {"k": round(float(k), 4), "accordes": int(accr.sum()), "montant_total": int(M[accr].sum()),
                    "part_echeances_manquees": round(float(mq.sum() / du.sum()), 5),
                    "difference_moteur_moins_regle": round(float(diff), 5),
                    "ic95_bootstrap": [round(float(lo), 5), round(float(hi), 5)],
                    "c1_moteur_inferieur": bool(diff < 0), "c2_ic_exclut_zero": bool(hi < 0)}
    return out


def calibration(pred, obs):
    if len(pred) == 0:
        return {"points": 0}
    b = np.minimum((pred * 10).astype(int), 9)
    ece = float(sum(abs(pred[b == k].mean() - obs[b == k].mean()) * (b == k).mean() for k in range(10) if (b == k).any()))
    table = []
    for lo, hi in zip(CLASSES[:-1], CLASSES[1:]):
        m = (pred >= lo) & (pred < hi)
        if m.sum() >= 30:
            table.append({"classe": f"{lo:.0%}–{min(hi, 1):.0%}", "annonce": round(float(pred[m].mean()), 4),
                          "observe": round(float(obs[m].mean()), 4), "n": int(m.sum())})
    ecart = float(np.mean([abs(t["annonce"] - t["observe"]) for t in table])) if table else float("nan")
    return {"points": int(len(pred)), "risque_annonce_moyen": round(float(pred.mean()), 4),
            "observe_moyen": round(float(obs.mean()), 4), "ece_10": round(ece, 4), "ecart_moyen": round(ecart, 4),
            "classes": table, "c3": bool(ece <= 0.05 and ecart <= 0.05)}


def evaluer(D, chemin, graine_boot):
    t0 = time.perf_counter()
    L, part, pred, obs = plafonds(D, chemin)
    rng = np.random.default_rng(graine_boot)
    hors = np.isin(D["archetype"], HORS)
    Dh = {k: v[hors] for k, v in D.items()}
    cellules = {}
    for j, (f, d) in enumerate(CELLULES):
        p = params(f, d)
        c = {"frequence": f, "duree_mois": d, "nb_echeances": p.nb,
             "test_complet": comparer(D, L[:, j], part[:, j], p, rng),
             "archetypes_hors_reglage": comparer(Dh, L[hors, j], part[hors, j], p, rng) if hors.any() else None,
             "calibration": calibration(pred[j], obs[j])}
        cellules[f"{f}-{d}"] = c
        print(f, d, json.dumps({k: c["test_complet"].get(k) for k in ("moteur",)}, ensure_ascii=False),
              c["calibration"].get("ece_10"), flush=True)
    par_freq = {}
    for f in FREQS:
        js = [j for j, (ff, _) in enumerate(CELLULES) if ff == f]
        cal = calibration(np.concatenate([pred[j] for j in js]), np.concatenate([obs[j] for j in js]))
        c1 = sum(all(cellules[f"{f}-{CELLULES[j][1]}"]["test_complet"].get(r, {}).get("c1_moteur_inferieur", False)
                     for r in ("naive_moyenne_x_k", "naive_mediane_x_k")) for j in js)
        par_freq[f] = {"calibration": cal, "durees_c1_contre_les_deux_regles": f"{c1}/{len(js)}", "_c1": c1}
    ece_h = par_freq["hebdomadaire"]["calibration"]["ece_10"]
    for f in FREQS:
        pf = par_freq[f]
        pf["eprouvee"] = bool(pf["_c1"] >= 3 and pf["calibration"]["ece_10"] <= max(0.05, ece_h + 0.01))
        pf["toutes_cellules_c1_c2_c3"] = bool(all(
            all(cellules[f"{f}-{d}"][per] is None or all(cellules[f"{f}-{d}"][per].get(r, {}).get(c, False)
                for r in ("naive_moyenne_x_k", "naive_mediane_x_k") for c in ("c1_moteur_inferieur", "c2_ic_exclut_zero"))
                for per in ("test_complet", "archetypes_hors_reglage")) for (ff, d) in CELLULES if ff == f)
            and pf["calibration"]["c3"])
        del pf["_c1"]
    return {"cellules": cellules, "par_frequence": par_freq, "duree_s": round(time.perf_counter() - t0, 1)}


def non_regression(chemin, graines, graine_boot):
    """Hebdomadaire 26 semaines sur le jeu du run 1 (docs/evaluation/runs/run-1.json, modèle v2)."""
    D = None
    for g in graines:
        d = charger(f"final_{g}")
        D = d if D is None else {k: np.concatenate([D[k], d[k]]) for k in D}
    L, part, pred, obs = plafonds(D, chemin)
    j = CELLULES.index(("hebdomadaire", 6))  # 6 mois = 26 échéances, exactement le réglage du run 1
    p = params("hebdomadaire", 6)
    rng = np.random.default_rng(graine_boot)
    hors = np.isin(D["archetype"], HORS)
    ancien = json.loads((RACINE / "docs/evaluation/runs/run-1.json").read_text())
    return {"jeu": "graines du run 1 (générateur de test), hebdomadaire 26 échéances",
            "nouveau": {"test_complet": comparer(D, L[:, j], part[:, j], p, rng),
                        "archetypes_hors_reglage": comparer({k: v[hors] for k, v in D.items()}, L[hors, j], part[hors, j], p, rng),
                        "calibration": calibration(pred[j], obs[j])},
            "ancien_run_1": {"part_echeances_manquees_test_complet": ancien["test_complet"]["moteur"]["part_echeances_manquees"],
                             "part_echeances_manquees_hors_reglage": ancien["archetypes_hors_reglage"]["moteur"]["part_echeances_manquees"],
                             "montant_total_test_complet": ancien["test_complet"]["moteur"]["montant_total"],
                             "ece_10": ancien["calibration"]["ece_10"], "ecart_moyen": ancien["calibration"]["ecart_moyen"]}}


def main():
    chemin = str(RACINE / "ml/artifacts/modeles-v3.json")
    if sys.argv[1] == "dev":
        res = evaluer(charger("reglage_v"), chemin, 0)
        (RACINE / "ml/artifacts/dev-frequences-reglage-v.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
        print(json.dumps(res["par_frequence"], ensure_ascii=False, indent=1))
        return
    dossier = RACINE / "docs/evaluation/runs" / sys.argv[2]
    if dossier.exists():
        raise SystemExit(f"{dossier} existe déjà : un seul run final, jamais réécrit.")
    cfg = json.loads((RACINE / "docs/evaluation/graines-frequences.json").read_text())
    D = None
    for g in cfg["graines"]:
        d = charger(f"final_{g}")
        D = d if D is None else {k: np.concatenate([D[k], d[k]]) for k in D}
    res = {"protocole": "docs/evaluation/protocole-frequences.md", "graines": cfg["graines"],
           "commercants_par_graine": cfg["commercants_par_graine"],
           "avertissement": "Données simulées (générateur de test). Pas une performance réelle.",
           "machine": {"python": platform.python_version(), "numpy": np.__version__, "fils": FILS, "gpu": "aucun"},
           **evaluer(D, chemin, cfg["graine_bootstrap"])}
    res["non_regression_hebdomadaire"] = non_regression(
        chemin, json.loads((RACINE / "docs/evaluation/graines-finales.json").read_text())["runs"]["1"]["graines"], cfg["graine_bootstrap"])
    dossier.mkdir(parents=True)
    (dossier / "resultats.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
    print(json.dumps(res["par_frequence"], ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
