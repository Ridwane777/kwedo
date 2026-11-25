"""Régénère data/demo/demo.json (profil « réalisme » pour les demandes de démo) et affiche son empreinte.

Usage : .venv/bin/python scripts/regenerer_demo.py
"""

import json
import sys
from pathlib import Path

R = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(R / "packages/generator"))
from kwedo_gen.demo import construire, empreinte  # noqa: E402

d = construire()
(R / "data/demo/demo.json").write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(empreinte(d))
for c in d["commercants"]:
    print(c["id"], c["type_activite"], c["demande_demo"])
