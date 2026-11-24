"""Jeux du run final toutes fréquences + jeu du run 1 (non-régression) :
nice -n 10 .venv/bin/python ml/construire_final_frequences.py"""

import json
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RACINE / "ml"))

from dataset import construire  # noqa: E402

if __name__ == "__main__":
    ev = RACINE / "docs/evaluation"
    graines = json.loads((ev / "graines-frequences.json").read_text())["graines"]
    graines += json.loads((ev / "graines-finales.json").read_text())["runs"]["1"]["graines"]
    for g in graines:
        if not (RACINE / f"data/generated/final_{g}.npz").exists():
            construire(f"final:{g}", 400)
        print("final", g, flush=True)
