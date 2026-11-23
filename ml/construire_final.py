"""Construit les jeux finaux d'un run : nice -n 10 .venv/bin/python ml/construire_final.py <run>"""

import json
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RACINE / "ml"))

from dataset import construire  # noqa: E402

if __name__ == "__main__":
    cfg = json.loads((RACINE / "docs/evaluation/graines-finales.json").read_text())["runs"][sys.argv[1]]
    for g in cfg["graines"]:
        construire(f"final:{g}", cfg["commercants_par_graine"])
        print("final", g, flush=True)
