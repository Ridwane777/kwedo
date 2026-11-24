"""Mesure des dossiers de démo : plafond, risque de la demande (moteur) et indicateurs, par institution.

Usage : .venv/bin/python scripts/mesure_demo.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "services/api"))
from kwedo_api.service import Service  # noqa: E402

s = Service(":memory:")
s.reinitialiser()
print("| Institution | Commerçant | Plafond prudent | Demandé | Risque demande | Tolérance | CV | Tendance/sem | Plus gros payeur | Part pro | Semaines |")
print("|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|")
for inst in ("inst-lagune", "inst-baobab"):
    for r in s.file(inst, tri="risque"):
        d = s.dossier(r["id"], acteur=None)
        a, dem = d["analyse"], d["demande"]
        i = a["indicateurs"]
        print(f"| {inst[5:]} | {r['commercant_id'][4:]} | {a['plafond']:,} | {d['montant_demande']:,} | {dem['risque']:.1%} | {dem['seuil_risque']:.0%} "
              f"| {i['regularite_cv']:.2f} | {i['tendance_hebdo']:+.1%} | {i['part_plus_gros_payeur']:.0%} | {i['part_flux_pro']:.0%} | {i['semaines']} |")
        if "-v" in sys.argv:
            for x in dem["raisons"]:
                print("    -", x["texte"])
