"""Crédit progressif : cherche, pour l'historique de démo, des fenêtres où le simulateur de remboursement
(`rembourser`, encaissements cachés `futur_hebdo`) manque au moins une échéance d'un crédit hebdomadaire de 3 mois.
Le résultat n'est pas forcé : on lit seulement où le simulateur place un retard.

Usage : .venv/bin/python scripts/chercher_retard.py
"""

import json
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(RACINE / "packages/generator"), str(RACINE / "packages/engine")]

from kwedo_engine import Parametres, echeance  # noqa: E402
from kwedo_gen.remboursement import rembourser  # noqa: E402

d = json.loads((RACINE / "data/demo/demo.json").read_text())
lagune = next(i for i in d["institutions"] if i["id"] == "inst-lagune")["parametres"]
p = Parametres.depuis({**lagune, "frequence": "hebdomadaire", "duree_mois": 3})
for montant in (150_000, 225_000):
    e = round(echeance(montant, p))
    for c in d["commercants"]:
        f = c["futur_hebdo"]
        fen = [w for w in range(0, 52 - p.nb) if rembourser(f[w:], e, "hebdomadaire", p.nb)[0][0]]
        print(montant, e, c["id"], "fenêtres avec échéance manquée :", fen)
