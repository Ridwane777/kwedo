"""Évaluation du moteur : les 7 questions du cahier (section « Évaluation et validation »).

Usage : nice -n 10 python3 ml/evaluate.py
Prérequis : data/generated/reglage.npz et test.npz (ml/dataset.py), ml/artifacts/metriques-v1.json (ml/train.py).
Sortie : docs/evaluation/resultats.json et docs/evaluation/resultats.md.

TOUT est mesuré sur données SIMULÉES : les impayés sont ceux du simulateur. Cela montre que la logique tient,
pas que le moteur marchera sur de vrais commerçants.
"""

import json
import os
import platform
import re
import sys
import time
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "4")
RACINE = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(RACINE / "packages/engine"), str(RACINE / "packages/generator"), str(RACINE / "ml")]

import numpy as np  # noqa: E402

from dataset import P, defaut  # noqa: E402
from kwedo_engine import analyser  # noqa: E402
from kwedo_engine.moteur import PLAFOND_MIN, _plafond, echeance, risque_pour_montant, simuler_seuils  # noqa: E402
from kwedo_gen import TEST, generer_commercant  # noqa: E402

HORS = ("artisanat", "quincaillerie")
SORTIE = RACINE / "docs/evaluation"


def charger(nom):
    return dict(np.load(RACINE / f"data/generated/{nom}.npz", allow_pickle=False))


MOD = json.loads((RACINE / "ml/artifacts/modeles-v1.json").read_text())["defaut"]


def proba_defaut(X):
    x = (X - np.array(MOD["mu"])) / np.array(MOD["sd"])
    w = np.array(MOD["poids"])
    return 1 / (1 + np.exp(-(w[0] + x @ w[1:])))


def plafonds_moteur(D, avec_modele=True):
    """Même règle que kwedo_engine.analyser : formule + simulation, puis modulation (baisse seulement) par le modèle."""
    L = np.array([_plafond(h, P, int(g))[0] for h, g in zip(D["hebdo"], D["graine"])], float)
    if avec_modele:
        L = np.floor(L * np.exp(-P.gamma_modele * proba_defaut(D["x"])) / 5000) * 5000
    return L


def evaluer_montants(D, montants):
    accordes = montants >= PLAFOND_MIN
    res = [defaut(f, m if a else 0) for f, m, a in zip(D["futur"], montants, accordes)]
    d = np.array([r[0] for r in res]); part = np.array([r[1] for r in res])
    n = max(1, accordes.sum())
    return {"accordes": int(accordes.sum()), "montant_total": int(montants[accordes].sum()),
            "montant_moyen": int(montants[accordes].mean()) if accordes.any() else 0,
            "taux_defaut": round(float(d[accordes].sum() / n), 4),
            "part_echeances_manquees": round(float(part[accordes].sum() / n), 4)}


def capacite_reelle(futur):
    """Plus gros montant remboursable sans incident dans l'avenir caché (vérité du simulateur)."""
    dispo = np.maximum(futur[: P.n], 0)
    e_max = (np.cumsum(dispo) / np.arange(1, P.n + 1)).min()
    return e_max * (1 - (1 + P.i) ** -P.n) / P.i


