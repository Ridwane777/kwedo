"""Diagnostic du risque, étapes 2 à 4 : attribution, « pourquoi le modèle ne le voit pas », pistes chiffrées.

Lit docs/evaluation/diagnostic/ablation.json et les points intermédiaires data/generated/diagnostic/*.npz produits par
ml/diagnostic_ablation.py (mêmes graines neuves). Écrit docs/evaluation/diagnostic/analyse.json et des figures PNG,
puis supprime les intermédiaires (--garder pour les conserver).

Usage : nice -n 10 .venv/bin/python ml/diagnostic_analyse.py
Mesures sur données SIMULÉES.
"""

import json
import shutil
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(RACINE / "packages/engine"), str(RACINE / "packages/generator"), str(RACINE / "ml")]

import matplotlib  # noqa: E402

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from scipy.stats import ks_2samp  # noqa: E402
from sklearn.linear_model import LogisticRegression  # noqa: E402
from sklearn.metrics import roc_auc_score  # noqa: E402
from sklearn.ensemble import HistGradientBoostingClassifier  # noqa: E402
from sklearn.model_selection import cross_val_score  # noqa: E402

from frequences import CELLULES, FREQS  # noqa: E402
from kwedo_engine import decision  # noqa: E402
from kwedo_engine.decision import CARAC_F, PROFIL  # noqa: E402

DOS = RACINE / "docs/evaluation/diagnostic"
INTER = RACINE / "data/generated/diagnostic"
FREQ_IDX = np.array([FREQS.index(f) for f, _ in CELLULES])


def ece(p, o):
    b = np.minimum((p * 10).astype(int), 9)
    return float(sum(abs(p[b == k].mean() - o[b == k].mean()) * (b == k).mean() for k in range(10) if (b == k).any()))


def charger(nom):
    return dict(np.load(INTER / f"{nom}.npz"))


def logit(p):
    p = np.clip(p, 1e-4, 1 - 1e-4)
    return np.log(p / (1 - p))


def recal(p, o):
    """obs ~ sigmoïde(a + b·logit(p)) : a = décalage global, b = pente (1 et 0 si calibré)."""
    m = LogisticRegression(C=1e6, max_iter=1000).fit(logit(p)[:, None], o)
    return float(m.intercept_[0]), float(m.coef_[0, 0]), m


def attribution(A):
    V = A["variantes"]
    ordre = A["ordre_cumul"]
    noms_cumul = ["reglage", f"seul:{ordre[0]}"] + [f"cumul:{k}" for k in range(2, len(ordre) + 1)]

    def a_gap(v, f):
        return V[v]["A_calibration_ensemble"][f]["ecart_obs_moins_annonce"]

    def a_ece(v, f):
        return V[v]["A_calibration_ensemble"][f]["ece_10"]

    def b_diff(v, f, per="B_hors_reglage"):
        return V[v][per][f]["mediane"]["diff_moteur_moins_regle"]

    fin = noms_cumul[-1]
    tab = []
    for k, e in enumerate(ordre):
        avant, apres = noms_cumul[k], noms_cumul[k + 1]
        ligne = {"ecart": e}
        for f in FREQS:
            tot_a = a_gap(fin, f) - a_gap("reglage", f)
            tot_b = b_diff(fin, f) - b_diff("reglage", f)
            ligne[f] = {
                "seul_delta_ecart_A": round(a_gap(f"seul:{e}", f) - a_gap("reglage", f), 4),
                "seul_ic95_A": V[f"seul:{e}"]["A_calibration_ensemble"][f]["ic95_ecart"],
                "seul_delta_ece": round(a_ece(f"seul:{e}", f) - a_ece("reglage", f), 4),
                "cumul_delta_ecart_A": round(a_gap(apres, f) - a_gap(avant, f), 4),
                "part_A_cumul": round((a_gap(apres, f) - a_gap(avant, f)) / tot_a, 3) if abs(tot_a) > 1e-9 else None,
                "seul_delta_B_hors": round(b_diff(f"seul:{e}", f) - b_diff("reglage", f), 5),
                "cumul_delta_B_hors": round(b_diff(apres, f) - b_diff(avant, f), 5),
                "part_B_cumul": round((b_diff(apres, f) - b_diff(avant, f)) / tot_b, 3) if abs(tot_b) > 1e-9 else None,
            }
        tab.append(ligne)
    return tab, noms_cumul


