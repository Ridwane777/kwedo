"""Construit les jeux de caractéristiques à partir des deux générateurs.

Usage : nice -n 10 python3 ml/dataset.py reglage 600 && nice -n 10 python3 ml/dataset.py test 400
Sortie : data/generated/<nom>.npz (ignoré par git).
"""

import os
import sys
from multiprocessing import Pool
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "1")
RACINE = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(RACINE / "packages/engine"), str(RACINE / "packages/generator")]

import numpy as np  # noqa: E402

from kwedo_engine import Parametres, analyser, echeance  # noqa: E402
from kwedo_engine.moteur import indicateurs  # noqa: E402
from kwedo_gen import CONFIGS, generer_commercant  # noqa: E402

P = Parametres(m=0.30, s=0.40, n=26, i=0.0035, percentile=20, seuil_risque=0.10)
CARAC = ["log_median", "log_prudent", "regularite_cv", "jours_actifs", "tendance_hebdo", "saisonnalite",
         "log_payeurs", "part_plus_gros_payeur", "part_flux_pro", "semaines", "ratio_prudent_median"]
ANOM = ["part_plus_gros_payeur", "ratio_pic", "part_ronds", "part_nouveaux", "part_nuit", "part_circulaire"]


def defaut(futur: np.ndarray, montant: float, p: Parametres = P) -> tuple[bool, float]:
    """Étiquette cachée : au moins une échéance manquée sur la durée, et part d'échéances manquées."""
    if montant <= 0:
        return False, 0.0
    e = echeance(montant, p)
    dispo = np.maximum(futur[: p.n], 0)
    reserve, manquees = 0.0, 0
    for x in dispo:
        reserve += x
        if reserve >= e:
            reserve -= e
        else:
            manquees += 1
    return manquees > 0, manquees / p.n


def caracteristiques_anomalie(tx, hebdo, fv) -> list[float]:
    t, m, e = fv["t"], fv["m"], fv["entree"]
    fin = t.max()
    rec = e & (t > fin - np.timedelta64(28, "D"))
    anc = e & ~rec
    ronds = (m[rec] % 10_000 == 0).mean() if rec.any() else 0.0
    nouveaux = (~np.isin(fv["cp"][rec], fv["cp"][anc])).mean() if rec.any() else 0.0
    heures = t[e].astype("datetime64[h]").astype(int) % 24
    base = np.median(hebdo[-14:-2]) if len(hebdo) >= 14 else np.median(hebdo)
    pic = hebdo[-2:].mean() / base if base > 0 else 1.0
    s = np.bincount(np.unique(fv["cp"][fv["verifie"]], return_inverse=True)[1], weights=fv["m"][fv["verifie"]])
    return [float(s.max() / s.sum()), float(np.log(pic)), float(ronds), float(nouveaux),
            float((heures < 5).mean()), float(fv["nb_circulaires"] / max(1, e.sum()))]


def ligne(args):
    nom, k, graine = args
    c = generer_commercant(f"{nom}-{k}", graine, CONFIGS[nom])
    ind, hebdo, fv = indicateurs(c["transactions"])
    r = analyser(c["transactions"], P, graine=graine, avec_raisons=False)
    futur = np.array(c["futur_hebdo"], float)
    med = max(ind["encaissement_median"], 1)
    x = [np.log1p(med), np.log1p(r["encaissement_prudent"]), ind["regularite_cv"], ind["jours_actifs"],
         ind["tendance_hebdo"], ind["saisonnalite"], np.log1p(ind["payeurs_distincts"]),
         ind["part_plus_gros_payeur"], ind["part_flux_pro"], ind["semaines"], r["encaissement_prudent"] / med]
    d, part = defaut(futur, r["plafond"])
    return {
        "x": x, "anom": caracteristiques_anomalie(c["transactions"], hebdo, fv),
        "hebdo": np.pad(hebdo[-52:], (52 - min(52, len(hebdo)), 0)),
        "futur": futur, "plafond": r["plafond"], "risque": r["risque"], "defaut": d, "part_manquee": part,
        "moyenne": ind["encaissement_moyen"], "median": med, "manip": c["manipulation"] or "",
        "archetype": c["type_activite"], "alerte_regles": len(r["alertes"]) > 0, "graine": graine,
    }


def construire(nom: str, n: int, graine: int):
    graines = np.random.SeedSequence([graine, 1 if nom == "test" else 0]).generate_state(n)
    with Pool(4) as pool:
        rows = pool.map(ligne, [(nom, k, int(g)) for k, g in enumerate(graines)], chunksize=4)
    out = {k: np.array([r[k] for r in rows]) for k in rows[0]}
    dest = RACINE / "data/generated"
    dest.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(dest / f"{nom}.npz", **out)
    return out


if __name__ == "__main__":
    nom, n = sys.argv[1], int(sys.argv[2])
    o = construire(nom, n, graine=2026)
    print(nom, len(o["defaut"]), "défauts", round(float(o["defaut"].mean()), 3), "manip", round(float((o["manip"] != "").mean()), 3))
