"""Outils communs au risque toutes fréquences (ADR 0016) : échéanciers, lignes de caractéristiques, étiquettes.

Paramètres de l'institution de référence (inchangés) : m 0,30 ; s 0,40 ; i 0,35 %/sem. ; p20 ; seuil 10 %.
Seules la fréquence et la durée varient. Étiquette : `kwedo_gen.rembourser` (même définition du défaut partout).
"""

import os
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(RACINE / "packages/engine"), str(RACINE / "packages/generator"), str(RACINE / "ml")]

import numpy as np  # noqa: E402

from kwedo_engine import Parametres  # noqa: E402
from kwedo_engine.decision import lignes_frequence  # noqa: E402
from kwedo_engine.moteur import annuite, serie_periode, simuler_seuils  # noqa: E402
from kwedo_gen import DUREES_MOIS, rembourser  # noqa: E402

FREQS = ("hebdomadaire", "quinzaine", "mensuelle")
CELLULES = [(f, d) for f in FREQS for d in DUREES_MOIS]
BASE = dict(m=0.30, s=0.40, n=26, i=0.0035, percentile=20, seuil_risque=0.10)
GRILLE = np.geomspace(0.01, 0.6, 14)  # échéance / médiane des encaissements de la période
FILS = int(os.environ.get("KW_FILS", 4))


def params(frequence: str, duree: int) -> Parametres:
    return Parametres(**BASE, frequence=frequence, duree_mois=duree)


def contexte(h, g, p: Parametres):
    """Seuils simulés, encaissement prudent et médiane de la période (même calcul que le moteur)."""
    sp = serie_periode(h, p)
    return simuler_seuils(h, p, int(g)), float(np.percentile(sp, p.percentile)), max(float(np.median(sp)), 1.0)


def lignes(base, h, seuils, prudent, median, p, echeances):
    return lignes_frequence(base, h, seuils, echeances, prudent, median, p.w, p.nb)


def etiquette(futur, echeances, p: Parametres):
    return rembourser(futur, echeances, p.frequence, p.nb)


def lignes_grille(args):
    """Toutes les cellules fréquence × durée pour un commerçant : (X, y, cellule) sur la grille d'échéances."""
    h, futur, base, g = args
    if h.max() <= 0:
        return None
    X, y, c = [], [], []
    for j, (f, d) in enumerate(CELLULES):
        p = params(f, d)
        seuils, pru, med = contexte(h, g, p)
        e = GRILLE * med
        X.append(lignes(base, h, seuils, pru, med, p, e)); y.append(etiquette(futur, e, p)[0]); c.append(np.full(len(e), j))
    return np.vstack(X), np.concatenate(y), np.concatenate(c)


def a_periode(p: Parametres) -> float:
    return annuite(p.ip, p.nb)