def decalage(ref, var):
    """Test de Kolmogorov-Smirnov par caractéristique d'entrée : profil du commerçant + caractéristiques du montant."""
    out = {}
    for j, c in enumerate(PROFIL):
        s = ks_2samp(ref["pop_profil"][:, j], var["pop_profil"][:, j])
        out[c] = {"ks": round(float(s.statistic), 4), "p": float(f"{s.pvalue:.3g}"),
                  "mediane_ref": round(float(np.median(ref["pop_profil"][:, j])), 4),
                  "mediane_var": round(float(np.median(var["pop_profil"][:, j])), 4)}
    for j in range(len(PROFIL), len(CARAC_F) - 2):
        s = ks_2samp(ref["pop_X"][:, j], var["pop_X"][:, j])
        out[CARAC_F[j]] = {"ks": round(float(s.statistic), 4), "p": float(f"{s.pvalue:.3g}")}
    return out


def risque_a_entree_egale(ref, var, f=0):
    """Défaut observé par classe de risque annoncé : à risque annoncé égal (entrées comparables), le défaut change-t-il ?"""
    out = []
    for lo, hi in ((0, .02), (.02, .05), (.05, .1), (.1, .2), (.2, .4), (.4, 1.01)):
        r = {"classe": f"{lo:.0%}–{min(hi, 1):.0%}"}
        for tag, D in (("ref", ref), ("var", var)):
            m = (FREQ_IDX[D["pop_c"]] == f) & (D["pop_pred"] >= lo) & (D["pop_pred"] < hi)
            r[tag] = {"n": int(m.sum()), "annonce": round(float(D["pop_pred"][m].mean()), 4) if m.any() else None,
                      "observe": round(float(D["pop_obs"][m].mean()), 4) if m.any() else None}
        out.append(r)
    return out


def figure_fiabilite(variantes, fichier, titre, tag="pop"):
    fig, axes = plt.subplots(1, 3, figsize=(11, 3.6), dpi=90, sharey=True)
    for k, f in enumerate(FREQS):
        ax = axes[k]
        ax.plot([0, .6], [0, .6], color="#999", lw=1, ls="--")
        for nom, D in variantes:
            m = FREQ_IDX[D[f"{tag}_c"]] == k
            p, o = D[f"{tag}_pred"][m], D[f"{tag}_obs"][m]
            bords = np.quantile(p, np.linspace(0, 1, 11))
            b = np.clip(np.searchsorted(bords, p, side="right") - 1, 0, 9)
            xs = [p[b == i].mean() for i in range(10) if (b == i).sum() > 30]
            ys = [o[b == i].mean() for i in range(10) if (b == i).sum() > 30]
            ax.plot(xs, ys, marker="o", ms=3, lw=1.3, label=nom)
        ax.set_title(f, fontsize=10)
        ax.set_xlabel("risque annoncé")
        ax.set_xlim(0, .6); ax.set_ylim(0, .8)
    axes[0].set_ylabel("défaut observé")
    axes[0].legend(fontsize=7, loc="upper left")
    fig.suptitle(titre, fontsize=10)
    fig.tight_layout()
    fig.savefig(DOS / fichier)
    plt.close(fig)


def figure_attribution(tab, fichier):
    fig, ax = plt.subplots(figsize=(7, 3.4), dpi=90)
    noms = [t["ecart"] for t in tab]
    y = np.arange(len(noms))
    for k, f in enumerate(FREQS):
        ax.barh(y + (k - 1) * 0.27, [t[f]["cumul_delta_ecart_A"] * 100 for t in tab], height=0.27, label=f)
    ax.set_yticks(y, noms, fontsize=8)
    ax.invert_yaxis()
    ax.axvline(0, color="#666", lw=0.8)
    ax.set_xlabel("hausse de l'écart observé − annoncé (points de %), pas du cumul")
    ax.legend(fontsize=7)
    fig.tight_layout()
    fig.savefig(DOS / fichier)
    plt.close(fig)


