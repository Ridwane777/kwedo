import unittest

import numpy as np

from kwedo_gen import generer_commercant, nb_echeances, rembourser, semaines_echeance


def _ancienne_etiquette(futur, e, n=26):
    """Étiquette hebdomadaire d'origine (ml/dataset.py avant ADR 0016)."""
    reserve, manquees = 0.0, 0
    for x in np.maximum(futur[:n], 0):
        reserve += x
        if reserve >= e:
            reserve -= e
        else:
            manquees += 1
    return manquees > 0, manquees / n


class TestRemboursement(unittest.TestCase):
    def test_hebdo_identique_a_l_etiquette_d_origine(self):
        for g in range(20):
            f = generer_commercant("x", g)["futur_hebdo"]
            for e in (500, 5_000, 20_000, 60_000):
                d, part = rembourser(f, [e], "hebdomadaire", 26)
                self.assertEqual((bool(d[0]), float(part[0])), _ancienne_etiquette(f, e))

    def test_echeancier_tient_dans_l_avenir_cache(self):
        for f in ("hebdomadaire", "quinzaine", "mensuelle"):
            for mois in (3, 6, 9, 12):
                self.assertLess(semaines_echeance(f, nb_echeances(f, mois))[-1], 52)

    def test_mensuel_absorbe_une_semaine_vide(self):
        futur = [100, 0, 100, 100, 100] * 11
        self.assertTrue(rembourser(futur, [60], "hebdomadaire", 13)[0][0])
        self.assertFalse(rembourser(futur, [60 * 52 / 12], "mensuelle", 3)[0][0])

    def test_monotone_en_montant(self):
        f = generer_commercant("x", 3)["futur_hebdo"]
        d, part = rembourser(f, np.linspace(100, 200_000, 50), "quinzaine", 13)
        self.assertTrue(np.all(np.diff(d.astype(int)) >= 0))
        self.assertTrue(np.all(np.diff(part) >= -1e-12))


if __name__ == "__main__":
    unittest.main()
