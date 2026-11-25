"""Couche de calcul « portefeuille à une date d'arrêté », posée à côté du simulateur de remboursement
(`kwedo_gen.remboursement`, non modifié). Sert à mesurer un taux de dégradation à la définition BCEAO
(docs/evaluation/bceao/README.md).

Le simulateur ne renvoie que (défaut, part d'échéances manquées) à la fin du prêt. Ici, on rejoue **la même règle**
(caisse après dépenses ``futur_hebdo``, report de la trésorerie, échéance couverte en entier ou manquée) en gardant,
échéance par échéance, la semaine d'exigibilité et le statut. On en déduit, pour un prêt âgé de ``a`` semaines à la
date d'arrêté :
- l'encours brut restant dû (capital) : capital restant dû contractuel après les échéances exigibles, plus le capital
  des échéances exigibles impayées (tableau d'amortissement à annuités constantes, taux par période du moteur) ;
- le retard en jours de l'échéance impayée la plus ancienne : échéance exigible à la fin de la semaine ``t``, arrêté à
  la fin de la semaine ``a − 1`` → retard = 7·(a − 1 − t) jours (0 le jour même de l'échéance).

Deux règles de recouvrement :
- ``rattrapage=False`` (règle du simulateur) : une échéance manquée n'est jamais payée ensuite ;
- ``rattrapage=True`` (sensibilité) : la caisse disponible règle d'abord les impayés les plus anciens.
`verifier` contrôle que la règle sans rattrapage redonne exactement le nombre d'échéances manquées du simulateur.
"""

from __future__ import annotations

import math

import numpy as np

from kwedo_gen.remboursement import FREQUENCES, nb_echeances, rembourser, semaines_echeance


def taux_periode(i_hebdo: float, frequence: str) -> float:
    """Même règle que le moteur (`Parametres.ip`)."""
    return i_hebdo if frequence == "hebdomadaire" else (1 + i_hebdo) ** FREQUENCES[frequence] - 1


def echeancier(montant: float, ip: float, nb: int):
    """Échéance constante, capital restant dû après k échéances (k = 0..nb) et part de capital de chaque échéance."""
    e = montant * ip / (1 - (1 + ip) ** -nb)
    k = np.arange(nb + 1)
    crd = montant * (1 + ip) ** k - e * ((1 + ip) ** k - 1) / ip
    crd = np.maximum(crd, 0.0)
    return e, crd, crd[:-1] - crd[1:]


def payees(futur_hebdo, e: float, frequence: str, nb: int, rattrapage: bool = False) -> np.ndarray:
    """Pour chaque échéance, semaine (indice) où elle est réglée, ou -1 si elle ne l'est jamais (dans l'avenir connu)."""
    futur = np.maximum(np.asarray(futur_hebdo, float), 0)
    rangs = semaines_echeance(frequence, nb)
    regle = np.full(nb, -1)
    reserve, prochaine = 0.0, 0  # prochaine : échéance exigible suivante
    impayes: list[int] = []
    for t, x in enumerate(futur):
        reserve += x
        if rattrapage:
            while impayes and reserve >= e:
                j = impayes.pop(0)
                reserve -= e
                regle[j] = t
        while prochaine < nb and rangs[prochaine] == t:
            if reserve >= e and not (rattrapage and impayes):
                reserve -= e
                regle[prochaine] = t
            else:
                impayes.append(prochaine)
            prochaine += 1
        if prochaine >= nb and not (rattrapage and impayes):
            break
    return regle


def etats(futur_hebdo, montant: float, frequence: str, duree_mois: int, i_hebdo: float, ages, rattrapage=False):
    """Pour chaque âge a (semaines écoulées depuis le décaissement, à l'arrêté) : (encours brut, retard max en jours,
    -1 si aucun impayé). Au-delà de l'avenir connu (52 semaines), l'état est figé (pas de paiement supposé)."""
    nb = nb_echeances(frequence, duree_mois)
    ip = taux_periode(i_hebdo, frequence)
    e, crd, cap = echeancier(montant, ip, nb)
    rangs = semaines_echeance(frequence, nb)
    regle = payees(futur_hebdo, e, frequence, nb, rattrapage)
    enc, ret = [], []
    for a in ages:
        fin = a - 1  # dernière semaine écoulée
        exig = rangs <= fin
        k = int(exig.sum())
        impaye = exig & ((regle < 0) | (regle > fin))
        enc.append(float(crd[k] + cap[impaye].sum()))
        ret.append(int(7 * (fin - rangs[impaye].min())) if impaye.any() else -1)
    return np.array(enc), np.array(ret), e, nb


def verifier(futur_hebdo, montant, frequence, duree_mois, i_hebdo) -> None:
    """La règle sans rattrapage doit redonner le nombre d'échéances manquées du simulateur."""
    nb = nb_echeances(frequence, duree_mois)
    e, _, _ = echeancier(montant, taux_periode(i_hebdo, frequence), nb)
    _, part = rembourser(futur_hebdo, e, frequence, nb)
    manquees = int((payees(futur_hebdo, e, frequence, nb) < 0).sum())
    if manquees != int(round(float(part[0]) * nb)):
        raise AssertionError(f"écart avec le simulateur : {manquees} contre {float(part[0]) * nb}")


def horizon_semaines(frequence: str, duree_mois: int) -> int:
    nb = nb_echeances(frequence, duree_mois)
    return int(semaines_echeance(frequence, nb)[-1]) + 1


__all__ = ["etats", "verifier", "horizon_semaines", "echeancier", "payees", "taux_periode", "math"]
