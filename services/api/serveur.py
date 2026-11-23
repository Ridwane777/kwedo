"""Lanceur : python3 services/api/serveur.py [--db chemin] [--port 3460]"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from kwedo_api.app import main  # noqa: E402

main()
