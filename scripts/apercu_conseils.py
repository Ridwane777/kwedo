"""Aperçu des conseils chiffrés pour les commerçants de la démo (diagnostic local)."""
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "services/api"))
from kwedo_api.service import Service  # noqa: E402

s = Service(tempfile.mktemp())
s.reinitialiser()
for c in [r["id"] for r in s.q("SELECT id FROM commercants")]:
    t = time.time()
    a = s.conseils(c)
    print(c, f"{time.time() - t:.2f}s", a["plafond_actuel"], a["gain_possible"], a["meilleur_levier"])
    for l in a["leviers"] + a["deja_bien"]:
        print("   ", l["code"], l["bon"], l["effet"], "|", l["constat"])
