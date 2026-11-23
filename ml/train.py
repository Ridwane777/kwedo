"""Entraîne les modèles v2 sur le générateur de RÉGLAGE uniquement (ADR 0007).

Usage : nice -n 10 .venv/bin/python ml/train.py
Partitions : reglage_a (entraînement), reglage_b (calibration isotonique, dédiée), reglage_v (validation / choix).
Sorties : ml/artifacts/modeles-v2.json, ml/artifacts/metriques-v2.json.
Comparaison systématique à la version NumPy v1 (régression logistique, ridge). Au plus 4 fils.
Mesures sur données SIMULÉES uniquement.
"""

import json
import os
import sys
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "4")
RACINE = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(RACINE / "packages/engine"), str(RACINE / "ml")]

import lightgbm as lgb  # noqa: E402
import numpy as np  # noqa: E402
from sklearn.isotonic import IsotonicRegression  # noqa: E402

from dataset import P, defaut_vectoriel  # noqa: E402
from kwedo_engine.decision import CARAC, MONOTONE, lignes_montant  # noqa: E402
from kwedo_engine.moteur import simuler_seuils  # noqa: E402

ART = RACINE / "ml/artifacts"
H = 8
FILS = 4
GRILLE = np.geomspace(0.01, 0.6, 14)  # échéance / médiane hebdomadaire


def charger(nom):
    return dict(np.load(RACINE / f"data/generated/{nom}.npz", allow_pickle=False))


def lignes(D):
    """Une ligne par (commerçant, échéance candidate). Étiquette : au moins une échéance manquée."""
    X, y, part, qui = [], [], [], []
    for k, (h, f, b, g, p20) in enumerate(zip(D["hebdo"], D["futur"], D["profil"], D["graine"], D["p20"])):
        if h.max() <= 0:
            continue
        seuils = simuler_seuils(h, P, int(g))
        e = GRILLE * max(float(np.median(h)), 1.0)
        X.append(lignes_montant(b, h, seuils, e, p20))
        d, pm = defaut_vectoriel(f, e)
        y.append(d); part.append(pm); qui.append(np.full(len(e), k))
    return np.vstack(X), np.concatenate(y).astype(float), np.concatenate(part), np.concatenate(qui)


def isotonique_lisse(iso):
    """Isotonique en paliers → courbe linéaire par morceaux passant par le centre de chaque palier.
    Reste croissante ; supprime les plateaux qui faisaient sauter le montant au franchissement du seuil."""
    x, y = iso.X_thresholds_, iso.y_thresholds_
    cx, cy, k = [], [], 0
    while k < len(y):
        j = k
        while j + 1 < len(y) and y[j + 1] == y[k]:
            j += 1
        cx.append((x[k] + x[j]) / 2); cy.append(y[k]); k = j + 1
    cx = np.array([x[0]] + cx + [x[-1]]); cy = np.array([cy[0]] + cy + [cy[-1]])
    keep = np.concatenate([[True], np.diff(cx) > 0])
    return cx[keep], cy[keep]


def points_autour_du_plafond(D, bst, iso, mult=(0.5, 0.75, 1.0, 1.25, 1.5, 2.0)):
    from kwedo_engine.decision import montant_max
    from kwedo_engine.moteur import annuite, l_max
    ix, iy = isotonique_lisse(iso)
    mod = {"booster": bst, "iso_x": ix, "iso_y": iy}
    a = annuite(P.i, P.n)
    X, y = [], []
    for h, f, b, g, p20 in zip(D["hebdo"], D["futur"], D["profil"], D["graine"], D["p20"]):
        if h.max() <= 0:
            continue
        seuils = simuler_seuils(h, P, int(g))
        lm = l_max(float(np.percentile(h, P.percentile)), P)
        l_r, _ = montant_max(mod, b, h, seuils, p20, 2 * lm, P.seuil_risque, a, 5000)
        pl = min(lm, l_r) // 5000 * 5000
        if pl < 25_000:
            continue
        e = pl * np.array(mult) / a
        X.append(lignes_montant(b, h, seuils, e, p20)); y.append(defaut_vectoriel(f, e)[0])
    return np.vstack(X), np.concatenate(y).astype(float)


