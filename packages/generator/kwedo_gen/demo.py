"""Jeu de démo figé : personnes et institutions fictives, graines fixées.

Usage : python3 -m kwedo_gen.demo <sortie.json>
"""

import hashlib
import json
import sys

from .core import REGLAGE, TEST, generer_commercant

INSTITUTIONS = [
    {"id": "inst-lagune", "nom": "Caisse Lagune Microfinance (fictive)",
     "parametres": {"m": 0.30, "s": 0.40, "n": 26, "i": 0.0035, "percentile": 20, "seuil_risque": 0.10}},
    {"id": "inst-baobab", "nom": "Banque Baobab Commerce (fictive)",
     "parametres": {"m": 0.25, "s": 0.35, "n": 20, "i": 0.0030, "percentile": 15, "seuil_risque": 0.07}},
    {"id": "inst-solidaire", "nom": "Mutuelle Solidaire des Marchés (fictive)",
     "parametres": {"m": 0.30, "s": 0.45, "n": 30, "i": 0.0040, "percentile": 25, "seuil_risque": 0.12}},
]

# (id, nom fictif, téléphone fictif, archétype, graine, manipulation, compte séparé, semaines, générateur)
PERSONNES = [
    ("com-afiavi", "Afiavi Houngbo", "+229 01 90 00 00 01", "tissus", 20261, None, True, 52, REGLAGE),
    ("com-sena", "Séna Kpadonou", "+229 01 90 00 00 02", "telephonie", 20262, "circulaire", True, 52, REGLAGE),
    ("com-rachidi", "Rachidi Akanni", "+229 01 90 00 00 03", "alimentation", 20263, None, True, 52, REGLAGE),
    ("com-edwige", "Edwige Tossou", "+229 01 90 00 00 04", "restauration", 20264, None, False, 52, REGLAGE),
    ("com-koffi", "Koffi Adjovi", "+229 01 90 00 00 05", "cosmetique", 20265, "pic_avant_demande", True, 52, REGLAGE),
    ("com-nafissatou", "Nafissatou Bello", "+229 01 90 00 00 06", "artisanat", 20266, None, True, 10, TEST),
    ("com-gildas", "Gildas Ahouansou", "+229 01 90 00 00 07", "quincaillerie", 20267, None, True, 52, TEST),
    # Profils à risque (graines choisies parmi des tirages du générateur ; risque calculé par le moteur, rien d'imposé) :
    # ventes en baisse et irrégulières ; dépendance à un seul client avec compte non séparé.
    ("com-hounkpe", "Hounkpè Dossou", "+229 01 90 00 00 08", "tissus", 60025, None, True, 52, TEST),
    ("com-yaba", "Yaba Agossou", "+229 01 90 00 00 09", "cosmetique", 50007, "concentration", False, 52, TEST),
]


def construire() -> dict:
    commercants = []
    for cid, nom, tel, arch, graine, manip, sep, sem, cfg in PERSONNES:
        c = generer_commercant(cid, graine, cfg, semaines=sem, archetype=arch, manipulation=manip, compte_separe=sep)
        c.update({"nom": nom, "telephone": tel, "identite_verifiee": True})
        commercants.append(c)
    return {"avertissement": "Données 100 % synthétiques. Personnes et institutions fictives.",
            "institutions": INSTITUTIONS, "commercants": commercants}


def empreinte(d: dict) -> str:
    return hashlib.sha256(json.dumps(d, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


if __name__ == "__main__":
    d = construire()
    with open(sys.argv[1], "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    print(empreinte(d))
