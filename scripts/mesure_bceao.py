"""Mesure à définition égale BCEAO : taux brut de dégradation d'un portefeuille simulé à une date d'arrêté.

Usage : nice -n 10 .venv/bin/python scripts/mesure_bceao.py
Sortie : docs/evaluation/bceao/resultats.json (voir docs/evaluation/bceao/README.md). Ne règle rien.

Définition retenue (Référentiel comptable spécifique des SFD de l'UMOA, classe 29) : dès qu'une échéance est
impayée, **tout l'encours** du prêt est déclassé ; déclassement obligatoire au-delà de 3 mois d'impayé (approché par
> 90 jours), facultatif de 0 à 3 mois ; passage en perte au plus tard à 24 mois. Taux = encours des créances en
souffrance / encours brut des crédits (avant provisions). Bornes rapportées : > 0 jour (déclassement facultatif
pratiqué partout) et > 30 jours.

Portefeuille à l'état stationnaire : production constante chaque semaine ; à l'arrêté, un prêt de chaque âge
a = 0, 1, … semaines (jusqu'à la fin du prêt + 104 semaines pour les prêts en impayé, passage en perte à 24 mois).
Chaque commerçant contribue donc à tous les âges, ce qui supprime le bruit de tirage des dates.
"""

import json
import sys
from multiprocessing import Pool
from pathlib import Path

import numpy as np

R = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(R / "packages/engine"), str(R / "packages/generator"), str(R / "scripts")]
from kwedo_engine.moteur import PLAFOND_MIN, Parametres, analyser  # noqa: E402
from kwedo_gen.core import TEST, generer_population  # noqa: E402
from kwedo_gen import realisme  # noqa: E402
from portefeuille_bceao import etats, horizon_semaines, verifier  # noqa: E402

COMBOS = [(f, d) for f in ("hebdomadaire", "mensuelle") for d in (6, 12)]
SEUILS = {"gt0": 0, "gt30": 30, "gt90": 90}
PERTE_SEMAINES = 104
I_HEBDO = Parametres().i
CFG = json.loads((R / "docs/evaluation/bceao/graines.json").read_text())


def _un(args):
    pop, c = args
    out = {"pop": pop, "graine": c["graine"], "futur": c["futur_hebdo"], "combos": {}}
    for f, d in COMBOS:
        r = analyser(c["transactions"], {"frequence": f, "duree_mois": d}, graine=c["graine"], avec_raisons=False)
        dem = realisme.demande_demo(c["graine"], c["type_activite"], (f,), 12)["montant"]
        out["combos"][f"{f}-{d}"] = {"plafond": r["plafond"], "demande": dem,
                                     "median": r["indicateurs"]["encaissement_median"]}
    return out


def mesurer(futurs, montants, f, d, rattrapage=False):
    """Par prêt : encours total sur tous les âges, et encours en souffrance par seuil (sommes sur les âges)."""
    ages = np.arange(horizon_semaines(f, d) + PERTE_SEMAINES)
    tot = np.zeros(len(montants)); souf = {k: np.zeros(len(montants)) for k in SEUILS}
    for j, (fu, m) in enumerate(zip(futurs, montants)):
        if m <= 0:
            continue
        enc, ret, _, _ = etats(fu, m, f, d, I_HEBDO, ages, rattrapage)
        garde = (ret < 0) | (ret <= 7 * PERTE_SEMAINES)  # passage en perte à 24 mois d'impayé
        enc = enc * garde
        tot[j] = enc.sum()
        for k, s in SEUILS.items():
            souf[k][j] = enc[ret > s].sum()
    return tot, souf


def taux_ic(tot, souf, rng, B):
    idx = rng.integers(0, len(tot), size=(B, len(tot)))
    out = {}
    for k, s in souf.items():
        t = s.sum() / tot.sum()
        bs = s[idx].sum(1) / tot[idx].sum(1)
        out[k] = [round(float(t), 5), round(float(np.quantile(bs, .025)), 5), round(float(np.quantile(bs, .975)), 5)]
    return out


def main():
    n = CFG["commercants_par_graine"]
    taches = []
    for g in CFG["graines_test"]:
        taches += [("test", c) for c in generer_population(n, TEST, graine=g)]
    for g in CFG["graines_realisme"]:
        taches += [("realisme", c) for c in realisme.generer_population(n, graine=g)]
    with Pool(4) as pool:
        res = pool.map(_un, taches, chunksize=8)
    del taches
    rng = np.random.default_rng(CFG["graine_bootstrap"])
    B = CFG["tirages_bootstrap"]
    lignes = []
    for pop in ("test", "realisme"):
        R_ = [r for r in res if r["pop"] == pop]
        futurs = [r["futur"] for r in R_]
        for f, d in COMBOS:
            cc = [r["combos"][f"{f}-{d}"] for r in R_]
            plaf = np.array([c["plafond"] for c in cc], float)
            accorde = plaf >= PLAFOND_MIN
            moteur = np.where(accorde, np.minimum([c["demande"] for c in cc], plaf), 0)
            med = np.array([c["median"] for c in cc], float) * accorde
            k = moteur.sum() / med.sum()
            portef = {"moteur": moteur, "mediane_k": med * k, "plafond": np.where(accorde, plaf, 0)}
            for nom, m in portef.items():
                for j in range(min(30, len(m))):  # contrôle de la couche contre le simulateur
                    if m[j] > 0:
                        verifier(futurs[j], m[j], f, d, I_HEBDO)
                tot, souf = mesurer(futurs, m, f, d)
                tot_r, souf_r = mesurer(futurs, m, f, d, rattrapage=True)
                lignes.append({"population": pop, "portefeuille": nom, "frequence": f, "duree_mois": d,
                               "emprunteurs": int((m > 0).sum()), "refus": int((~accorde).sum()),
                               "montant_moyen": round(float(m[m > 0].mean())),
                               "k_mediane": round(float(k), 3) if nom == "mediane_k" else None,
                               "taux": taux_ic(tot, souf, rng, B),
                               "taux_rattrapage": taux_ic(tot_r, souf_r, rng, B)})
                print(pop, nom, f, d, lignes[-1]["taux"]["gt90"], lignes[-1]["taux"]["gt0"], flush=True)
    sortie = {"definition": "encours des prêts ayant une échéance impayée depuis plus de s jours / encours brut ; "
              "gt90 = définition retenue (déclassement obligatoire > 3 mois)", "graines": CFG,
              "repere_bceao_benin_2024": 0.094, "lignes": lignes}
    (R / "docs/evaluation/bceao/resultats.json").write_text(json.dumps(sortie, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