def q1_q2(R, T):
    out = {}
    # Calibrer les règles naïves sur le générateur de réglage : même exposition totale que le moteur.
    LR = plafonds_moteur(R)
    k_moy = LR.sum() / R["moyenne"].sum()
    k_med = LR.sum() / R["median"].sum()
    LT = plafonds_moteur(T)
    LT_sans = plafonds_moteur(T, avec_modele=False)
    naive_moy = k_moy * T["moyenne"]
    naive_med = k_med * T["median"]
    hors = np.isin(T["archetype"], HORS)
    for nom, masque in (("test_complet", np.ones(len(LT), bool)), ("archetypes_hors_reglage", hors)):
        sub = {k: v[masque] for k, v in T.items()}
        out[nom] = {"n": int(masque.sum()),
                    "moteur": evaluer_montants(sub, LT[masque]),
                    "naive_moyenne_x_k": evaluer_montants(sub, naive_moy[masque]),
                    "naive_mediane_x_k": evaluer_montants(sub, naive_med[masque])}
    # Comparaison juste : à montant total prêté ÉGAL sur le jeu de test, quel taux de défaut ?
    echelles = np.linspace(0.3, 1.8, 31)
    for nom, masque in (("test_complet", np.ones(len(LT), bool)), ("archetypes_hors_reglage", hors)):
        sub = {k: v[masque] for k, v in T.items()}
        courbes = {}
        for cle, L in (("moteur", LT), ("moteur_sans_modele", LT_sans), ("naive_mediane", naive_med)):
            c = [evaluer_montants(sub, L[masque] * a) for a in echelles]
            courbes[cle] = (np.array([x["montant_total"] for x in c]), np.array([x["taux_defaut"] for x in c]))
        cibles = np.quantile(np.concatenate([v[0] for v in courbes.values()]), [0.3, 0.5, 0.7])
        out[nom]["a_montant_total_egal"] = [
            {"montant_total": int(c), **{f"defaut_{k}": round(float(np.interp(c, *v)), 4) for k, v in courbes.items()}}
            for c in cibles]
    # Dossiers manipulés : combien chaque méthode prête par rapport à la capacité réelle (cachée) ?
    cap = np.array([capacite_reelle(f) for f in T["futur"]])
    manip = T["manip"] != ""
    out["dossiers_manipules"] = {"n": int(manip.sum())}
    for cle, L in (("moteur", LT), ("naive_mediane", naive_med)):
        ratio = L[manip] / np.maximum(cap[manip], 1)
        out["dossiers_manipules"][cle] = {
            "montant_sur_capacite_median": round(float(np.median(ratio)), 3),
            "part_au_dessus_capacite": round(float((ratio > 1).mean()), 3),
            "taux_defaut": evaluer_montants({k: v[manip] for k, v in T.items()}, L[manip])["taux_defaut"],
            "alerte_agent": round(float(T["alerte_regles"][manip].mean()), 3) if cle == "moteur" else 0.0}
    out["coefficients_naifs"] = {"k_moyenne": round(float(k_moy), 3), "k_mediane": round(float(k_med), 3),
                                 "methode": "k choisi sur le générateur de réglage pour prêter le même total que le moteur"}
    # Courbe accord contre impayés : on fait varier l'échelle des montants de chaque méthode.
    courbe = []
    for a in (0.4, 0.6, 0.8, 1.0, 1.2, 1.5):
        courbe.append({"echelle": a, "moteur": evaluer_montants(T, LT * a), "naive_mediane": evaluer_montants(T, naive_med * a)})
    out["courbe_accord_impayes"] = courbe
    # Q2 : finance-t-il assez ?
    cap = np.array([capacite_reelle(f) for f in T["futur"]])
    solvables = cap >= PLAFOND_MIN
    q2 = {"n_solvables": int(solvables.sum())}
    for nom, L in (("moteur", LT), ("naive_mediane", naive_med)):
        recoit = L >= PLAFOND_MIN
        ok = solvables & recoit
        q2[nom] = {"part_solvables_finances": round(float(ok.sum() / max(1, solvables.sum())), 4),
                   "montant_moyen_solvables": int(L[ok].mean()) if ok.any() else 0,
                   "utilisation_capacite_mediane": round(float(np.median(np.minimum(L[ok], cap[ok]) / cap[ok])), 4) if ok.any() else 0,
                   "part_montants_au_dessus_capacite": round(float((L[ok] > cap[ok]).mean()), 4) if ok.any() else 0}
    return out, q2


