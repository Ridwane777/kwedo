"""Générateur de commerçants simulés.

Deux paramétrages distincts (cahier, « Étiquettes de remboursement ») :
- ``reglage`` : sert à régler le moteur et entraîner les modèles ;
- ``test`` : bruit, chocs et archétypes différents, pour évaluer sur des profils jamais vus.

Chaque commerçant produit :
- ``transactions`` : flux visibles du moteur (compte marchand, mobile money uniquement) ;
- ``futur_hebdo`` : processus caché, encaissements disponibles des 52 semaines suivantes
  (chocs futurs et dépenses personnelles imprévues comprises) ; sert d'étiquette de remboursement ;
- ``manipulation`` : type injecté ou ``None`` (vérité terrain pour l'évaluation de la détection).
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

import numpy as np

from .archetypes import ARCHETYPES, ARCHETYPES_HORS_REGLAGE, ARCHETYPES_REGLAGE

DEBUT = np.datetime64("2025-11-24")  # un lundi
MANIPULATIONS = ("circulaire", "pic_avant_demande", "concentration", "rafale_ronds")


@dataclass(frozen=True)
class Config:
    nom: str
    archetypes: tuple
    bruit: str                 # "lognormal" | "gamma"
    p_choc_durable: float      # probabilité d'une baisse durable dans l'historique
    p_semaine_vide: float
    p_perte_client: float
    p_depense_perso: float     # par semaine, dans le futur caché
    derive_tendance: float     # écart-type de la tendance annuelle
    p_manipulation: float


REGLAGE = Config("reglage", ARCHETYPES_REGLAGE, "lognormal", 0.15, 0.02, 0.08, 0.04, 0.15, 0.15)
TEST = Config("test", tuple(ARCHETYPES), "gamma", 0.22, 0.035, 0.12, 0.06, 0.22, 0.15)
CONFIGS = {"reglage": REGLAGE, "test": TEST}


def _bruit(rng, cfg, sigma, size):
    if cfg.bruit == "lognormal":
        return rng.lognormal(-sigma**2 / 2, sigma, size)
    k = 1.0 / max(sigma**2, 1e-3)  # gamma de moyenne 1, même variance relative
    return rng.gamma(k, 1.0 / k, size)


def _anonymise(graine: int, idx) -> np.ndarray:
    return np.array([hashlib.sha1(f"{graine}:{i}".encode()).hexdigest()[:10] for i in idx])


def _ventes_journalieres(rng, cfg, a, jours: int, depart_tendance: float, avec_chocs=True):
    t = np.arange(jours)
    dates = DEBUT + t
    mois = (dates.astype("datetime64[M]").astype(int) % 12)
    jsem = (t % 7)
    niveau = a.ventes_jour * rng.lognormal(0, 0.35)
    tendance = np.exp(depart_tendance * t / 365)
    saison = np.asarray(a.saison_mois)[mois]
    marche = np.where(t % 4 == rng.integers(4), a.pic_jour_marche, 1.0)  # jour de marché tous les 4 jours
    p_actif = min(a.jours_actifs / 7, 0.99)
    actif = rng.random(jours) < p_actif
    actif[jsem == 6] &= rng.random((jsem == 6).sum()) < 0.4  # dimanche souvent calme
    v = niveau * tendance * saison * marche * _bruit(rng, cfg, a.dispersion, jours) * actif
    if avec_chocs:
        if rng.random() < cfg.p_choc_durable:          # mauvaise saison, perte de clientèle durable
            d0 = rng.integers(jours // 4, jours)
            v[d0:] *= rng.uniform(0.5, 0.8)
        semaines = jours // 7
        for s in np.nonzero(rng.random(semaines) < cfg.p_semaine_vide)[0]:  # maladie, rupture de stock
            v[s * 7:(s + 1) * 7] = 0
    return v


def generer_commercant(cid: str, graine: int, cfg: Config = REGLAGE, semaines: int = 52,
                       archetype: str | None = None, manipulation: str | None = "auto",
                       compte_separe: bool | None = None) -> dict:
    """Génère un commerçant. Déterministe pour une graine donnée."""
    rng = np.random.default_rng(graine)
    code = archetype or cfg.archetypes[rng.integers(len(cfg.archetypes))]
    a = ARCHETYPES[code]
    jours = semaines * 7
    tendance = rng.normal(0.0, cfg.derive_tendance)
    part_mm = rng.uniform(*a.part_mm)
    if compte_separe is None:
        compte_separe = bool(rng.random() < 0.75)
    if manipulation == "auto":
        manipulation = MANIPULATIONS[rng.integers(len(MANIPULATIONS))] if rng.random() < cfg.p_manipulation else None

    ventes = _ventes_journalieres(rng, cfg, a, jours, tendance)
    encaisse_mm = ventes * part_mm

    # Clientèle : popularité de type Zipf ; un gros client peut partir (perte d'un gros client).
    n_cli = max(10, int(a.clients * rng.uniform(0.6, 1.4)))
    poids = 1.0 / np.arange(1, n_cli + 1) ** rng.uniform(0.8, 1.2)
    poids /= poids.sum()

    lignes = []  # (jour, seconde, montant, sens, payeur, nature)
    for d in np.nonzero(encaisse_mm > 0)[0]:
        total = encaisse_mm[d]
        k = max(1, int(rng.poisson(total / a.ticket)))
        montants = rng.dirichlet(np.ones(k)) * total
        payeurs = rng.choice(n_cli, size=k, p=poids)
        secondes = rng.integers(7 * 3600, 20 * 3600, size=k)
        for m, p, s in zip(montants, payeurs, secondes):
            if m >= 100:
                lignes.append((d, s, int(round(m, -1)), "entree", int(p), "paiement_client"))
    # Ventes à crédit : encaissement différé de 7 à 30 jours.
    for d in np.nonzero(rng.random(jours) < a.credit_ventes)[0]:
        dd = d + rng.integers(7, 31)
        if dd < jours:
            lignes.append((dd, rng.integers(8 * 3600, 19 * 3600), int(round(a.ticket * rng.uniform(1, 4), -2)),
                           "entree", int(rng.integers(n_cli)), "paiement_client"))
    # Sorties : réapprovisionnement, retraits.
    for w in range(semaines):
        sortie = encaisse_mm[w * 7:(w + 1) * 7].sum() * rng.uniform(0.5, 0.9)
        if sortie > 0:
            lignes.append((w * 7 + int(rng.integers(7)), 10 * 3600, int(round(sortie, -2)), "sortie", -1, "retrait"))
    # Flux personnels mélangés si le compte n'est pas séparé.
    if not compte_separe:
        for d in np.nonzero(rng.random(jours) < 0.15)[0]:
            lignes.append((d, int(rng.integers(6 * 3600, 22 * 3600)), int(round(rng.uniform(2_000, 40_000), -2)),
                           "entree", 10_000 + int(rng.integers(8)), "transfert_personnel"))
    # Transferts vers soi-même (à exclure du CA vérifié).
    for d in np.nonzero(rng.random(jours) < 0.03)[0]:
        lignes.append((d, 12 * 3600, int(round(rng.uniform(10_000, 100_000), -3)), "entree", 99_999, "transfert_soi"))

    _injecter(rng, manipulation, lignes, jours, encaisse_mm, n_cli)

    lignes.sort(key=lambda x: (x[0], x[1]))
    if lignes:
        j = np.array([l[0] for l in lignes]); s = np.array([l[1] for l in lignes])
        horo = (DEBUT + j).astype("datetime64[s]") + s.astype("timedelta64[s]")
        contreparties = _anonymise(graine, [l[4] for l in lignes])
    else:
        horo, contreparties = np.array([], dtype="datetime64[s]"), np.array([])
    transactions = [
        {"id": f"{cid}-{k:05d}", "horodatage": str(h), "montant": l[2], "sens": l[3],
         "contrepartie": str(c), "nature": l[5]}
        for k, (l, h, c) in enumerate(zip(lignes, horo, contreparties))
    ]

    # Futur caché : encaissements disponibles sur 52 semaines (nouveaux chocs + dépenses personnelles).
    futur_j = _ventes_journalieres(rng, cfg, a, 52 * 7, tendance, avec_chocs=True) * part_mm
    if rng.random() < cfg.p_perte_client:
        futur_j[rng.integers(0, 52 * 7):] *= 1 - poids[:3].sum() * 0.6
    futur = futur_j.reshape(52, 7).sum(1) * a.marge  # ce qui reste après coûts, avant dépenses perso
    chocs_perso = rng.random(52) < cfg.p_depense_perso
    futur = futur - chocs_perso * futur * rng.uniform(0.5, 1.5, 52)
    if manipulation in ("pic_avant_demande", "circulaire", "rafale_ronds"):
        futur *= 0.85  # un dossier gonflé cache une activité plus faible

    return {
        "id": cid,
        "graine": int(graine),
        "generateur": cfg.nom,
        "type_activite": code,
        "compte_separe": compte_separe,
        "compte_marchand_ouvert_le": str(DEBUT),
        "part_mm": round(float(part_mm), 3),
        "manipulation": manipulation,
        "transactions": transactions,
        "futur_hebdo": [int(x) for x in np.round(futur)],
        "marge_reelle": a.marge,
    }


def _injecter(rng, kind, lignes, jours, encaisse_mm, n_cli):
    if kind is None:
        return
    med = float(np.median(encaisse_mm[encaisse_mm > 0])) if (encaisse_mm > 0).any() else 20_000
    if kind == "circulaire":
        # Des complices paient le commerçant puis reçoivent un montant proche dans les jours suivants.
        for _ in range(int(rng.integers(6, 14))):
            d = int(rng.integers(jours - 70, jours - 3)); comp = 20_000 + int(rng.integers(3))
            m = int(round(med * rng.uniform(1.5, 4), -3))
            lignes.append((d, int(rng.integers(9, 18)) * 3600, m, "entree", comp, "paiement_client"))
            lignes.append((min(jours - 1, d + int(rng.integers(1, 6))), 15 * 3600,
                           int(round(m * rng.uniform(0.93, 1.0), -2)), "sortie", comp, "transfert_personnel"))
    elif kind == "pic_avant_demande":
        for d in range(jours - 14, jours):
            for _ in range(int(rng.integers(3, 8))):
                lignes.append((d, int(rng.integers(8, 20)) * 3600, int(round(med * rng.uniform(0.4, 1.2), -2)),
                               "entree", 30_000 + int(rng.integers(40)), "paiement_client"))
    elif kind == "concentration":
        for d in range(jours - 120, jours, 2):
            lignes.append((d, 11 * 3600, int(round(med * rng.uniform(1.5, 3), -3)), "entree", 0, "paiement_client"))
    elif kind == "rafale_ronds":
        for d in range(jours - 28, jours):
            for _ in range(int(rng.integers(2, 5))):
                lignes.append((d, int(rng.choice([1, 2, 3, 23])) * 3600, int(rng.choice([10_000, 20_000, 50_000])),
                               "entree", 40_000 + int(rng.integers(60)), "paiement_client"))


def generer_population(n: int, cfg: Config = REGLAGE, graine: int = 0, **kw) -> list[dict]:
    base = np.random.SeedSequence(graine).generate_state(n)
    return [generer_commercant(f"{cfg.nom[:3]}-{k:05d}", int(base[k]), cfg, **kw) for k in range(n)]


__all__ = ["Config", "REGLAGE", "TEST", "CONFIGS", "MANIPULATIONS", "ARCHETYPES_HORS_REGLAGE",
           "generer_commercant", "generer_population"]
