"""Contrôle de niveau des données de démo face au repère BCEAO (dégradation du portefeuille des SFD du Bénin, 9,4 %
au 31/12/2024). Ne règle rien : mesure et affiche l'écart (docs/data/README.md, « Contrôle de niveau »).

Usage : .venv/bin/python scripts/controle_niveau.py [n_population]

1. Dossiers de démo (API en mémoire) : part des demandes au-dessus de la tolérance de l'institution et risque moyen
   de défaut simulé calculé par le moteur.
2. Population « réalisme » (archétypes aux parts Kiva Bénin, demandes tirées des agrégats Kiva) : défaut simulé
   observé avec le simulateur de remboursement (au moins une échéance manquée), demande Kiva telle quelle, mensuelle,
   taux de l'institution Lagune appliqué à plat sur la durée.
"""

import sys
from pathlib import Path

import numpy as np

R = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(R / "services/api"), str(R / "packages/generator")]
from kwedo_api.service import Service  # noqa: E402
from kwedo_gen.realisme import demande_demo, generer_population  # noqa: E402
from kwedo_gen.remboursement import nb_echeances, rembourser  # noqa: E402

BCEAO_BENIN = 0.094

s = Service(":memory:")
s.reinitialiser()
risques, dessus = [], 0
for inst in ("inst-lagune", "inst-baobab", "inst-solidaire"):
    for r in s.file(inst, tri="risque"):
        risques.append(r["risque_demande"])
        dessus += not r["dans_tolerance"]
n = len(risques)
print(f"Dossiers de démo : {n} ; au-dessus de la tolérance : {dessus} ({dessus / n:.1%}) ; "
      f"risque moyen (moteur) : {np.mean(risques):.1%} ; médian : {np.median(risques):.1%}")

N = int(sys.argv[1]) if len(sys.argv) > 1 else 300
i_hebdo = 0.0035  # taux hebdomadaire de l'institution fictive Lagune
defauts, parts = [], []
for c in generer_population(N, graine=2026):
    d = demande_demo(c["graine"], c["type_activite"], ("mensuelle",), 12)
    nb = nb_echeances("mensuelle", d["duree_mois"])
    total = d["montant"] * (1 + i_hebdo * d["duree_mois"] * 52 / 12)
    defaut, part = rembourser(c["futur_hebdo"], total / nb, "mensuelle", nb)
    defauts.append(bool(defaut[0])); parts.append(float(part[0]))
print(f"Population « réalisme » : {N} commerçants ; défaut simulé (≥ 1 échéance manquée) : {np.mean(defauts):.1%} ; "
      f"part moyenne d'échéances manquées : {np.mean(parts):.1%}")
print(f"Repère BCEAO Bénin (dégradation brute du portefeuille des SFD, 31/12/2024) : {BCEAO_BENIN:.1%}")
