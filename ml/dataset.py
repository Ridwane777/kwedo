"""Construit les jeux de caractéristiques à partir des deux générateurs.

Usage :
  nice -n 10 .venv/bin/python ml/dataset.py reglage_a 3000    # réglage : entraînement des modèles
  nice -n 10 .venv/bin/python ml/dataset.py reglage_b 1500    # réglage : calibration isotonique (partition dédiée)
  nice -n 10 .venv/bin/python ml/dataset.py reglage_v 1500    # réglage : validation, choix des modèles et du moteur
  nice -n 10 .venv/bin/python ml/dataset.py test 400          # test de développement (graine 2026, déjà vue)
  nice -n 10 .venv/bin/python ml/dataset.py final:<graine> 400  # jeu FINAL : générateur de test, graine committée
Sortie : data/generated/<nom>.npz (ignoré par git). Aucun modèle n'est appelé ici : les jeux ne dépendent que
du générateur et des fonctions d'indicateurs du moteur.
"""

import os
import sys
from multiprocessing import Pool
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "1")
RACINE = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(RACINE / "packages/engine"), str(RACINE / "packages/generator")]

import numpy as np  # noqa: E402

from kwedo_engine import Parametres, echeance  # noqa: E402
from kwedo_engine.decision import profil  # noqa: E402
from kwedo_engine.moteur import alertes, indicateurs  # noqa: E402
from kwedo_gen import CONFIGS, generer_commercant  # noqa: E402

P = Parametres(m=0.30, s=0.40, n=26, i=0.0035, percentile=20, seuil_risque=0.10)
CARAC = ["log_median", "log_prudent", "regularite_cv", "jours_actifs", "tendance_hebdo", "saisonnalite",
         "log_payeurs", "part_plus_gros_payeur", "part_flux_pro", "semaines", "ratio_prudent_median"]
ANOM = ["part_plus_gros_payeur", "ratio_pic", "part_ronds", "part_nouveaux", "part_nuit", "part_circulaire"]
# Espaces de graines disjoints : (graine racine, identifiant de partition).
PARTITIONS = {"reglage": ("reglage", 0), "reglage_a": ("reglage", 10), "reglage_b": ("reglage", 11),
              "reglage_v": ("reglage", 12), "test": ("test", 1)}


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


def defaut_vectoriel(futur: np.ndarray, echeances: np.ndarray, n: int = P.n) -> tuple[np.ndarray, np.ndarray]:
    """Même règle que `defaut`, pour plusieurs échéances d'un même commerçant."""
    e = np.asarray(echeances, float)
    reserve = np.zeros_like(e)
    manquees = np.zeros_like(e)
    for x in np.maximum(futur[:n], 0):
        reserve += x
        ok = reserve >= e
        reserve = np.where(ok, reserve - e, reserve)
        manquees += ~ok
    return manquees > 0, manquees / n


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
    cfg, k, graine = args
    c = generer_commercant(f"{cfg}-{k}", graine, CONFIGS[cfg])
    ind, hebdo, fv = indicateurs(c["transactions"])
    futur = np.array(c["futur_hebdo"], float)
    med = max(ind["encaissement_median"], 1)
    p20 = float(np.percentile(hebdo, P.percentile))
    x = [np.log1p(med), np.log1p(p20), ind["regularite_cv"], ind["jours_actifs"],
         ind["tendance_hebdo"], ind["saisonnalite"], np.log1p(ind["payeurs_distincts"]),
         ind["part_plus_gros_payeur"], ind["part_flux_pro"], ind["semaines"], p20 / med]
    return {
        "x": x, "profil": profil(ind, hebdo, fv), "anom": caracteristiques_anomalie(c["transactions"], hebdo, fv),
        "hebdo": np.pad(hebdo[-52:], (52 - min(52, len(hebdo)), 0)), "futur": futur, "p20": p20,
        "moyenne": ind["encaissement_moyen"], "median": med, "manip": c["manipulation"] or "",
        "archetype": c["type_activite"], "alerte_regles": len(alertes(ind, hebdo, fv)) > 0, "graine": graine,
    }


def construire(nom: str, n: int, graine: int = 2026):
    if nom.startswith("final:"):
        cfg, ss = "test", np.random.SeedSequence([int(nom.split(":")[1]), 99])
        sortie = "final_" + nom.split(":")[1]
    else:
        cfg, part = PARTITIONS[nom]
        ss, sortie = np.random.SeedSequence([graine, part]), nom
    graines = ss.generate_state(n)
    with Pool(4) as pool:
        rows = pool.map(ligne, [(cfg, k, int(g)) for k, g in enumerate(graines)], chunksize=8)
    out = {k: np.array([r[k] for r in rows]) for k in rows[0]}
    dest = RACINE / "data/generated"
    dest.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(dest / f"{sortie}.npz", **out)
    return out


if __name__ == "__main__":
    nom, n = sys.argv[1], int(sys.argv[2])
    o = construire(nom, n)
    print(nom, len(o["graine"]), "manip", round(float((o["manip"] != "").mean()), 3), flush=True)
