"""Entraîne les trois modèles (NumPy pur, CPU) sur le générateur de réglage, évalue sur le générateur de test.

Usage : nice -n 10 python3 ml/train.py
Sorties : ml/artifacts/modeles-v1.json (poids), ml/artifacts/metriques-v1.json (chiffres mesurés).
Toutes les métriques portent sur des données SIMULÉES : elles montrent que la chaîne fonctionne,
pas une performance réelle.
"""

import json
import os
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "4")
import numpy as np  # noqa: E402

RACINE = Path(__file__).resolve().parents[1]
ART = RACINE / "ml/artifacts"
HORS_REGLAGE = ("artisanat", "quincaillerie")
H = 8  # horizon de prévision (semaines)


def charger(nom):
    return dict(np.load(RACINE / f"data/generated/{nom}.npz", allow_pickle=False))


# ---------- Prévision des encaissements ----------
def carac_prev(hebdo):
    h = hebdo[:, :-H]
    rec = h[:, -12:]
    med = np.median(rec, 1) + 1
    pente = np.polyfit(np.arange(12), (rec / med[:, None]).T, 1)[0]
    an = h[:, -52 + H:-52 + 2 * H].mean(1) if h.shape[1] >= 52 - H else med  # mêmes semaines un an plus tôt (partiel)
    return np.column_stack([np.ones(len(h)), np.log(med), np.log(h[:, -4:].mean(1) + 1), pente,
                            np.log(h[:, -26:].mean(1) + 1), np.log(an + 1) - np.log(med),
                            h[:, -12:].std(1) / med]), med


def cible_prev(hebdo):
    return np.log(hebdo[:, -H:].mean(1) + 1)


def ridge(X, y, lam=1.0):
    A = X.T @ X + lam * np.eye(X.shape[1]); A[0, 0] -= lam
    return np.linalg.solve(A, X.T @ y)


# ---------- Probabilité de défaut ----------
def standardiser(X, mu=None, sd=None):
    mu = X.mean(0) if mu is None else mu
    sd = X.std(0) + 1e-9 if sd is None else sd
    return (X - mu) / sd, mu, sd


def logistique(X, y, lam=0.5, iters=3000, lr=0.1):
    Xb = np.column_stack([np.ones(len(X)), X]); w = np.zeros(Xb.shape[1])
    for _ in range(iters):
        p = 1 / (1 + np.exp(-Xb @ w))
        g = Xb.T @ (p - y) / len(y); g[1:] += lam * w[1:] / len(y)
        w -= lr * g
    return w


def predire_log(w, X):
    return 1 / (1 + np.exp(-(np.column_stack([np.ones(len(X)), X]) @ w)))


def auc(score, y):
    y = y.astype(bool)
    if y.all() or (~y).all():
        return float("nan")
    r = np.argsort(np.argsort(score)) + 1
    return float((r[y].sum() - y.sum() * (y.sum() + 1) / 2) / (y.sum() * (~y).sum()))


def calibration(p, y, bins=5):
    edges = np.quantile(p, np.linspace(0, 1, bins + 1)); out = []
    for a, b in zip(edges[:-1], edges[1:]):
        m = (p >= a) & (p <= b)
        if m.any():
            out.append({"predit": round(float(p[m].mean()), 3), "observe": round(float(y[m].mean()), 3), "n": int(m.sum())})
    return out


# ---------- Anomalies ----------
def mahalanobis_fit(A):
    mu = np.median(A, 0)
    cov = np.cov((A - mu).T) + 1e-4 * np.eye(A.shape[1])
    return mu, np.linalg.inv(cov)


def mahalanobis(A, mu, icov):
    d = A - mu
    return np.sqrt(np.einsum("ij,jk,ik->i", d, icov, d))


