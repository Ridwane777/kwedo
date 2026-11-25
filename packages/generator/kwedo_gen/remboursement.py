"""Remboursement simulé d'un prêt selon un échéancier (fréquence et durée au choix, ADR 0015 et 0016).

Le commerçant doit avoir en caisse, à chaque date d'échéance, le montant dû, avec ce qui lui reste de ses
encaissements de la période **après ses dépenses** (``futur_hebdo`` : marge et dépenses personnelles imprévues déjà
déduites). La trésorerie non utilisée est reportée ; une échéance non couverte est **manquée** (elle n'est pas
rattrapée ensuite : l'impayé reste un impayé, comme dans l'étiquette hebdomadaire d'origine).

Défaut (identique pour toutes les fréquences) : au moins une échéance manquée de plus de ``RETARD_TOLERE_JOURS``
jours. Les encaissements cachés étant connus à la semaine, une échéance est manquée de plus de 0 jour si la caisse
disponible à la fin de la semaine où elle tombe ne la couvre pas. Pour l'hebdomadaire sur 26 échéances, c'est
exactement l'étiquette utilisée par l'évaluation d'origine.
"""

from __future__ import annotations

import math

import numpy as np

SEMAINES_PAR_MOIS = 52 / 12
FREQUENCES = {"hebdomadaire": 1.0, "quinzaine": 2.0, "mensuelle": SEMAINES_PAR_MOIS}
DUREES_MOIS = (3, 6, 9, 12)
RETARD_TOLERE_JOURS = 0


def nb_echeances(frequence: str, duree_mois: int | None = None, n_semaines: int = 26) -> int:
    """Même règle que le moteur (`Parametres.nb`)."""
    w = FREQUENCES[frequence]
    semaines = duree_mois * SEMAINES_PAR_MOIS if duree_mois else n_semaines
    return max(1, int(math.floor(semaines / w + 0.5)))


def semaines_echeance(frequence: str, nb: int) -> np.ndarray:
    """Indice (0 = première semaine) de la semaine où tombe chaque échéance (même règle que le moteur)."""
    if frequence == "hebdomadaire":
        return np.arange(nb)
    return np.ceil(np.arange(1, nb + 1) * FREQUENCES[frequence] - 1e-9).astype(int) - 1


def rembourser(futur_hebdo, echeances, frequence: str = "hebdomadaire", nb: int = 26) -> tuple[np.ndarray, np.ndarray]:
    """Pour une ou plusieurs échéances (montant par période) d'un même commerçant : (défaut, part manquée)."""
    e = np.atleast_1d(np.asarray(echeances, float))
    futur = np.maximum(np.asarray(futur_hebdo, float), 0)
    rangs = semaines_echeance(frequence, nb)
    if rangs[-1] >= len(futur):
        raise ValueError("avenir caché trop court pour cet échéancier")
    cumul = np.concatenate([[0.0], np.cumsum(futur)])
    apports = np.diff(cumul[np.concatenate([[0], rangs + 1])])  # encaissements nets entre deux échéances
    reserve = np.zeros_like(e)
    manquees = np.zeros_like(e)
    for x in apports:
        reserve += x
        ok = reserve >= e
        reserve = np.where(ok, reserve - e, reserve)
        manquees += ~ok
    return manquees > 0, manquees / nb
