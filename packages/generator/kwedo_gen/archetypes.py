"""Archétypes de commerçants simulés.

Ordres de grandeur : ~5 000 FCFA par opération (moyenne nationale mobile money citée dans le cahier,
« à recontrôler »), ajustés par archétype. Valeurs inventées pour la simulation, pas des statistiques.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Archetype:
    code: str
    libelle: str
    ventes_jour: float          # niveau médian de ventes quotidiennes (FCFA, toutes méthodes de paiement)
    dispersion: float           # sigma log-normal journalier
    jours_actifs: float         # jours d'activité moyens par semaine
    ticket: float               # montant moyen d'un paiement client
    part_mm: tuple = (0.4, 0.8) # part des ventes encaissée par mobile money (min, max)
    marge: float = 0.25         # marge réelle après coûts (sert aux étiquettes, invisible du moteur)
    saison_mois: tuple = field(default_factory=lambda: (1.0,) * 12)
    pic_jour_marche: float = 1.3
    credit_ventes: float = 0.05 # part des ventes à crédit, encaissement différé
    clients: int = 120          # taille de la clientèle


ARCHETYPES = {
    a.code: a
    for a in [
        Archetype("alimentation", "Alimentation", 60_000, 0.30, 6.5, 2_500, (0.35, 0.7), 0.15,
                  (1.0, 0.95, 1.0, 1.05, 1.0, 1.0, 1.0, 1.05, 1.0, 1.0, 1.05, 1.25)),
        Archetype("tissus", "Tissus", 85_000, 0.55, 6.0, 9_000, (0.45, 0.85), 0.30,
                  (0.9, 0.85, 0.95, 1.2, 1.0, 0.9, 0.9, 1.0, 0.95, 1.0, 1.1, 1.45), 1.5, 0.12, 90),
        Archetype("restauration", "Restauration", 45_000, 0.25, 6.8, 1_500, (0.3, 0.65), 0.28,
                  clients=200),
        Archetype("telephonie", "Téléphonie et accessoires", 70_000, 0.45, 6.0, 7_000, (0.5, 0.9), 0.20,
                  (1.0, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0, 1.1, 1.15, 1.0, 1.0, 1.3), 1.2, 0.08, 100),
        Archetype("artisanat", "Artisanat", 40_000, 0.75, 5.0, 12_000, (0.4, 0.8), 0.40,
                  pic_jour_marche=1.6, credit_ventes=0.20, clients=50),
        Archetype("cosmetique", "Cosmétique", 50_000, 0.40, 6.0, 4_500, (0.45, 0.85), 0.30,
                  (1.0, 1.1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.05, 1.35), clients=110),
        Archetype("quincaillerie", "Quincaillerie", 75_000, 0.60, 5.5, 15_000, (0.4, 0.8), 0.22,
                  (1.0, 1.0, 1.1, 1.1, 1.1, 0.85, 0.8, 0.85, 0.95, 1.1, 1.1, 1.05), 1.2, 0.18, 60),
    ]
}

# Archétypes réservés au générateur de test : jamais vus pendant le réglage.
ARCHETYPES_HORS_REGLAGE = ("artisanat", "quincaillerie")
ARCHETYPES_REGLAGE = tuple(c for c in ARCHETYPES if c not in ARCHETYPES_HORS_REGLAGE)
