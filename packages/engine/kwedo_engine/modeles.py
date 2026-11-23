"""Modèles entraînés (ml/train.py), appliqués sans dépendance autre que NumPy.

Ils sont INFORMATIFS : la formule et la simulation fixent le plafond ; les modèles ajoutent une prévision,
une probabilité de défaut et un score d'anomalie lisibles par l'agent. Entraînés sur données simulées.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import numpy as np

CHEMIN = Path(__file__).resolve().parents[3] / "ml/artifacts/modeles-v1.json"


@lru_cache(maxsize=2)
def charger(chemin: str = str(CHEMIN)) -> dict | None:
    p = Path(chemin)
    return json.loads(p.read_text()) if p.exists() else None


def carac_defaut(ind: dict, prudent: float) -> np.ndarray:
    med = max(ind["encaissement_median"], 1)
    return np.array([np.log1p(med), np.log1p(prudent), ind["regularite_cv"], ind["jours_actifs"],
                     ind["tendance_hebdo"], ind["saisonnalite"], np.log1p(ind["payeurs_distincts"]),
                     ind["part_plus_gros_payeur"], ind["part_flux_pro"], ind["semaines"], prudent / med])


def carac_anomalie(hebdo: np.ndarray, fv: dict) -> np.ndarray:
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
    return np.array([s.max() / s.sum(), np.log(max(pic, 1e-6)), ronds, nouveaux,
                     (heures < 5).mean(), fv["nb_circulaires"] / max(1, e.sum())], dtype=float)


def carac_prevision(hebdo: np.ndarray) -> np.ndarray:
    h = np.pad(hebdo[-52:], (max(0, 52 - len(hebdo)), 0))
    rec = h[-12:]
    med = np.median(rec) + 1
    pente = np.polyfit(np.arange(12), rec / med, 1)[0]
    an = h[0:8].mean() if len(hebdo) >= 52 else med  # semaines correspondantes un an plus tôt
    return np.array([1, np.log(med), np.log(h[-4:].mean() + 1), pente, np.log(h[-26:].mean() + 1),
                     np.log(an + 1) - np.log(med), rec.std() / med])


def appliquer(ind: dict, prudent: float, hebdo: np.ndarray, fv: dict) -> dict | None:
    mod = charger()
    if mod is None or len(hebdo) < 12 or not fv["verifie"].any():
        return None
    d = mod["defaut"]
    x = (carac_defaut(ind, prudent) - np.array(d["mu"])) / np.array(d["sd"])
    w = np.array(d["poids"])
    proba = float(1 / (1 + np.exp(-(w[0] + x @ w[1:]))))
    a = mod["anomalies"]
    z = carac_anomalie(hebdo, fv) - np.array(a["mu"])
    score = float(np.sqrt(z @ np.array(a["icov"]) @ z))
    prev = float(np.exp(carac_prevision(hebdo) @ np.array(mod["prevision"]["poids"])) - 1)
    return {"version": mod["version"], "simule": True,
            "prevision_hebdo": round(prev), "horizon_semaines": mod["prevision"]["horizon"],
            "proba_defaut": round(proba, 4), "score_anomalie": round(score, 2),
            "alerte_anomalie": score > a["seuil"]}
