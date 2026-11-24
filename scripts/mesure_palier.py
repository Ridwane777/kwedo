"""Crédit progressif : paliers des commerçants de démo après réinitialisation (historique généré par le simulateur).

Usage : .venv/bin/python scripts/mesure_palier.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "services/api"))

from kwedo_api.service import Service  # noqa: E402

s = Service(":memory:")
s.reinitialiser()
print(f"Horloge : {s.maintenant()}")
print("| Commerçant | Palier | Cycle | Montant du palier | Plafond prudent | Accordable | Limite | Crédits chez Lagune |")
print("|---|---:|---:|---:|---:|---:|---|---|")
for cid in ("com-afiavi", "com-gildas", "com-edwige", "com-hounkpe", "com-yaba"):
    p = s.estimation(cid)["palier"]
    hist = ", ".join(f"{h['montant']:,} {h['etat']} (retard max {h['retard_max_jours']} j)".replace(",", " ") for h in p["historique"]) or "aucun"
    print(f"| {cid} | {p['niveau']} | {p['cycle']} | {p['montant_palier']:,} | {p['plafond_moteur']:,} | {p['montant_accordable']:,} | "
          f"{p['limite_par']} | {hist} |".replace(",", " "))
print()
for r in s.file("inst-lagune"):
    print(r["commercant_id"], r["montant_demande"], r["statut"])
