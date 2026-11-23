#!/bin/sh
# Construit les jeux de réglage (3 partitions) et le jeu de test de développement. Voir ml/dataset.py.
set -e
cd "$(dirname "$0")/.."
PY=.venv/bin/python
nice -n 10 $PY ml/dataset.py reglage_a 3000
nice -n 10 $PY ml/dataset.py reglage_b 1500
nice -n 10 $PY ml/dataset.py reglage_v 1500
nice -n 10 $PY ml/dataset.py test 400
