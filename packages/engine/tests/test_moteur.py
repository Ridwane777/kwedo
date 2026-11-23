import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "generator"))

from kwedo_engine import Parametres, analyser, l_max  # noqa: E402
from kwedo_gen import generer_commercant  # noqa: E402

P = {"m": 0.30, "s": 0.40, "n": 26, "i": 0.0035, "percentile": 20, "seuil_risque": 0.10}


class TestMoteur(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.honnete = generer_commercant("h", 11, archetype="tissus", manipulation=None, compte_separe=True)
        cls.res = analyser(cls.honnete["transactions"], P, graine=1)

    def test_formule(self):
        p = Parametres.depuis(P)
        r = 10_000 * 0.3 * 0.4
        attendu = r * (1 - 1.0035 ** -26) / 0.0035
        self.assertAlmostEqual(l_max(10_000, p), attendu, places=6)

    def test_plafond_sous_lmax(self):
        self.assertLessEqual(self.res["plafond"], self.res["l_max"])
        self.assertLessEqual(self.res["risque"], P["seuil_risque"])
        self.assertGreater(self.res["plafond"], 0)

    def test_deterministe(self):
        self.assertEqual(analyser(self.honnete["transactions"], P, graine=1), self.res)

    def test_choc_baisse_plafond_et_monte_risque(self):
        montant = self.res["plafond"] * 2
        ref = analyser(self.honnete["transactions"], P, graine=1, montant_souhaite=montant)
        bas = analyser(self.honnete["transactions"], P, graine=1, choc_ventes=-0.3, montant_souhaite=montant)
        self.assertLess(bas["plafond"], self.res["plafond"])
        self.assertGreater(bas["souhait"]["risque"], ref["souhait"]["risque"])

    def test_choc_monotone(self):
        plafonds = [analyser(self.honnete["transactions"], P, graine=1, choc_ventes=-c / 100)["plafond"] for c in range(0, 61, 10)]
        self.assertEqual(plafonds, sorted(plafonds, reverse=True))

    def test_modele_ne_depasse_jamais_la_formule(self):
        for g in range(50, 60):
            c = generer_commercant("f", g)
            r = analyser(c["transactions"], P, graine=g)
            self.assertLessEqual(r["plafond"], r["l_max"])

    def test_raisons_et_conseils(self):
        self.assertEqual(len(self.res["raisons"]), 3)
        self.assertTrue(all(r["texte"] for r in self.res["raisons"]))
        self.assertTrue(self.res["conseils"])

    def test_alerte_circulaire_et_ca_verifie(self):
        c = generer_commercant("c", 12, archetype="tissus", manipulation="circulaire")
        r = analyser(c["transactions"], P, graine=1)
        self.assertIn("circulaire", [a["code"] for a in r["alertes"]])
        self.assertGreater(r["indicateurs"]["exclu_circulaires"], 0)
        self.assertEqual(r["recommandation"], "examen_renforce")

    def test_alerte_pic(self):
        c = generer_commercant("p", 13, archetype="alimentation", manipulation="pic_avant_demande")
        self.assertIn("pic_avant_demande", [a["code"] for a in analyser(c["transactions"], P)["alertes"]])

    def test_honnete_sans_alerte(self):
        self.assertEqual(self.res["alertes"], [])

    def test_historique_court_provisoire(self):
        c = generer_commercant("court", 14, semaines=8, manipulation=None)
        r = analyser(c["transactions"], P)
        self.assertTrue(r["provisoire"])
        self.assertNotEqual(r["recommandation"], "accord")

    def test_vide(self):
        r = analyser([], P)
        self.assertEqual(r["plafond"], 0)
        self.assertEqual(r["recommandation"], "refus_motive")

    def test_raison_tendance_coherente(self):
        for g in range(20, 40):
            c = generer_commercant("t", g, manipulation=None)
            r = analyser(c["transactions"], P, graine=1, avec_modeles=False)
            for x in r["raisons"]:
                if x["code"] == "tendance" and x["effet"] != 0:
                    baisse = r["indicateurs"]["tendance_hebdo"] < 0
                    self.assertEqual(baisse, "baisse" in x["texte"], (g, r["indicateurs"]["tendance_hebdo"], x))

    def test_souhait(self):
        r = analyser(self.honnete["transactions"], P, graine=1, montant_souhaite=self.res["plafond"] * 3)
        self.assertFalse(r["souhait"]["atteignable"])
        self.assertTrue(r["souhait"]["manque"])


if __name__ == "__main__":
    unittest.main()
