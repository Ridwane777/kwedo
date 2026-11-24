"""Risque toutes fréquences (ADR 0016), sur le générateur de RÉGLAGE uniquement.

Usage : nice -n 10 .venv/bin/python ml/train_frequences.py
Partitions : reglage_a (entraînement), reglage_b (calibration isotonique lissée par fréquence, dédiée),
reglage_v (comparaison « modèle unique » contre « un modèle par fréquence », choix écrit dans les métriques).
Cellules : 3 fréquences × durées {3, 6, 9, 12} mois. Sorties : ml/artifacts/modeles-v3.json,
ml/artifacts/metriques-v3.json. Prévision et anomalies : reprises telles quelles de modeles-v2.json.
Au plus 4 fils. Mesures sur données SIMULÉES uniquement.
"""

import json
import os
import sys
from multiprocessing import Pool
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "1")
sys.path.insert(0, str(Path(__file__).resolve().parent))

import lightgbm as lgb  # noqa: E402
import numpy as np  # noqa: E402
from sklearn.isotonic import IsotonicRegression  # noqa: E402

from frequences import (CELLULES, FILS, FREQS, RACINE, a_periode, contexte, etiquette, lignes, lignes_grille,  # noqa: E402
                        params)
from kwedo_engine.decision import CARAC_F, MONOTONE_F, montant_max_frequence  # noqa: E402
from kwedo_engine.moteur import l_max  # noqa: E402
from train import auc, ece, isotonique_lisse  # noqa: E402

ART = RACINE / "ml/artifacts"
MULT = (0.5, 0.75, 1.0, 1.25, 1.5, 2.0)
PARAMS = dict(objective="binary", learning_rate=0.05, num_leaves=4, min_data_in_leaf=400, feature_fraction=0.8,
              bagging_fraction=0.8, bagging_freq=1, lambda_l2=1.0, monotone_constraints=MONOTONE_F,
              monotone_constraints_method="advanced", num_threads=FILS, seed=7, verbose=-1, deterministic=True)
TOURS = 400


def charger(nom):
    return dict(np.load(RACINE / f"data/generated/{nom}.npz", allow_pickle=False))


def jeu(D):
    with Pool(FILS) as pool:
        res = pool.map(lignes_grille, list(zip(D["hebdo"], D["futur"], D["profil"], D["graine"])), chunksize=8)
    res = [r for r in res if r is not None]
    return np.vstack([r[0] for r in res]), np.concatenate([r[1] for r in res]).astype(float), np.concatenate([r[2] for r in res])


def freq_de(cell):
    return np.array([CELLULES[j][0] for j in cell])


def entrainer(X, y, freq, mode):
    if mode == "unique":
        b = lgb.train(PARAMS, lgb.Dataset(X, y, feature_name=CARAC_F), num_boost_round=TOURS)
        return {f: b for f in FREQS}
    return {f: lgb.train(PARAMS, lgb.Dataset(X[freq == f], y[freq == f], feature_name=CARAC_F), num_boost_round=TOURS)
            for f in FREQS}


def iso_fit(s, y):
    return IsotonicRegression(y_min=0.0, y_max=1.0, out_of_bounds="clip").fit(s, y)


def modele(boosters, isos):
    return {"frequences": {f: {"booster": boosters[f], "iso_x": isos[f][0], "iso_y": isos[f][1]} for f in FREQS}}


def _points(args):
    """Points plafond × (0,5 … 2) d'un commerçant pour chaque cellule (2e passe de calibration, partition B)."""
    h, futur, base, g, chemin = args
    from kwedo_engine import decision
    mod = decision.charger(chemin)
    out = {f: ([], []) for f in FREQS}
    if h.max() <= 0:
        return out
    for f, d in CELLULES:
        p = params(f, d)
        seuils, pru, med = contexte(h, g, p)
        lm, a = l_max(pru, p), a_periode(p)
        l_r, _ = montant_max_frequence(mod, f, base, h, seuils, pru, med, p.w, p.nb, 2 * lm, p.seuil_risque, a, 5000)
        pl = min(lm, l_r) // 5000 * 5000
        if pl < 25_000:
            continue
        e = pl * np.array(MULT) / a
        out[f][0].append(lignes(base, h, seuils, pru, med, p, e)); out[f][1].append(etiquette(futur, e, p)[0])
    return out


def sauver(chemin, mode, boosters, isos, v2):
    lg = boosters["hebdomadaire"].model_to_string() if mode == "unique" else {f: boosters[f].model_to_string() for f in FREQS}
    mod = {"version": "modeles-v3",
           "risque_frequences": {"mode": mode, "lightgbm": lg, "caracteristiques": CARAC_F,
                                 "isotonique": {f: {"x": list(map(float, isos[f][0])), "y": list(map(float, isos[f][1])),
                                                    "lissage": "centres des paliers"} for f in FREQS}},
           "prevision": v2["prevision"], "anomalies": v2["anomalies"]}
    Path(chemin).write_text(json.dumps(mod))