def main():
    R, T = charger("reglage"), charger("test")
    met, mod = {"avertissement": "Mesures sur données simulées uniquement. Pas une performance réelle."}, {}
    hors = np.isin(T["archetype"], HORS_REGLAGE)
    pleins_R, pleins_T = (R["hebdo"] > 0).sum(1) >= 40, (T["hebdo"] > 0).sum(1) >= 40

    # Prévision
    XR, _ = carac_prev(R["hebdo"][pleins_R]); yR = cible_prev(R["hebdo"][pleins_R])
    w = ridge(XR, yR)
    XT, medT = carac_prev(T["hebdo"][pleins_T]); yT = T["hebdo"][pleins_T][:, -H:].mean(1)
    pred = np.exp(XT @ w) - 1
    hT = hors[pleins_T]
    def erreur(p, m=slice(None)):
        return round(float(np.median(np.abs(p[m] - yT[m]) / (yT[m] + 1))), 4)
    met["prevision"] = {"cible": f"moyenne des {H} semaines suivantes", "n_test": int(len(yT)),
                        "erreur_relative_mediane_modele": erreur(pred), "erreur_relative_mediane_naive_mediane12": erreur(medT),
                        "hors_reglage_modele": erreur(pred, hT), "hors_reglage_naive": erreur(medT, hT)}
    mod["prevision"] = {"poids": w.tolist(), "horizon": H}

    # Défaut (étiquette : au moins une échéance manquée au plafond du moteur)
    okR, okT = R["plafond"] > 0, T["plafond"] > 0
    XR, mu, sd = standardiser(R["x"][okR]); yR = R["defaut"][okR].astype(float)
    wl = logistique(XR, yR)
    XT, _, _ = standardiser(T["x"][okT], mu, sd); yT = T["defaut"][okT].astype(float)
    pT = predire_log(wl, XT); hT = hors[okT]
    naive = T["x"][okT][:, 2]  # règle simple : plus le CV est élevé, plus le risque est grand
    met["defaut"] = {"n_test": int(okT.sum()), "taux_defaut_test": round(float(yT.mean()), 3),
                     "auc_modele": round(auc(pT, yT), 3), "auc_naive_regularite": round(auc(naive, yT), 3),
                     "auc_risque_simule_moteur": round(auc(T["risque"][okT], yT), 3),
                     "auc_modele_hors_reglage": round(auc(pT[hT], yT[hT]), 3),
                     "brier_modele": round(float(np.mean((pT - yT) ** 2)), 4),
                     "calibration": calibration(pT, yT)}
    mod["defaut"] = {"poids": wl.tolist(), "mu": mu.tolist(), "sd": sd.tolist(), "caracteristiques": "voir ml/dataset.py CARAC"}

    # Anomalies : ajusté sur les honnêtes du réglage, seuil au 97,5e percentile
    hon = R["manip"] == ""
    muA, icov = mahalanobis_fit(R["anom"][hon])
    seuil = float(np.quantile(mahalanobis(R["anom"][hon], muA, icov), 0.975))
    sT = mahalanobis(T["anom"], muA, icov); alerteM = sT > seuil
    manip = T["manip"] != ""; regles = T["alerte_regles"].astype(bool); combi = alerteM | regles
    par_type = {k: {"n": int((T["manip"] == k).sum()), "regles": round(float(regles[T["manip"] == k].mean()), 3),
                    "modele": round(float(alerteM[T["manip"] == k].mean()), 3), "combine": round(float(combi[T["manip"] == k].mean()), 3)}
                for k in sorted(set(T["manip"]) - {""})}
    met["anomalies"] = {"n_test": int(len(sT)), "n_manipules": int(manip.sum()),
                        "detection_regles": round(float(regles[manip].mean()), 3),
                        "detection_modele": round(float(alerteM[manip].mean()), 3),
                        "detection_combinee": round(float(combi[manip].mean()), 3),
                        "fausses_alertes_regles": round(float(regles[~manip].mean()), 3),
                        "fausses_alertes_modele": round(float(alerteM[~manip].mean()), 3),
                        "fausses_alertes_combinees": round(float(combi[~manip].mean()), 3), "par_type": par_type}
    mod["anomalies"] = {"mu": muA.tolist(), "icov": icov.tolist(), "seuil": seuil}

    ART.mkdir(parents=True, exist_ok=True)
    mod["version"] = "modeles-v1"
    (ART / "modeles-v1.json").write_text(json.dumps(mod))
    (ART / "metriques-v1.json").write_text(json.dumps(met, ensure_ascii=False, indent=1))
    print(json.dumps(met, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
