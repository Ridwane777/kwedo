"""Recherche de graines du générateur existant donnant des profils à risque lisibles (le moteur calcule le risque).

Usage : .venv/bin/python scripts/chercher_profils.py <archetype> <manipulation|none> <separe 0|1> <semaines> <reglage|test> <graine_debut> <nb>
Affiche pour chaque graine : plafond, risque à un montant de référence (2 semaines de ventes médianes),
tendance, régularité, plus gros payeur, part pro.
"""

import sys
from pathlib import Path

R = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(R / "packages/engine"), str(R / "packages/generator")]
from kwedo_engine import analyser  # noqa: E402
from kwedo_gen.core import CONFIGS, generer_commercant  # noqa: E402
from kwedo_gen.demo import INSTITUTIONS  # noqa: E402

arch, manip, sep, sem, cfg, g0, nb = sys.argv[1:8]
manip = None if manip == "none" else manip
p = {**INSTITUTIONS[0]["parametres"], "frequence": "hebdomadaire"}
for g in range(int(g0), int(g0) + int(nb)):
    c = generer_commercant("x", g, CONFIGS[cfg], semaines=int(sem), archetype=arch, manipulation=manip, compte_separe=sep == "1")
    ref = analyser(c["transactions"], p, graine=g, avec_raisons=False)
    i = ref["indicateurs"]
    montant = max(50_000, round(i["encaissement_median"] * 2 / 5000) * 5000)
    r = analyser(c["transactions"], p, graine=g, montant_souhaite=montant, avec_raisons=False)
    print(g, "plafond", r["plafond"], f"ratio {r['plafond'] / max(i['encaissement_median'], 1):.2f}", "demande", montant, f"risque {r['souhait']['risque']:.1%}", f"tend {i['tendance_hebdo']:+.1%}",
          f"cv {i['regularite_cv']:.2f}", f"gros {i['part_plus_gros_payeur']:.0%}", f"pro {i['part_flux_pro']:.0%}", "sem", i["semaines"], flush=True)
