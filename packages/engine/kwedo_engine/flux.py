"""Chiffre d'affaires vérifié et séries hebdomadaires.

Entrée : liste de transactions au format du schéma (horodatage ISO, montant, sens, contrepartie, nature).
"""

from __future__ import annotations

import numpy as np

FENETRE_CIRCUIT_JOURS = 7
TOLERANCE_CIRCUIT = 0.10


def _tableau(transactions):
    n = len(transactions)
    t = np.array([np.datetime64(x["horodatage"], "s") for x in transactions], dtype="datetime64[s]") if n else np.array([], "datetime64[s]")
    m = np.array([x["montant"] for x in transactions], dtype=float)
    entree = np.array([x["sens"] == "entree" for x in transactions], dtype=bool)
    cp = np.array([x["contrepartie"] for x in transactions], dtype=object)
    nat = np.array([x["nature"] for x in transactions], dtype=object)
    return t, m, entree, cp, nat


def circuits(transactions) -> np.ndarray:
    """Masque des entrées circulaires : payeur qui reçoit du commerçant, sous 7 jours, un montant à ±10 %."""
    t, m, entree, cp, _ = _tableau(transactions)
    suspect = np.zeros(len(m), dtype=bool)
    sorties = {}
    for k in np.nonzero(~entree)[0]:
        sorties.setdefault(cp[k], []).append(k)
    fen = np.timedelta64(FENETRE_CIRCUIT_JOURS, "D")
    for k in np.nonzero(entree)[0]:
        for j in sorties.get(cp[k], ()):
            if t[k] <= t[j] <= t[k] + fen and abs(m[j] - m[k]) <= TOLERANCE_CIRCUIT * m[k]:
                suspect[k] = True
                break
    return suspect


def flux_verifies(transactions) -> dict:
    t, m, entree, cp, nat = _tableau(transactions)
    circ = circuits(transactions)
    client = entree & (nat == "paiement_client")
    verifie = client & ~circ
    total_entrees = m[entree].sum()
    return {
        "t": t, "m": m, "cp": cp, "entree": entree, "verifie": verifie,
        "nb_circulaires": int(circ.sum()),
        "montant_exclu_soi": float(m[entree & (nat == "transfert_soi")].sum()),
        "montant_exclu_circulaire": float(m[circ].sum()),
        "part_pro": float(m[client].sum() / total_entrees) if total_entrees else 0.0,
    }


def series_hebdo(transactions, fv: dict | None = None):
    """Encaissements vérifiés par semaine (lundi-dimanche) et jours actifs par semaine."""
    fv = fv or flux_verifies(transactions)
    t, m, v = fv["t"][fv["verifie"]], fv["m"][fv["verifie"]], None
    if len(t) == 0:
        return np.zeros(0), np.zeros(0), None
    jours = t.astype("datetime64[D]")
    # 1970-01-01 est un jeudi : décalage de 3 jours pour aligner sur le lundi.
    sem = ((jours.astype(int) + 3) // 7)
    debut, fin = sem.min(), sem.max()
    # Toutes les transactions (y compris non vérifiées) fixent la fin d'historique.
    if len(fv["t"]):
        fin = max(fin, int(((fv["t"].astype("datetime64[D]").astype(int) + 3) // 7).max()))
    idx = sem - debut
    w = np.zeros(fin - debut + 1)
    np.add.at(w, idx, m)
    actifs = np.zeros(fin - debut + 1)
    paires = np.unique(np.stack([idx, jours.astype(int)]), axis=1)
    np.add.at(actifs, paires[0], 1)
    return w, actifs, np.datetime64(int(debut * 7 - 3), "D")