def calibrer(boosters, XB, yB, fB, B, v2, tmp):
    """Isotonique lissée par fréquence, en 2 passes sur la partition B (comme l'ADR 0008)."""
    isos = {f: isotonique_lisse(iso_fit(boosters[f].predict(XB[fB == f]), yB[fB == f])) for f in FREQS}
    sauver(tmp, "par_frequence", boosters, isos, v2)
    with Pool(FILS) as pool:
        pts = pool.map(_points, [(h, fu, b, g, str(tmp)) for h, fu, b, g in zip(B["hebdo"], B["futur"], B["profil"], B["graine"])],
                       chunksize=8)
    for f in FREQS:
        X2 = np.vstack([x for p in pts for x in p[f][0]]); y2 = np.concatenate([y for p in pts for y in p[f][1]]).astype(float)
        s = np.concatenate([boosters[f].predict(XB[fB == f]), boosters[f].predict(X2)])
        isos[f] = isotonique_lisse(iso_fit(s, np.concatenate([yB[fB == f], y2])))
    return isos


def mesures(boosters, isos, XV, yV, cV):
    fV = freq_de(cV)
    out = {}
    for f in FREQS:
        m = fV == f
        p = np.interp(boosters[f].predict(XV[m]), *isos[f])
        out[f] = {"auc": round(auc(p, yV[m]), 4), "brier": round(float(np.mean((p - yV[m]) ** 2)), 5),
                  "ece_10": round(ece(p, yV[m]), 4), "taux": round(float(yV[m].mean()), 4)}
        par_duree = {}
        for j, (ff, d) in enumerate(CELLULES):
            if ff == f:
                mm = cV[m] == j
                par_duree[str(d)] = {"annonce": round(float(p[mm].mean()), 4), "observe": round(float(yV[m][mm].mean()), 4)}
        out[f]["par_duree"] = par_duree
    out["brier_moyen"] = round(float(np.mean([out[f]["brier"] for f in FREQS])), 5)
    out["ece_moyen"] = round(float(np.mean([out[f]["ece_10"] for f in FREQS])), 4)
    return out


def main():
    A, B, V = charger("reglage_a"), charger("reglage_b"), charger("reglage_v")
    XA, yA, cA = jeu(A); XB, yB, cB = jeu(B); XV, yV, cV = jeu(V)
    fA, fB = freq_de(cA), freq_de(cB)
    v2 = json.loads((ART / "modeles-v2.json").read_text())
    met = {"avertissement": "Mesures sur données simulées (générateur de réglage, partition de validation v).",
           "lignes": {"a": int(len(yA)), "b": int(len(yB)), "v": int(len(yV))}, "comparaison": {}}
    retenus = {}
    for mode in ("unique", "par_frequence"):
        boosters = entrainer(XA, yA, fA, mode)
        isos = calibrer(boosters, XB, yB, fB, B, v2, ART / f"tmp-{mode}.json")
        (ART / f"tmp-{mode}.json").unlink()
        met["comparaison"][mode] = mesures(boosters, isos, XV, yV, cV)
        retenus[mode] = (boosters, isos)
        print(mode, json.dumps(met["comparaison"][mode], ensure_ascii=False), flush=True)
    # Règle de choix (fixée avant de lire les résultats) : Brier moyen le plus bas sur la partition v ; à moins de
    # 1 % d'écart relatif, le modèle unique (plus simple, une seule chaîne à maintenir).
    bu, bp = met["comparaison"]["unique"]["brier_moyen"], met["comparaison"]["par_frequence"]["brier_moyen"]
    mode = "par_frequence" if bp < bu * 0.99 else "unique"
    met["choix"] = {"retenu": mode, "regle": "Brier moyen sur v le plus bas ; à moins de 1 % d'écart relatif, modèle unique.",
                    "brier_unique": bu, "brier_par_frequence": bp}
    boosters, isos = retenus[mode]
    met["importance_gain"] = dict(sorted(((n, round(float(g), 1)) for n, g in
                                          zip(CARAC_F, boosters["hebdomadaire"].feature_importance("gain"))), key=lambda x: -x[1]))
    sauver(ART / "modeles-v3.json", mode, boosters, isos, v2)
    (ART / "metriques-v3.json").write_text(json.dumps(met, ensure_ascii=False, indent=1))
    print(json.dumps(met["choix"], ensure_ascii=False))


if __name__ == "__main__":
    main()