def archetypes_jamais_vus(ref, test):
    mod = decision.charger(str(RACINE / "ml/artifacts/modeles-v3.json"))
    bst = mod["frequences"]["hebdomadaire"]["booster"]
    gain = bst.feature_importance("gain")
    imp = sorted(zip(CARAC_F, gain / gain.sum()), key=lambda x: -x[1])
    # Résidus par archétype (générateur de test complet ; population + échantillon jamais vu).
    res = {}
    for tag in ("pop", "hors"):
        arch = test[f"{tag}_arch"][test[f"{tag}_i"]]
        for a in np.unique(arch):
            m = arch == a
            if a in res and tag == "pop":
                continue
            res[a] = {"points": int(m.sum()), "annonce": round(float(test[f"{tag}_pred"][m].mean()), 4),
                      "observe": round(float(test[f"{tag}_obs"][m].mean()), 4),
                      "residu": round(float(test[f"{tag}_obs"][m].mean() - test[f"{tag}_pred"][m].mean()), 4),
                      "auc_v3": round(float(roc_auc_score(test[f"{tag}_obs"][m], test[f"{tag}_pred"][m])), 4)}
    # Modèle simple : régression logistique sur 2 caractéristiques du montant, apprise sur le réglage (diagnostic).
    cols = [CARAC_F.index("echeance_sur_prudent_periode"), CARAC_F.index("risque_simule")]

    def Z(X):
        return np.column_stack([np.log(np.maximum(X[:, cols[0]], 1e-4)), X[:, cols[1]]])

    simple = LogisticRegression(max_iter=1000).fit(Z(ref["pop_X"]), ref["pop_obs"])
    comp = {}
    for nom, D, tag in (("reglage_vus", ref, "pop"), ("test_complet_population", test, "pop"), ("test_complet_jamais_vus", test, "hors"),
                        ("reglage_params_jamais_vus", ref, "hors")):
        o, p = D[f"{tag}_obs"], D[f"{tag}_pred"]
        comp[nom] = {"auc_v3": round(float(roc_auc_score(o, p)), 4),
                     "auc_regle_2_variables": round(float(roc_auc_score(o, simple.predict_proba(Z(D[f"{tag}_X"]))[:, 1])), 4),
                     "auc_risque_simule_seul": round(float(roc_auc_score(o, D[f"{tag}_X"][:, cols[1]])), 4)}
    # Fuite d'activité : l'archétype est-il reconnaissable depuis le profil d'entrée ?
    P = np.vstack([ref["pop_profil"], ref["hors_profil"]])
    y = np.concatenate([ref["pop_arch"], ref["hors_arch"]])
    acc = cross_val_score(HistGradientBoostingClassifier(max_iter=150), P, y, cv=3).mean()
    maj = max(np.mean(y == a) for a in np.unique(y))
    return {"importance_gain_hebdomadaire": [(c, round(float(v), 4)) for c, v in imp[:10]],
            "residus_par_archetype_test_complet": res, "comparaison_modele_simple": comp,
            "archetype_reconnaissable_depuis_profil": {"exactitude_cv3": round(float(acc), 3), "classe_majoritaire": round(float(maj), 3)}}


