"""Profil « réalisme » : calage des données de **démo seulement** sur des agrégats publics.

Ne sert ni au réglage ni à l'évaluation : les générateurs ``reglage`` et ``test`` (``core.REGLAGE``, ``core.TEST``)
restent inchangés et les runs publiés reproductibles. Aucun modèle n'est entraîné ni évalué sur ces sources : aucune
ne contient de remboursements de commerçants reliés à leurs ventes (voir ``docs/data/README.md``).

Sources :
- Kiva (données issues de Kiva), agrégats Bénin de ``docs/data/kiva-agregats.json`` : parts de secteurs, fréquences
  et durées de remboursement, quantiles de montant en USD par secteur. Pas de défaut dans ces données.
- PaySim (Lopez-Rojas, Elmir, Axelsson, EMSS 2016) : ordres de grandeur publiés seulement. Non appliqué aux flux
  des commerçants (voir ``PAYSIM`` ci-dessous et ``docs/data/README.md``).
"""

from __future__ import annotations

import json
from dataclasses import replace
from pathlib import Path

import numpy as np

from .core import REGLAGE, generer_commercant

KIVA = Path(__file__).resolve().parents[3] / "docs/data/kiva-agregats.json"

# Taux de conversion documenté et daté : les montants Kiva du miroir sont des prêts 2006-2018 en USD courants.
# On prend la moyenne annuelle 2018 de l'euro (BCE : 1 EUR = 1,181 USD) et la parité fixe 1 EUR = 655,957 FCFA,
# soit 1 USD ≈ 555 FCFA. Pas de correction d'inflation (ordre de grandeur, pas une statistique de prix).
USD_FCFA = 555.0
TAUX_SOURCE = "1 USD ≈ 555 FCFA (moyenne BCE 2018 : 1 EUR = 1,181 USD ; parité 1 EUR = 655,957 FCFA)"

# Secteur Kiva correspondant à chaque archétype du générateur.
SECTEUR_KIVA = {
    "tissus": "Clothing", "telephonie": "Retail", "cosmetique": "Retail", "quincaillerie": "Retail",
    "alimentation": "Food", "restauration": "Food", "artisanat": "Services",
}

# Ordres de grandeur publiés de PaySim (article EMSS 2016 et page du jeu) : un mois simulé (744 pas d'une heure),
# ~6,36 millions de transactions, ~0,13 % marquées frauduleuses ; types CASH_IN, CASH_OUT, DEBIT, PAYMENT, TRANSFER.
# Non utilisé pour régler les flux : PaySim décrit des comptes de particuliers (environ une opération émise par
# compte sur le mois), dans une devise et un pays non nommés ; pas des encaissements de commerçants.
PAYSIM = {"transactions": 6_362_620, "pas_heures": 744, "part_fraude": 0.0013}


def kiva_benin() -> dict:
    return json.loads(KIVA.read_text(encoding="utf-8"))["zones"]["benin"]


def poids_archetypes() -> dict[str, float]:
    """Parts d'archétypes alignées sur les secteurs Kiva Bénin (secteur partagé à parts égales entre ses archétypes ;
    secteurs sans archétype, environ 4 % des prêts, laissés de côté puis renormalisation)."""
    parts = kiva_benin()["part_secteur"]
    par_secteur: dict[str, list[str]] = {}
    for a, s in SECTEUR_KIVA.items():
        par_secteur.setdefault(s, []).append(a)
    w = {a: parts[s] / len(arch) for s, arch in par_secteur.items() for a in arch}
    tot = sum(w.values())
    return {a: v / tot for a, v in w.items()}


# Dynamique des ventes identique au réglage ; seule la population (parts d'archétypes) diffère.
REALISME = replace(REGLAGE, nom="realisme", archetypes=tuple(poids_archetypes()))


def _quantile(q: dict, u: float) -> float:
    """Interpolation linéaire entre les quantiles publiés (p10…p90), bornée à [p10, p90] (queues inconnues)."""
    xs = [0.10, 0.25, 0.50, 0.75, 0.90]
    ys = [q["p10"], q["p25"], q["mediane"], q["p75"], q["p90"]]
    return float(np.interp(u, xs, ys))


def demande_demo(graine: int, archetype: str, frequences: tuple = ("hebdomadaire", "mensuelle"), duree_max: int = 12) -> dict:
    """Montant, fréquence et durée d'une demande de démo tirés des agrégats Kiva Bénin du secteur.

    Fréquence : « monthly » Kiva → mensuelle ; « irregular »/« bullet » → l'autre fréquence proposée par
    l'institution. Durée : tirée dans la distribution Kiva Bénin, bornée par la durée maximale de l'institution.
    Tirage séparé (graine + 1) : les transactions du commerçant ne changent pas."""
    k = kiva_benin()
    rng = np.random.default_rng(graine + 1)
    secteur = SECTEUR_KIVA[archetype]
    u = float(rng.uniform(0.10, 0.90))
    usd = _quantile(k["montant_usd_par_secteur"][secteur], u)
    montant = int(max(5_000, round(usd * USD_FCFA / 5_000) * 5_000))
    mensuel = rng.random() < k["part_frequence"]["monthly"]
    autre = [f for f in frequences if f != "mensuelle"]
    frequence = "mensuelle" if (mensuel or not autre) and "mensuelle" in frequences else (autre or list(frequences))[0]
    durees = k["part_duree_mois"]
    d = int(rng.choice([int(x) for x in durees], p=np.array(list(durees.values())) / sum(durees.values())))
    return {"montant": montant, "frequence": frequence, "duree_mois": min(d, duree_max), "duree_kiva_mois": d,
            "secteur_kiva": secteur, "quantile": round(u, 3), "montant_usd": round(usd, 1)}


def generer_population(n: int, graine: int = 0, **kw) -> list[dict]:
    """Population « réalisme » (démo, contrôles de niveau) : archétypes tirés selon les parts Kiva Bénin."""
    w = poids_archetypes()
    codes, p = list(w), np.array(list(w.values()))
    base = np.random.SeedSequence(graine).generate_state(n)
    out = []
    for k in range(n):
        a = codes[int(np.random.default_rng(int(base[k]) + 2).choice(len(codes), p=p))]
        out.append(generer_commercant(f"rea-{k:05d}", int(base[k]), REALISME, archetype=a, **kw))
    return out
