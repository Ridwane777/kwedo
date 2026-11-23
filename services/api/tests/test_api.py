import sqlite3
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from kwedo_api.app import fabriquer
from kwedo_api.service import ErreurMetier, Service


class TestParcours(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.s = Service(str(Path(cls.tmp.name) / "t.sqlite"))
        cls.s.reinitialiser()

    def test_1_parcours_complet(self):
        s = self.s
        est = s.estimation("com-afiavi")
        self.assertGreater(est["plafond"], 0)
        self.assertNotIn("alertes", est)  # le commerçant n'est jamais accusé
        with self.assertRaises(ErreurMetier) as e:
            s.envoyer_dossier("com-afiavi", "inst-baobab")
        self.assertEqual(e.exception.statut, 403)
        for inst in ("inst-lagune", "inst-baobab"):
            s.consentir("com-afiavi", inst, "accorde")
            d = s.envoyer_dossier("com-afiavi", inst)
        did = s.file("inst-lagune")[0]["id"]
        did = [r for r in s.file("inst-lagune") if r["commercant_id"] == "com-afiavi"][0]["id"]
        fiche = s.dossier(did)
        self.assertEqual(fiche["statut"], "en_analyse")
        with self.assertRaises(ErreurMetier):
            s.decider(did, "ajuste", "agent.test", "court", 100_000)
        with self.assertRaises(ErreurMetier):
            s.decider(did, "ajuste", "agent.test", "montant au-dessus de la formule", 10**9)
        montant = fiche["analyse"]["plafond"] - 100_000
        s.decider(did, "ajuste", "agent.test", "Saison creuse en janvier, prudence sur le montant.", montant)
        cr = s.repondre_offre(did, "accepte")
        self.assertEqual(cr["montant"], montant)
        self.assertEqual(len(cr["echeances"]), fiche["analyse"]["duree_semaines"])
        e1 = cr["echeances"][0]["montant_attendu"]
        r = s.payer(cr["id"], e1)
        self.assertEqual(r["credit"]["echeances"][0]["statut"], "payee")
        av = s.avancer(15)  # échéance 2 dépassée sans paiement → retard + relances
        c = s.credit(cr["id"])
        self.assertEqual(c["echeances"][1]["statut"], "en_retard")
        self.assertTrue(av["relances"])
        for rel in c["relances"]:
            self.assertNotIn("famille", rel["message"].lower())
        self.assertLessEqual(max(sum(1 for x in c["relances"] if x["echeance_id"] == e["id"]) for e in c["echeances"]), 3)
        p = s.portefeuille("inst-lagune")
        self.assertEqual(len(p["credits"]), 1)
        self.assertTrue(s.rejouer(did)["identique"])

    def test_2_journal_ajout_seul(self):
        s = self.s
        did = s.file()[0]["id"]
        s.dossier(did)
        with self.assertRaises(sqlite3.DatabaseError):
            s.db.execute("DELETE FROM journal_acces")
        if s.q("SELECT id FROM decisions"):
            with self.assertRaises(sqlite3.DatabaseError):
                s.db.execute("UPDATE decisions SET motif = 'réécrit'")

    def test_3_alerte_dans_file(self):
        f = {r["commercant_id"]: r for r in self.s.file("inst-lagune")}
        self.assertIn("circulaire", f["com-sena"]["alertes"])
        self.assertEqual(f["com-rachidi"]["alertes"], [])

    def test_4_retrait_consentement(self):
        s = self.s
        s.consentir("com-afiavi", "inst-baobab", "retire")
        self.assertFalse(s.consentement_actif("com-afiavi", "inst-baobab"))
        ligne = [r for r in s.file("inst-baobab") if r["commercant_id"] == "com-afiavi"][0]
        self.assertFalse(ligne["consentement_actif"])  # l'agent voit que l'accord est retiré
        with self.assertRaises(ErreurMetier) as e:
            s.envoyer_dossier("com-afiavi", "inst-baobab")
        self.assertEqual(e.exception.statut, 403)

    def test_5_http(self):
        c = TestClient(fabriquer(self.s))
        r = c.get("/commercants/com-afiavi/estimation?choc_ventes=-0.3")
        self.assertEqual(r.status_code, 200)
        self.assertIn("plafond", r.json())
        self.assertIn("Server-Timing", r.headers)
        r = c.post("/dossiers", content=b'{"commercant_id":"com-gildas","institution_id":"inst-solidaire"}',
                   headers={"Content-Type": "application/json"})
        self.assertEqual(r.status_code, 403)
        self.assertIn("erreur", r.json())

    def test_6_contrat_codes(self):
        c = TestClient(fabriquer(self.s))
        self.assertEqual(c.get("/inconnue").status_code, 404)
        self.assertEqual(c.get("/inconnue").json(), {"erreur": "route inconnue"})
        self.assertEqual(c.get("/echeances/abc/interventions").status_code, 404)
        self.assertEqual(c.post("/demo/avancer", content=b"{pas du json").status_code, 422)
        self.assertEqual(c.get("/sante").json()["donnees"], "simulees")
        self.s.consentir("com-rachidi", "inst-lagune", "accorde")
        r = c.post("/dossiers", json={"commercant_id": "com-rachidi", "institution_id": "inst-lagune"})
        self.assertEqual(r.status_code, 201)


if __name__ == "__main__":
    unittest.main()