def auc(score, y):
    y = y.astype(bool)
    r = np.argsort(np.argsort(score)) + 1
    return float((r[y].sum() - y.sum() * (y.sum() + 1) / 2) / (y.sum() * (~y).sum()))


def ece(p, y, classes=10):
    b = np.minimum((p * classes).astype(int), classes - 1)
    return float(sum(abs(p[b == k].mean() - y[b == k].mean()) * (b == k).mean() for k in range(classes) if (b == k).any()))


def logistique(X, y, lam=0.5, iters=3000, lr=0.1):
    Xb = np.column_stack([np.ones(len(X)), X]); w = np.zeros(Xb.shape[1])
    for _ in range(iters):
        p = 1 / (1 + np.exp(-Xb @ w))
        g = Xb.T @ (p - y) / len(y); g[1:] += lam * w[1:] / len(y)
        w -= lr * g
    return w


def metriques(p, y):
    return {"auc": round(auc(p, y), 4), "brier": round(float(np.mean((p - y) ** 2)), 4), "ece_10": round(ece(p, y), 4)}


# ---------- Prévision (cible : moyenne des H dernières semaines, à partir des précédentes) ----------
def carac_prev(hebdo):
    h = hebdo[:, :-H]
    rec = h[:, -12:]
    med = np.median(rec, 1) + 1
    pente = np.polyfit(np.arange(12), (rec / med[:, None]).T, 1)[0]
    return np.column_stack([np.ones(len(h)), np.log(med), np.log(h[:, -4:].mean(1) + 1), pente,
                            np.log(h[:, -26:].mean(1) + 1), h[:, -12:].std(1) / med]), med