def pistes(test, ref, dominant):
    """Gains attendus, mesurés par validation croisée en deux moitiés de commerçants (on règle sur l'une, mesure sur l'autre)."""
    out = {}
    for nom, D in (("test_complet", test), ("dominant_seul", dominant)):
        p, o, i = D["pop_pred"], D["pop_obs"], D["pop_i"]
        A, Bm = i % 2 == 0, i % 2 == 1
        a, b, m = recal(p[A], o[A])
        q = m.predict_proba(logit(p[Bm])[:, None])[:, 1]
        # décalage seul (pente fixée à 1) : a* tel que la moyenne prédite = moyenne observée
        lo, hi = -3.0, 3.0
        for _ in range(60):
            c = (lo + hi) / 2
            lo, hi = (c, hi) if (1 / (1 + np.exp(-(logit(p[A]) + c)))).mean() < o[A].mean() else (lo, c)
        qd = 1 / (1 + np.exp(-(logit(p[Bm]) + c)))
        out[nom] = {"ece_avant": round(ece(p[Bm], o[Bm]), 4),
                    "recalibration_decalage_seul": {"decalage_logit": round(c, 3), "ece_apres": round(ece(qd, o[Bm]), 4)},
                    "recalibration_decalage_et_pente": {"a": round(a, 3), "b": round(b, 3), "ece_apres": round(ece(q, o[Bm]), 4)}}
    # Le même décalage appliqué au générateur de réglage : ce que coûte un correctif réglé sur le test.
    c = out["test_complet"]["recalibration_decalage_seul"]["decalage_logit"]
    pr, orr = ref["pop_pred"], ref["pop_obs"]
    # Activité inconnue : ne jamais annoncer moins que le risque simulé par le moteur (aucun réglage sur le test).
    j = CARAC_F.index("risque_simule")
    out["activite_inconnue_plancher_risque_simule"] = {}
    for nom, D in (("reglage", ref), ("test_complet", test)):
        p, o, x = D["hors_pred"], D["hors_obs"], D["hors_X"][:, j]
        q = np.maximum(p, x)
        out["activite_inconnue_plancher_risque_simule"][nom] = {
            "observe": round(float(o.mean()), 4), "annonce_v3": round(float(p.mean()), 4), "annonce_plancher": round(float(q.mean()), 4),
            "ece_v3": round(ece(p, o), 4), "ece_plancher": round(ece(q, o), 4), "ece_risque_simule_seul": round(ece(x, o), 4)}
    out["decalage_test_applique_au_reglage"] = {"ece_avant": round(ece(pr, orr), 4),
                                                "ece_apres": round(ece(1 / (1 + np.exp(-(logit(pr) + c))), orr), 4)}
    return out


def main():
    A = json.loads((DOS / "ablation.json").read_text())
    tab, noms_cumul = attribution(A)
    dominant = A["ordre_cumul"][0]
    ref, dom, test = charger("reglage"), charger(f"seul_{dominant}"), charger(f"cumul_{len(A['ordre_cumul'])}")
    out = {"attribution": tab, "ordre_cumul": A["ordre_cumul"], "ecart_dominant": dominant}
    out["decalage_entrees"] = {f"reglage_vs_seul_{dominant}": decalage(ref, dom), "reglage_vs_test_complet": decalage(ref, test)}
    out["defaut_a_risque_annonce_egal_hebdo"] = {f"seul_{dominant}": risque_a_entree_egale(ref, dom),
                                                  "test_complet": risque_a_entree_egale(ref, test)}
    out["recalibration_par_variante"] = {}
    for nom in ["reglage"] + [f"seul_{e}" for e in A["ordre_cumul"]] + [f"cumul_{k}" for k in range(2, len(A["ordre_cumul"]) + 1)]:
        D = ref if nom == "reglage" else charger(nom)
        r = {}
        for k, f in enumerate(FREQS):
            m = FREQ_IDX[D["pop_c"]] == k
            a, b, _ = recal(D["pop_pred"][m], D["pop_obs"][m])
            r[f] = {"decalage_a": round(a, 3), "pente_b": round(b, 3)}
        out["recalibration_par_variante"][nom] = r
    out["archetypes_jamais_vus"] = archetypes_jamais_vus(ref, test)
    out["pistes"] = pistes(test, ref, dom)
    figure_fiabilite([("réglage", ref), (f"+ {dominant} seul", dom), ("test complet", test)], "fiabilite.png",
                     "Courbes de fiabilité (déciles), ensemble — générateurs de diagnostic")
    figure_fiabilite([("réglage", ref), ("test complet", test)], "fiabilite-jamais-vus.png",
                     "Fiabilité sur artisanat et quincaillerie (jamais vus)", tag="hors")
    figure_attribution(tab, "attribution.png")
    (DOS / "analyse.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(json.dumps({k: out[k] for k in ("ordre_cumul", "ecart_dominant")}, ensure_ascii=False))
    if "--garder" not in sys.argv:
        shutil.rmtree(INTER)


if __name__ == "__main__":
    main()
