"""Risque d'impayé calibré et choix du montant (ADR 0007, ADR 0008).

Chaîne :
1. `profil(ind, hebdo, fv)` : caractéristiques du commerçant, lues dans l'historique réel (jamais l'activité déclarée,
   jamais une variable sensible : uniquement des flux).
2. `lignes_montant(...)` : pour un montant, échéance rapportée aux encaissements et risque de la simulation.
3. Modèle LightGBM (contraint croissant en montant), puis calibration isotonique apprise sur une partition dédiée
   du générateur de réglage → probabilité d'au moins une échéance manquée.
4. Montant proposé = plus grand multiple de 5 000 FCFA ≤ L_max dont le risque calibré reste ≤ seuil de l'institution.
   La formule reste le plafond : le modèle ne peut jamais la dépasser.

Sans fichier de modèle, `charger()` renvoie None et le moteur retombe sur la seule simulation (comportement v0.1).
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import numpy as np

CHEMIN = Path(__file__).resolve().parents[3] / "ml/artifacts/modeles-v2.json"

PROFIL = ["log_median", "regularite_cv", "jours_actifs", "tendance_hebdo", "saisonnalite", "log_payeurs",
          "part_plus_gros_payeur", "part_flux_pro", "semaines", "p10_sur_median", "p20_sur_median", "moyenne_sur_median",
          "part_semaines_vides", "min12_sur_median", "recent4_sur_median", "autocorr1", "log_ticket", "log_tx_semaine",
          "part_sorties_sur_entrees"]
MONTANT = ["echeance_sur_median", "echeance_sur_p20", "risque_simule"]
CARAC = PROFIL + MONTANT
MONOTONE = [0] * len(PROFIL) + [1, 1, 1]
# v3 (ADR 0016) : l'échéance est celle de la période (semaine, quinzaine, mois), rapportée à la médiane et au
# percentile prudent des encaissements agrégés à la même période ; + période entre échéances et nombre d'échéances.
CHEMIN_V3 = CHEMIN.with_name("modeles-v3.json")
MONTANT_F = ["echeance_sur_median_periode", "echeance_sur_prudent_periode", "risque_simule"]
ECHEANCIER = ["semaines_par_periode", "nb_echeances"]
CARAC_F = PROFIL + MONTANT_F + ECHEANCIER
MONOTONE_F = [0] * len(PROFIL) + [1, 1, 1, 0, 0]


def profil(ind: dict, hebdo: np.ndarray, fv: dict) -> np.ndarray:
    h = np.asarray(hebdo, float)
    if len(h) == 0:
        return np.zeros(len(PROFIL))
    med = max(float(np.median(h)), 1.0)
    rec = h[-12:]
    ac = float(np.corrcoef(h[:-1], h[1:])[0, 1]) if len(h) > 3 and h.std() > 0 else 0.0
    v = fv["verifie"]
    nb_tx = int(v.sum())
    ticket = float(fv["m"][v].mean()) if nb_tx else 0.0
    sorties = float(fv["m"][~fv["entree"]].sum())
    entrees = float(fv["m"][fv["entree"]].sum())
    return np.array([
        np.log1p(med), ind["regularite_cv"], ind["jours_actifs"], ind["tendance_hebdo"], ind["saisonnalite"],
        np.log1p(ind["payeurs_distincts"]), ind["part_plus_gros_payeur"], ind["part_flux_pro"], len(h),
        np.percentile(h, 10) / med, np.percentile(h, 20) / med, h.mean() / med, float((h <= 0).mean()),
        rec.min() / med, h[-4:].mean() / med, 0.0 if np.isnan(ac) else ac, np.log1p(ticket),
        np.log1p(nb_tx / len(h)), sorties / entrees if entrees else 0.0,
    ], dtype=float)


def lignes_montant(base: np.ndarray, hebdo: np.ndarray, seuils: np.ndarray, echeances: np.ndarray,
                   p20: float, choc: float = 0.0) -> np.ndarray:
    """Une ligne de caractéristiques par échéance candidate (le choc de ventes ne touche que l'avenir)."""
    echeances = np.atleast_1d(np.asarray(echeances, float))
    med = max(float(np.median(hebdo)), 1.0) * (1 + choc)
    p20c = max(p20 * (1 + choc), 1.0)
    s = np.sort(seuils)
    # Risque simulé = part des avenirs dont le seuil est < E (même définition que moteur.risque_pour_montant).
    risque = np.searchsorted(s, echeances, side="left") / len(s) if len(s) else np.ones_like(echeances)
    am = np.column_stack([echeances / med, echeances / p20c, risque])
    return np.column_stack([np.repeat(base[None, :], len(echeances), 0), am])


def lignes_frequence(base: np.ndarray, hebdo: np.ndarray, seuils: np.ndarray, echeances: np.ndarray, prudent: float,
                     median: float, w: float, nb: int, choc: float = 0.0) -> np.ndarray:
    """v3 : une ligne par échéance candidate de la PÉRIODE. `seuils` : échéance de la période payable par chaque
    avenir simulé (`simuler_seuils`, mêmes paramètres) ; `prudent`, `median` : percentile prudent et médiane des
    encaissements agrégés à la période (`serie_periode`), avant choc."""
    echeances = np.atleast_1d(np.asarray(echeances, float))
    med = max(median * (1 + choc), 1.0)
    pru = max(prudent * (1 + choc), 1.0)
    s = np.sort(seuils)
    risque = np.searchsorted(s, echeances, side="left") / len(s) if len(s) else np.ones_like(echeances)
    k = len(echeances)
    return np.column_stack([np.repeat(base[None, :], k, 0), echeances / med, echeances / pru, risque,
                            np.full(k, float(w)), np.full(k, float(nb))])


@lru_cache(maxsize=4)
def charger(chemin: str = "auto"):
    """Charge v3 (toutes fréquences) s'il existe, sinon v2 (hebdomadaire seul), sinon None."""
    if chemin == "auto":
        chemin = str(CHEMIN_V3 if CHEMIN_V3.exists() else CHEMIN)
    p = Path(chemin)
    if not p.exists():
        return None
    import lightgbm as lgb  # dépendance de .venv (ADR 0006)

    tout = json.loads(p.read_text())
    mod = {"prevision": lgb.Booster(model_str=tout["prevision"]["lightgbm"]), "version": tout["version"], "tout": tout}
    if "risque_frequences" in tout:
        d = tout["risque_frequences"]
        mod["frequences"] = {
            f: {"booster": lgb.Booster(model_str=d["lightgbm"] if d["mode"] == "unique" else d["lightgbm"][f]),
                "iso_x": np.array(d["isotonique"][f]["x"]), "iso_y": np.array(d["isotonique"][f]["y"])}
            for f in d["isotonique"]}
    if "risque" in tout:
        d = tout["risque"]
        mod.update({"booster": lgb.Booster(model_str=d["lightgbm"]), "iso_x": np.array(d["isotonique"]["x"]),
                    "iso_y": np.array(d["isotonique"]["y"])})
    return mod


def risque_frequence(mod, frequence: str, X: np.ndarray) -> np.ndarray:
    m = mod["frequences"][frequence]
    return np.interp(m["booster"].predict(X, num_threads=1), m["iso_x"], m["iso_y"])


def montant_max_frequence(mod, frequence, base, hebdo, seuils, prudent, median, w, nb, borne: float, seuil: float,
                          annuite: float, pas: int, choc: float = 0.0) -> tuple[int, float]:
    """v3 : plus grand multiple de `pas` ≤ borne dont le risque calibré de la fréquence ≤ seuil (monotone en montant)."""
    k_max = int(max(0.0, borne) // pas)
    if k_max == 0:
        return 0, 0.0
    grille = np.arange(1, k_max + 1) * pas
    r = risque_frequence(mod, frequence, lignes_frequence(base, hebdo, seuils, grille / annuite, prudent, median, w, nb, choc))
    ok = np.nonzero(r <= seuil + 1e-12)[0]
    if len(ok) == 0:
        return 0, 0.0
    k = int(ok[-1])
    return int(grille[k]), float(r[k])


def brut(mod, X: np.ndarray) -> np.ndarray:
    return mod["booster"].predict(X, num_threads=1)


def calibrer(mod, b: np.ndarray) -> np.ndarray:
    return np.interp(b, mod["iso_x"], mod["iso_y"])


def risque(mod, X: np.ndarray) -> np.ndarray:
    return calibrer(mod, brut(mod, X))


def montant_max(mod, base, hebdo, seuils, p20, borne: float, seuil: float, annuite: float, pas: int,
                choc: float = 0.0) -> tuple[int, float]:
    """Plus grand multiple de `pas` ≤ borne dont le risque calibré ≤ seuil. Le risque est croissant en montant
    (contraintes de monotonie du modèle + isotonique), une recherche par dichotomie suffit."""
    k_max = int(max(0.0, borne) // pas)
    if k_max == 0:
        return 0, 0.0
    grille = np.arange(1, k_max + 1) * pas
    r = risque(mod, lignes_montant(base, hebdo, seuils, grille / annuite, p20, choc))
    ok = np.nonzero(r <= seuil + 1e-12)[0]
    if len(ok) == 0:
        return 0, 0.0
    # Monotonie : le dernier indice admissible est le plus grand montant admissible.
    k = int(ok[-1])
    return int(grille[k]), float(r[k])
