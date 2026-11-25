"""Raisons, alertes et indicateurs du moteur pour un profil généré (vérification de fidélité).

Usage : .venv/bin/python scripts/raisons_profil.py <archetype> <manipulation|none> <separe 0|1> <semaines> <reglage|test> <graine> <montant>
"""

import sys
from pathlib import Path

R = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(R / "packages/engine"), str(R / "packages/generator")]
from kwedo_engine import analyser  # noqa: E402
from kwedo_gen.core import CONFIGS, generer_commercant  # noqa: E402
from kwedo_gen.demo import INSTITUTIONS  # noqa: E402

arch, manip, sep, sem, cfg, g, montant = sys.argv[1:8]
c = generer_commercant("x", int(g), CONFIGS[cfg], semaines=int(sem), archetype=arch,
                       manipulation=None if manip == "none" else manip, compte_separe=sep == "1")
for inst in INSTITUTIONS[:2]:
    r = analyser(c["transactions"], {**inst["parametres"], "frequence": "hebdomadaire"}, graine=int(g), montant_souhaite=int(montant))
    i = r["indicateurs"]
    print(inst["id"], "plafond", r["plafond"], "risque demande", r["souhait"]["risque"], "médiane", i["encaissement_median"],
          f"tend {i['tendance_hebdo']:+.2%} cv {i['regularite_cv']:.2f} gros {i['part_plus_gros_payeur']:.0%} pro {i['part_flux_pro']:.0%}")
    for x in r["raisons"]:
        print("  raison:", x["code"], x["effet"], x["texte"])
    for x in r["alertes"]:
        print("  alerte:", x["texte"])
    print("  conseils:", r["conseils"])
serie = r["serie_hebdo"]
print("8 dernières sem. / 8 précédentes :", round(sum(serie[-8:]) / max(sum(serie[-16:-8]), 1) - 1, 3))
