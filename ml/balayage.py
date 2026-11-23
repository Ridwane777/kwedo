"""Balayage de paramètres du moteur sur le générateur de RÉGLAGE uniquement (le test n'est pas lu).

Critère : taux de défaut à montant total prêté égal à la règle naïve « médiane × k » (k ajusté pour la même exposition).
Usage : nice -n 10 python3 ml/balayage.py
"""

import json
import sys
from itertools import product
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(RACINE / "packages/engine"), str(RACINE / "ml")]

import numpy as np  # noqa: E402

from dataset import P, defaut  # noqa: E402
from kwedo_engine.moteur import _plafond  # noqa: E402


def defaut_a_exposition(D, montants, total):
    """Met les montants à l'échelle pour prêter `total`, renvoie le taux de défaut."""
    m = montants * total / montants.sum()
    return float(np.mean([defaut(f, x)[0] for f, x in zip(D["futur"], m)]))


def main():
    R = dict(np.load(RACINE / "data/generated/reglage.npz"))
    naive = R["median"].astype(float)
    res = []
    for pc, seuil, bloc in product((10, 20, 30, 40, 50), (0.05, 0.10, 0.20), (2, 4)):
        p = P.__class__(**{**P.__dict__, "percentile": pc, "seuil_risque": seuil, "bloc": bloc, "s": 1.0})  # s=1 : le simulateur seul répartit
        L = np.array([_plafond(h, p, int(g))[0] for h, g in zip(R["hebdo"], R["graine"])], float)
        total = 0.6 * L.sum()  # point de comparaison commun
        res.append({"percentile": pc, "seuil_risque": seuil, "bloc": bloc,
                    "defaut_moteur": round(defaut_a_exposition(R, L, total), 4),
                    "defaut_naive": round(defaut_a_exposition(R, naive, total), 4)})
        print(res[-1], flush=True)
    meilleur = min(res, key=lambda r: r["defaut_moteur"] - r["defaut_naive"])
    out = {"jeu": "reglage (600)", "critere": "défaut à exposition égale (60 % du total brut du moteur)", "resultats": res, "retenu": meilleur}
    (RACINE / "ml/artifacts/balayage-v1.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print("RETENU", meilleur)


if __name__ == "__main__":
    main()
