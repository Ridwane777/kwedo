"""C3 : d'où vient la sous-estimation du risque simulé ? Diagnostic sur le générateur de RÉGLAGE (partition v).

On corrige une hypothèse de la simulation à la fois et on mesure l'écart annoncé/observé. Les variantes « marge réelle »
lisent la marge cachée de l'archétype : elles servent seulement à attribuer la cause, jamais au moteur.

Usage : nice -n 10 .venv/bin/python ml/diagnostic_calibration.py → ml/artifacts/diagnostic-calibration.json
"""

import json
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(RACINE / "packages/engine"), str(RACINE / "packages/generator"), str(RACINE / "ml")]

import numpy as np  # noqa: E402

from dataset import P, defaut_vectoriel  # noqa: E402
from kwedo_engine.moteur import echeance  # noqa: E402
from kwedo_gen.archetypes import ARCHETYPES  # noqa: E402

MULT = (0.5, 0.75, 1.0, 1.25, 1.5, 2.0)


def seuils(h, g, facteur, perso=0.0, tendance=False):
    rng = np.random.default_rng(int(g))
    N, n, b = P.trajectoires, P.n, P.bloc
    debuts = rng.integers(0, len(h) - b + 1, size=(N, -(-n // b)))
    traj = h[(debuts[:, :, None] + np.arange(b)).reshape(N, -1)[:, :n]]
    dur = rng.random(N) < P.p_choc_durable
    masque = dur[:, None] & (np.arange(n)[None, :] >= rng.integers(0, n, N)[:, None])
    traj = np.where(masque, traj * rng.uniform(0.5, 0.8, N)[:, None], traj)
    traj = np.where(rng.random((N, n)) < P.p_semaine_vide, 0.0, traj)
    dispo = traj * facteur
    if perso:
        chocs = rng.random((N, n)) < perso
        dispo = dispo - chocs * dispo * rng.uniform(0.5, 1.5, (N, n))
    return (np.cumsum(dispo, 1) / np.arange(1, n + 1)).min(1)


def main():
    V = dict(np.load(RACINE / "data/generated/reglage_v.npz"))
    variantes = {
        "moteur_v1 (m·min(1,2s) = 0,24 ; sans dépenses perso)": lambda h, g, a: seuils(h, g, P.m * min(1, 2 * P.s)),
        "+ dépenses personnelles (4 %/sem.)": lambda h, g, a: seuils(h, g, P.m * min(1, 2 * P.s), 0.04),
        "+ marge réelle de l'activité (diagnostic)": lambda h, g, a: seuils(h, g, ARCHETYPES[a].marge),
        "+ les deux (diagnostic)": lambda h, g, a: seuils(h, g, ARCHETYPES[a].marge, 0.04),
    }
    out = {"jeu": "reglage_v", "points_par_dossier": len(MULT)}
    for nom, f in variantes.items():
        pred, obs = [], []
        for h, fu, g, a, p20 in zip(V["hebdo"][:600], V["futur"][:600], V["graine"][:600], V["archetype"][:600], V["p20"][:600]):
            if h.max() <= 0:
                continue
            s0 = seuils(h, g, P.m * min(1, 2 * P.s))
            base = np.quantile(s0, P.seuil_risque, method="lower")  # échéance du plafond v1 (avant formule)
            e = base * np.array(MULT)
            s = f(h, g, a)
            pred += [float(np.mean(s < x)) for x in e]
            obs += list(defaut_vectoriel(fu, e)[0])
        pred, obs = np.array(pred), np.array(obs, float)
        bins = np.minimum((pred * 10).astype(int), 9)
        out[nom] = {"risque_annonce_moyen": round(float(pred.mean()), 4), "frequence_observee": round(float(obs.mean()), 4),
                    "ece_10": round(float(sum(abs(pred[bins == k].mean() - obs[bins == k].mean()) * (bins == k).mean()
                                              for k in range(10) if (bins == k).any())), 4)}
        print(nom, out[nom], flush=True)
    # Contribution des autres écarts : chocs futurs indépendants du passé, tendance, perte de client.
    (RACINE / "ml/artifacts/diagnostic-calibration.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