def main():
    A, B, V = charger("reglage_a"), charger("reglage_b"), charger("reglage_v")
    XA, yA, _, _ = lignes(A)
    XB, yB, _, _ = lignes(B)
    XV, yV, _, _ = lignes(V)
    met = {"avertissement": "Mesures sur données simulées (générateur de réglage, partition de validation).",
           "lignes": {"a": int(len(yA)), "b": int(len(yB)), "v": int(len(yV))}}

    # Défaut : LightGBM (monotone en montant) contre NumPy (logistique) et risque simulé brut.
    params = dict(objective="binary", learning_rate=0.05, num_leaves=int(os.environ.get("KW_FEUILLES", 4)),
                  min_data_in_leaf=int(os.environ.get("KW_MIN_FEUILLE", 400)), feature_fraction=0.8,
                  bagging_fraction=0.8, bagging_freq=1, lambda_l2=1.0, monotone_constraints=MONOTONE,
                  monotone_constraints_method="advanced", num_threads=FILS, seed=7, verbose=-1, deterministic=True)
    bst = lgb.train(params, lgb.Dataset(XA, yA, feature_name=CARAC), num_boost_round=400)
    iso = IsotonicRegression(y_min=0.0, y_max=1.0, out_of_bounds="clip").fit(bst.predict(XB), yB)
    # 2e passe (partition B seulement) : la calibration doit être juste là où le moteur annonce un risque,
    # c'est-à-dire autour du plafond. On ajoute les points plafond × (0,5 … 2) calculés avec la 1re calibration.
    XB2, yB2 = points_autour_du_plafond(B, bst, iso)
    iso = IsotonicRegression(y_min=0.0, y_max=1.0, out_of_bounds="clip").fit(
        np.concatenate([bst.predict(XB), bst.predict(XB2)]), np.concatenate([yB, yB2]))
    iso_x, iso_y = isotonique_lisse(iso)
    pV_lgb = np.interp(bst.predict(XV), iso_x, iso_y)
    mu, sd = XA.mean(0), XA.std(0) + 1e-9
    w = logistique((XA - mu) / sd, yA)
    lin = lambda X: 1 / (1 + np.exp(-(w[0] + ((X - mu) / sd) @ w[1:])))  # noqa: E731
    iso_np = IsotonicRegression(y_min=0.0, y_max=1.0, out_of_bounds="clip").fit(lin(XB), yB)
    met["defaut"] = {
        "taux_validation": round(float(yV.mean()), 4),
        "risque_simule_brut": metriques(XV[:, -1], yV),
        "numpy_logistique": metriques(lin(XV), yV),
        "numpy_logistique_isotonique": metriques(iso_np.predict(lin(XV)), yV),
        "lightgbm_brut": metriques(bst.predict(XV), yV),
        "lightgbm_isotonique": metriques(pV_lgb, yV),
        "importance_gain": dict(sorted(((n, round(float(g), 1)) for n, g in
                                        zip(CARAC, bst.feature_importance("gain"))), key=lambda x: -x[1])),
    }

    # Prévision : LightGBM contre ridge NumPy.
    def prev_jeu(D):
        X, med = carac_prev(D["hebdo"]); return X, np.log(D["hebdo"][:, -H:].mean(1) + 1), med
    XpA, ypA, _ = prev_jeu(A); XpV, ypV, medV = prev_jeu(V)
    Areg = XpA.T @ XpA + np.eye(XpA.shape[1]); Areg[0, 0] -= 1
    wr = np.linalg.solve(Areg, XpA.T @ ypA)
    preg = lgb.train(dict(objective="l1", learning_rate=0.05, num_leaves=15, min_data_in_leaf=40, num_threads=FILS,
                          seed=7, verbose=-1, deterministic=True), lgb.Dataset(XpA[:, 1:], ypA), 300)
    vrai = np.exp(ypV) - 1
    err = lambda p: round(float(np.median(np.abs(p - vrai) / (vrai + 1))), 4)  # noqa: E731
    e_lgb, e_np = err(np.exp(preg.predict(XpV[:, 1:])) - 1), err(np.exp(XpV @ wr) - 1)
    met["prevision"] = {"erreur_relative_mediane_lightgbm": e_lgb, "erreur_relative_mediane_numpy_ridge": e_np,
                        "erreur_relative_mediane_naive_mediane12": err(medV), "retenu": "lightgbm" if e_lgb < e_np else "numpy"}

    # Anomalies : inchangé (Mahalanobis NumPy, ajusté sur les honnêtes du réglage).
    hon = A["manip"] == ""
    muA = np.median(A["anom"][hon], 0)
    icov = np.linalg.inv(np.cov((A["anom"][hon] - muA).T) + 1e-4 * np.eye(A["anom"].shape[1]))
    dist = lambda Z: np.sqrt(np.einsum("ij,jk,ik->i", Z - muA, icov, Z - muA))  # noqa: E731
    seuil = float(np.quantile(dist(A["anom"][hon]), 0.975))

    mod = {"version": "modeles-v2",
           "risque": {"lightgbm": bst.model_to_string(), "isotonique": {"x": iso_x.tolist(), "y": iso_y.tolist(), "lissage": "centres des paliers"},
                      "caracteristiques": CARAC},
           "prevision": {"moteur": met["prevision"]["retenu"], "lightgbm": preg.model_to_string(), "ridge": wr.tolist(), "horizon": H},
           "anomalies": {"mu": muA.tolist(), "icov": icov.tolist(), "seuil": seuil}}
    ART.mkdir(parents=True, exist_ok=True)
    (ART / "modeles-v2.json").write_text(json.dumps(mod))
    (ART / "metriques-v2.json").write_text(json.dumps(met, ensure_ascii=False, indent=1))
    print(json.dumps(met, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