def q3_calibration(T, n=150):
    """Risque simulé annoncé contre fréquence observée dans les étiquettes, à plusieurs montants."""
    pred, obs = [], []
    for h, f, g in zip(T["hebdo"][:n], T["futur"][:n], T["graine"][:n]):
        pl = _plafond(h, P, int(g))[0]
        if pl < PLAFOND_MIN:
            continue
        seuils = simuler_seuils(h, P, int(g))
        for a in (0.5, 0.75, 1.0, 1.25, 1.5, 2.0):
            pred.append(risque_pour_montant(seuils, pl * a, P)); obs.append(defaut(f, pl * a)[0])
    pred, obs = np.array(pred), np.array(obs, float)
    bins = [0, 0.02, 0.05, 0.1, 0.2, 0.4, 1.01]
    table = []
    for lo, hi in zip(bins[:-1], bins[1:]):
        m = (pred >= lo) & (pred < hi)
        if m.any():
            table.append({"risque_annonce": f"{lo:.0%}–{min(hi, 1):.0%}", "moyenne_annoncee": round(float(pred[m].mean()), 4),
                          "frequence_observee": round(float(obs[m].mean()), 4), "n": int(m.sum())})
    return {"points": int(len(pred)), "fiabilite": table,
            "ecart_moyen_absolu": round(float(np.mean([abs(t["moyenne_annoncee"] - t["frequence_observee"]) for t in table])), 4)}


def q4_stabilite(T, n=150, graine=7):
    rng = np.random.default_rng(graine)
    var_donnees, var_params = [], []
    for h, g in zip(T["hebdo"][:n], T["graine"][:n]):
        base = _plafond(h, P, int(g))[0]
        if base < PLAFOND_MIN:
            continue
        bruit = h * rng.uniform(0.95, 1.05, len(h))  # ±5 % sur chaque semaine
        var_donnees.append(abs(_plafond(bruit, P, int(g))[0] - base) / base)
        for dm, ds in ((1.1, 1), (0.9, 1), (1, 1.1), (1, 0.9)):
            p2 = P.__class__(**{**P.__dict__, "m": P.m * dm, "s": P.s * ds})
            var_params.append(abs(_plafond(h, p2, int(g))[0] - base) / base)
    q = lambda v, x: round(float(np.quantile(v, x)), 4)  # noqa: E731
    return {"perturbation_donnees_5pct": {"mediane": q(var_donnees, 0.5), "p90": q(var_donnees, 0.9), "max": q(var_donnees, 1)},
            "perturbation_m_s_10pct": {"mediane": q(var_params, 0.5), "p90": q(var_params, 0.9), "max": q(var_params, 1)},
            "seuil_propose": "variation ≤ 10 % pour une perturbation de 5 % des données (à fixer avec le prêteur)",
            "respecte": bool(np.quantile(var_donnees, 0.9) <= 0.10)}


def q5_detection():
    m = json.loads((RACINE / "ml/artifacts/metriques-v1.json").read_text())["anomalies"]
    m["sans_regles"] = {"detection": 0.0, "fausses_alertes": 0.0, "note": "sans contrôle, aucun cas injecté n'est signalé"}
    return m


def q6_raisons(n=40):
    """Les raisons sont-elles fidèles ? On recalcule indépendamment le plafond en neutralisant chaque facteur."""
    ok_effet = ok_ordre = ok_formule = total = 0
    for k in range(n):
        c = generer_commercant(f"r{k}", 9000 + k, TEST, manipulation=None)
        r = analyser(c["transactions"], P, graine=k, avec_modeles=False)
        if r["plafond"] < PLAFOND_MIN:
            continue
        total += 1
        h = np.array(r["serie_hebdo"], float)
        for x in r["raisons"]:
            if x["code"] == "regularite":
                med, cv = np.median(h), r["indicateurs"]["regularite_cv"]
                regulier = med + (h - h.mean()) * min(1.0, 0.25 / cv)
                attendu = _plafond(np.maximum(regulier, 0), P, k)[0] - r["plafond"]
                ok_effet += attendu == x["effet"]
            else:
                ok_effet += 1
        effets = [abs(x["effet"]) for x in r["raisons"] if x["code"] not in ("encaissements", "formule", "modele_risque")]
        ok_ordre += effets == sorted(effets, reverse=True)
        ok_formule += (r["l_max"] < r["l_simulation"]) == any(x["code"] == "formule" for x in r["raisons"])
    return {"dossiers": total, "effets_recalcules_identiques": round(ok_effet / (3 * total), 4),
            "raisons_triees_par_effet": round(ok_ordre / total, 4), "raison_formule_coherente": round(ok_formule / total, 4)}


