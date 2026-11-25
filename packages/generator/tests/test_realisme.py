import unittest

from kwedo_gen.core import REGLAGE, TEST, generer_commercant
from kwedo_gen.realisme import REALISME, USD_FCFA, demande_demo, kiva_benin, poids_archetypes


class TestRealisme(unittest.TestCase):
    def test_reglage_et_test_intacts(self):
        self.assertEqual((REGLAGE.nom, TEST.nom), ("reglage", "test"))
        self.assertEqual(REALISME.bruit, REGLAGE.bruit)
        a = generer_commercant("x", 11, REGLAGE, archetype="tissus")
        b = generer_commercant("x", 11, REALISME, archetype="tissus")
        self.assertEqual(a["transactions"], b["transactions"])  # même dynamique, seule la population change

    def test_parts_kiva(self):
        w = poids_archetypes()
        self.assertAlmostEqual(sum(w.values()), 1.0)
        commerce = w["telephonie"] + w["cosmetique"] + w["quincaillerie"] + w["tissus"]
        self.assertAlmostEqual(commerce, 0.52, delta=0.04)
        self.assertAlmostEqual(w["alimentation"] + w["restauration"], 0.36, delta=0.04)

    def test_demande_dans_les_quantiles(self):
        q = kiva_benin()["montant_usd_par_secteur"]["Retail"]
        for g in range(50):
            d = demande_demo(g, "cosmetique")
            self.assertGreaterEqual(d["montant"], round(q["p10"] * USD_FCFA, -4) - 5_000)
            self.assertLessEqual(d["montant"], q["p90"] * USD_FCFA + 5_000)
            self.assertLessEqual(d["duree_mois"], 12)
            self.assertIn(d["frequence"], ("hebdomadaire", "mensuelle"))
        self.assertEqual(demande_demo(3, "tissus"), demande_demo(3, "tissus"))


if __name__ == "__main__":
    unittest.main()
