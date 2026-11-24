import hashlib
import json
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "generator"))

from kwedo_engine import Parametres, analyser, l_max  # noqa: E402
from kwedo_engine.moteur import simuler_seuils  # noqa: E402
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


def _graine(cid, inst):  # même graine que l'API (service._g)
    return int(hashlib.sha256(f"{cid}:{inst}".encode()).hexdigest()[:8], 16)


class TestFrequences(unittest.TestCase):
    """ADR 0015 : fréquence et durée au choix. L'hebdomadaire doit rester exactement identique."""

    @classmethod
    def setUpClass(cls):
        demo = json.loads((Path(__file__).resolve().parents[3] / "data/demo/demo.json").read_text())
        cls.koffi = next(c for c in demo["commercants"] if c["id"] == "com-koffi")["transactions"]
        cls.lagune = next(i for i in demo["institutions"] if i["id"] == "inst-lagune")["parametres"]
        cls.g = _graine("com-koffi", "inst-lagune")
        cls.hebdo = analyser(cls.koffi, cls.lagune, graine=cls.g, montant_souhaite=600_000)

    def _f(self, frequence, mois, **kw):
        return analyser(self.koffi, {**self.lagune, "frequence": frequence, "duree_mois": mois}, graine=self.g, **kw)

    def test_non_regression_koffi(self):
        self.assertEqual(self.hebdo["plafond"], 495_000)
        self.assertEqual(self.hebdo["risque"], 0.0846)
        self.assertEqual(self.hebdo["echeance_hebdo"], 19_951)
        self.assertEqual(self.hebdo["duree_semaines"], 26)
        self.assertTrue(self.hebdo["risque_valide"])
        self.assertEqual(self.hebdo["parametres"]["frequence"], "hebdomadaire")

    def test_hebdo_explicite_identique(self):
        r = self._f("hebdomadaire", 6, montant_souhaite=600_000)
        self.assertEqual({k: v for k, v in r.items() if k not in ("parametres", "duree_mois")},
                         {k: v for k, v in self.hebdo.items() if k not in ("parametres", "duree_mois")})

    def test_nombre_echeances(self):
        for f, mois, nb in [("hebdomadaire", 3, 13), ("hebdomadaire", 12, 52), ("quinzaine", 3, 7), ("quinzaine", 6, 13), ("quinzaine", 12, 26),
                            ("mensuelle", 3, 3), ("mensuelle", 12, 12)]:
            p = Parametres.depuis({**self.lagune, "frequence": f, "duree_mois": mois})
            self.assertEqual(p.nb, nb, (f, mois))
            self.assertLessEqual(p.horizon, round(mois * 52 / 12) + 1)

    def test_bornes(self):
        with self.assertRaises(ValueError):
            Parametres.depuis({"frequence": "annuelle"})
        with self.assertRaises(ValueError):
            Parametres.depuis({"frequence": "mensuelle", "duree_mois": 13})

    def test_quinzaine_et_mensuel_coherents(self):
        for f, w in [("quinzaine", 2), ("mensuelle", 52 / 12)]:
            for mois in (3, 6, 12):
                r = self._f(f, mois)
                self.assertGreater(r["plafond"], 0)
                self.assertLessEqual(r["plafond"], r["l_max"], (f, mois))  # jamais au-dessus de L_max
                self.assertFalse(r["risque_valide"])
                self.assertEqual(r["frequence"], f)
                p = Parametres.depuis(r["parametres"])
                self.assertAlmostEqual(r["l_max"], l_max(r["encaissement_prudent"], p), delta=1)
                # Échéance × nombre = montant + coût total (arrondis près)
                self.assertAlmostEqual(r["echeance"] * r["nb_echeances"], r["plafond"] + r["cout_total"], delta=r["nb_echeances"])
                self.assertAlmostEqual(r["echeance_hebdo"], r["echeance"] / w, delta=1)
                self.assertTrue(all(x["texte"] for x in r["raisons"]))
        # Sur 6 mois, montants du même ordre que l'hebdomadaire (même capacité, contrôle moins fréquent)
        for f in ("quinzaine", "mensuelle"):
            self.assertLess(abs(self._f(f, 6, avec_raisons=False)["plafond"] / self.hebdo["plafond"] - 1), 0.35)

    def test_duree_fait_monter_le_plafond(self):
        plafonds = [self._f("mensuelle", m, avec_raisons=False)["plafond"] for m in (3, 6, 9, 12)]
        self.assertEqual(plafonds, sorted(plafonds))

    def test_deterministe_par_graine(self):
        for f in ("quinzaine", "mensuelle"):
            self.assertEqual(self._f(f, 6), self._f(f, 6))
        a = analyser(self.koffi, {**self.lagune, "frequence": "mensuelle", "duree_mois": 6}, graine=1, avec_modeles=False)
        b = analyser(self.koffi, {**self.lagune, "frequence": "mensuelle", "duree_mois": 6}, graine=2, avec_modeles=False)
        self.assertEqual(a, analyser(self.koffi, {**self.lagune, "frequence": "mensuelle", "duree_mois": 6}, graine=1, avec_modeles=False))
        self.assertNotEqual(a["l_simulation"], b["l_simulation"])

    def test_mensuel_jamais_au_dessus_de_lmax(self):
        for g in range(60, 70):
            c = generer_commercant("m", g)
            for f in ("quinzaine", "mensuelle"):
                r = analyser(c["transactions"], {**P, "frequence": f, "duree_mois": 12}, graine=g, avec_raisons=False)
                self.assertLessEqual(r["plafond"], r["l_max"])

    def test_controle_a_chaque_echeance(self):
        """Mensuel : un trou d'une semaine est absorbé par le cumul du mois ; l'hebdomadaire le voit."""
        p = Parametres.depuis({**P, "frequence": "mensuelle", "duree_mois": 3, "p_semaine_vide": 0.0, "p_choc_durable": 0.0})
        self.assertEqual(list(p.rangs_semaine), [4, 8, 12])
        h = np.array([100.0, 0.0, 100.0, 100.0] * 8)
        s_mois = simuler_seuils(h, p, 3)
        s_sem = simuler_seuils(h, Parametres.depuis({**P, "p_semaine_vide": 0.0, "p_choc_durable": 0.0}), 3)
        self.assertGreater(s_mois.min() / (52 / 12), s_sem.min())

    def test_souhait_mensuel(self):
        r = self._f("mensuelle", 6, montant_souhaite=2_000_000)
        self.assertFalse(r["souhait"]["atteignable"])
        self.assertIn("par mois", r["souhait"]["manque"][0])


if __name__ == "__main__":
    unittest.main()