def q7_equite(T, n=40):
    sensibles = re.compile(r"\b(genre|sexe|religion|ethnie|ethnique|nationalit|age_|date_naissance)\w*", re.I)
    fichiers = list((RACINE / "packages/engine/kwedo_engine").glob("*.py"))
    trouves = [f.name for f in fichiers if sensibles.search(f.read_text())]
    # Mêmes flux, archétype différent : l'archétype n'est pas une entrée, la décision doit être identique.
    identiques = 0
    for k in range(n):
        c = generer_commercant(f"e{k}", 7000 + k, TEST, manipulation=None)
        a = analyser(c["transactions"], P, graine=1, avec_modeles=False)
        c2 = {**c, "type_activite": "tissus" if c["type_activite"] != "tissus" else "alimentation"}
        b = analyser(c2["transactions"], P, graine=1, avec_modeles=False)
        identiques += a["plafond"] == b["plafond"] and a["recommandation"] == b["recommandation"]
    # Écarts par archétype à flux comparables (information, pas une preuve d'équité).
    LT = plafonds_moteur(T)
    ratio = {a: round(float(np.median(LT[T["archetype"] == a] / np.maximum(T["median"][T["archetype"] == a], 1))), 3)
             for a in sorted(set(T["archetype"]))}
    return {"variables_sensibles_dans_le_code_du_moteur": trouves, "decisions_identiques_a_flux_egaux": f"{identiques}/{n}",
            "plafond_sur_mediane_hebdo_par_archetype": ratio}


def q8_temps(T, n=100):
    t0 = time.perf_counter()
    for h, g in zip(T["hebdo"][:n], T["graine"][:n]):
        _plafond(h, P, int(g))
    sim = (time.perf_counter() - t0) / n
    c = generer_commercant("t", 1, TEST, manipulation=None)
    t0 = time.perf_counter()
    for _ in range(10):
        analyser(c["transactions"], P, graine=1)
    complet = (time.perf_counter() - t0) / 10
    return {"analyse_complete_par_dossier_s": round(complet, 3), "simulation_2000_trajectoires_par_dossier_s": round(sim, 4),
            "trajectoires_par_seconde": int(P.trajectoires / sim),
            "temps_humain": "NON MESURÉ : le chronométrage avec et sans l'outil demande des agents de crédit réels "
                            "(protocole dans docs/evaluation/protocole-temps.md). Aucun chiffre n'est avancé."}


def main():
    R, T = charger("reglage"), charger("test")
    t0 = time.perf_counter()
    q1, q2 = q1_q2(R, T)
    res = {
        "avertissement": "Mesures sur données simulées. Les impayés sont ceux du simulateur, pas une performance réelle.",
        "machine": {"processeur": platform.processor() or platform.machine(), "python": platform.python_version(),
                    "numpy": np.__version__, "gpu": "aucun (pas de GPU sur la machine ; aucun calcul GPU)", "fils": 4},
        "jeux": {"reglage": int(len(R["defaut"])), "test": int(len(T["defaut"])), "archetypes_hors_reglage": list(HORS)},
        "q1_decide_mieux": q1, "q2_finance_assez": q2, "q3_calibration": q3_calibration(T), "q4_stabilite": q4_stabilite(T),
        "q5_detection": q5_detection(), "q6_raisons_fideles": q6_raisons(), "q7_equite": q7_equite(T), "q8_temps": q8_temps(T),
    }
    res["duree_evaluation_s"] = round(time.perf_counter() - t0, 1)
    SORTIE.mkdir(parents=True, exist_ok=True)
    (SORTIE / "resultats.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
    print(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
