import unittest

from kwedo_gen import REGLAGE, TEST, ARCHETYPES_HORS_REGLAGE, generer_commercant, generer_population
from kwedo_gen.demo import construire, empreinte


class TestGenerateur(unittest.TestCase):
    def test_deterministe(self):
        a = generer_commercant("x", 42)
        b = generer_commercant("x", 42)
        self.assertEqual(a, b)

    def test_graines_differentes(self):
        self.assertNotEqual(generer_commercant("x", 1)["futur_hebdo"], generer_commercant("x", 2)["futur_hebdo"])

    def test_reglage_sans_archetypes_reserves(self):
        pop = generer_population(60, REGLAGE, graine=3)
        self.assertFalse({c["type_activite"] for c in pop} & set(ARCHETYPES_HORS_REGLAGE))

    def test_generateurs_distincts(self):
        self.assertNotEqual(REGLAGE, TEST)
        self.assertNotEqual(REGLAGE.bruit, TEST.bruit)

    def test_manipulation_injectee(self):
        c = generer_commercant("x", 7, manipulation="circulaire")
        self.assertEqual(c["manipulation"], "circulaire")
        self.assertTrue(any(t["sens"] == "sortie" and t["nature"] == "transfert_personnel" for t in c["transactions"]))

    def test_schema_transactions(self):
        t = generer_commercant("x", 5)["transactions"][0]
        self.assertEqual(set(t), {"id", "horodatage", "montant", "sens", "contrepartie", "nature"})
        self.assertGreater(t["montant"], 0)

    def test_demo_fige(self):
        self.assertEqual(empreinte(construire()), empreinte(construire()))


if __name__ == "__main__":
    unittest.main()
