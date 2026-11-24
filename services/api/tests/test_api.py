import json
import sqlite3
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

from fastapi.testclient import TestClient

from kwedo_api import auth
from kwedo_api.app import fabriquer
from kwedo_api.service import ErreurMetier, Service


def client(service, *profils, commercant=None):
    c = TestClient(fabriquer(service))
    for p in profils:
        u = {**auth.PROFILS[p], "profil": p}
        c.cookies.set(auth.COOKIES[auth.espace(u)], auth.signer(u))
    if commercant:
        u = {"role": "commercant", "nom": commercant, "login": commercant, "commercant_id": commercant, "institution_id": None}
        c.cookies.set(auth.COOKIES["com"], auth.signer(u))
    return c


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
        c = client(self.s, "commercant")
        r = c.get("/commercants/com-afiavi/estimation?choc_ventes=-0.3")
        self.assertEqual(r.status_code, 200)
        self.assertIn("plafond", r.json())
        self.assertIn("Server-Timing", r.headers)
        c = client(self.s, commercant="com-gildas")
        r = c.post("/dossiers", content=b'{"commercant_id":"com-gildas","institution_id":"inst-solidaire"}',
                   headers={"Content-Type": "application/json"})
        self.assertEqual(r.status_code, 403)
        self.assertIn("erreur", r.json())

    def test_6_contrat_codes(self):
        c = client(self.s, "admin", commercant="com-rachidi")
        self.assertEqual(c.get("/inconnue").status_code, 404)
        self.assertEqual(c.get("/inconnue").json(), {"erreur": "route inconnue"})
        self.assertEqual(c.get("/echeances/abc/interventions").status_code, 404)
        self.assertEqual(c.post("/demo/avancer", content=b"{pas du json").status_code, 422)
        self.assertEqual(c.get("/sante").json()["donnees"], "simulees")
        self.s.consentir("com-rachidi", "inst-lagune", "accorde")
        r = c.post("/dossiers", json={"commercant_id": "com-rachidi", "institution_id": "inst-lagune"})
        self.assertEqual(r.status_code, 201)


class TestCloisonnement(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.s = Service(str(Path(cls.tmp.name) / "c.sqlite"))
        cls.s.reinitialiser()
        cls.did = cls.s.file("inst-lagune")[0]["id"]

    def test_sans_session_tout_est_refuse(self):
        c = TestClient(fabriquer(self.s))
        for chemin in ("/dossiers", f"/dossiers/{self.did}", "/portefeuille", "/journal", "/admin/apercu",
                       "/institutions/inst-lagune/parametres", "/commercants/com-afiavi"):
            self.assertEqual(c.get(chemin).status_code, 401, chemin)
        self.assertEqual(c.post("/demo/reinitialiser", json={}).status_code, 401)

    def test_jeton_falsifie_et_entete_ignores(self):
        c = TestClient(fabriquer(self.s))
        c.cookies.set(auth.COOKIES["pro"], auth.signer(auth.PROFILS["agent-baobab"])[:-2] + "xx")
        self.assertEqual(c.get("/dossiers", headers={"X-Acteur": "admin.kwedo"}).status_code, 401)

    def test_institution_ne_voit_pas_l_autre(self):
        c = client(self.s, "responsable-baobab")
        self.assertEqual(c.get("/institutions/inst-lagune/parametres").status_code, 403)
        self.assertEqual(c.post("/institutions/inst-lagune/parametres", json={"m": 0.1}).status_code, 403)
        self.assertEqual(c.get(f"/dossiers/{self.did}").status_code, 404)
        self.assertEqual(c.post(f"/dossiers/{self.did}/decisions", json={"type": "refuse", "motif": "tentative hors périmètre"}).status_code, 404)
        self.assertTrue(all(d["institution_id"] == "inst-baobab" for d in c.get("/dossiers?institution_id=inst-lagune").json()))
        self.assertTrue(all(e["institution_id"] == "inst-baobab" for e in c.get("/journal").json()))
        self.assertNotIn("parametres", c.get("/institutions").json()[0])

    def test_seul_le_responsable_modifie(self):
        self.assertEqual(client(self.s, "agent-lagune").post("/institutions/inst-lagune/parametres", json={"m": 0.29}).status_code, 403)
        self.assertEqual(client(self.s, "responsable-lagune").post("/institutions/inst-lagune/parametres", json={"m": 0.3}).status_code, 200)

    def test_admin_supervise_sans_detail(self):
        c = client(self.s, "admin")
        a = c.get("/admin/apercu")
        self.assertEqual(a.status_code, 200)
        self.assertNotIn("seuil=", a.text)
        self.assertNotIn("Afiavi", a.text)
        for chemin in (f"/dossiers/{self.did}", "/dossiers", "/portefeuille", "/institutions/inst-lagune/parametres"):
            self.assertEqual(c.get(chemin).status_code, 403, chemin)
        self.assertEqual(c.post("/institutions/inst-lagune/parametres", json={"m": 0.1}).status_code, 403)
        self.assertTrue(all(e["dossier_id"] is None for e in c.get("/journal").json()))

    def test_commercant_isole_et_sans_reglages(self):
        c = client(self.s, "commercant")
        self.assertEqual(c.get("/commercants/com-sena").status_code, 403)
        e = c.get("/commercants/com-afiavi/estimation?institution_id=inst-baobab").json()
        self.assertEqual(set(e["parametres"]), {"n", "i", "frequence", "duree_mois"})  # modalités : ADR 0015
        for interne in ("l_max", "echeance_supportable", "alertes", "modeles"):
            self.assertNotIn(interne, e)
        self.assertEqual(c.post("/commercants", json={"nom": "Afiavi Houngbo", "telephone": self.s.commercant("com-afiavi")["telephone"]}).status_code, 409)

    def test_commercant_ne_recoit_ni_risque_ni_seuil(self):
        """Audit : R, la recommandation (dérivée du seuil) et les textes moteur citant R, le seuil ou s ne sortent pas."""
        c = client(self.s, "commercant")
        for url in ("/commercants/com-afiavi/estimation?montant_souhaite=5000000&choc_ventes=-0.5",
                    "/commercants/com-afiavi/estimation?montant_souhaite=200000", "/commercants/com-afiavi"):
            r = c.get(url)
            self.assertEqual(r.status_code, 200, url)
            self.assertNotIn('"risque"', r.text, url)
            for interne in ("recommandation", "graine", "seuil_risque", "percentile", "limite de l'institution :", "prélèvement à"):
                self.assertNotIn(interne, r.text, url)
        s = c.get("/commercants/com-afiavi/estimation?montant_souhaite=5000000").json()["souhait"]
        self.assertTrue(s["au_dessus_du_seuil"])
        self.assertFalse(s["atteignable"])

    def test_conseils_chiffres_et_reserves_au_commercant(self):
        url = "/commercants/com-afiavi/conseils"
        self.assertEqual(TestClient(fabriquer(self.s)).get(url).status_code, 401)
        for profil in ("agent-lagune", "responsable-lagune", "admin"):
            self.assertIn(client(self.s, profil).get(url).status_code, (401, 403), profil)
        self.assertEqual(client(self.s, commercant="com-sena").get(url).status_code, 403)
        c = client(self.s, "commercant")
        r = c.get(url)
        self.assertEqual(r.status_code, 200)
        a = r.json()
        self.assertEqual(a["plafond_actuel"], c.get("/commercants/com-afiavi/estimation").json()["plafond"])
        self.assertEqual(a, c.get(url).json())  # même graine : même résultat
        tous = a["leviers"] + a["deja_bien"]
        self.assertTrue(tous)
        for l in tous:
            self.assertTrue(l["effet"] is None or l["effet"] >= 0, l["code"])  # chiffré et ≥ 0, ou signalé non chiffré
            self.assertTrue(l["actions"], l["code"])
        effets = [l["effet"] for l in a["leviers"] if l["effet"] is not None]
        self.assertEqual(effets, sorted(effets, reverse=True))
        if a["gain_possible"] is not None:
            self.assertEqual(a["gain_possible"], max(effets))
        self.assertIn("historique", [l["code"] for l in tous])
        self.assertNotIn('"risque"', r.text)
        for interne in ("graine", "seuil_risque", "percentile", "recommandation"):
            self.assertNotIn(interne, r.text)

    def test_raison_formule_reecrite(self):
        from kwedo_api.service import raisons_commercant
        r = raisons_commercant([{"code": "formule", "effet": 0, "texte": "… limite le prélèvement à 35 % de la marge …"}])
        self.assertNotIn("35", r[0]["texte"])

    def test_credits_echeances_et_offres_cloisonnes(self):
        s = self.s
        did = [r for r in s.file("inst-lagune") if r["commercant_id"] == "com-rachidi"][0]["id"]
        s.decider(did, "valide", "agent.lagune", "Dossier régulier, accord au plafond.")
        cr = s.repondre_offre(did, "accepte")
        eid = cr["echeances"][0]["id"]
        # Offre : vue commerçant sans réglages, et inaccessible à un autre commerçant.
        o = client(s, commercant="com-rachidi").get(f"/commercants/com-rachidi/dossiers/{did}")
        self.assertEqual(o.status_code, 200)
        self.assertNotIn("risque", o.text)
        self.assertNotIn("alertes", o.text)
        autre = client(s, "commercant")
        self.assertEqual(autre.get(f"/commercants/com-afiavi/dossiers/{did}").status_code, 404)
        self.assertEqual(autre.get(f"/credits/{cr['id']}").status_code, 404)
        self.assertEqual(autre.post(f"/credits/{cr['id']}/paiements", json={"montant": 1000}).status_code, 404)
        self.assertEqual(autre.post(f"/dossiers/{did}/offre", json={"reponse": "refuse"}).status_code, 404)
        # Autre institution et admin : ni lecture du crédit, ni intervention sur l'échéance.
        for p in ("agent-baobab", "responsable-baobab", "admin"):
            c = client(s, p)
            self.assertEqual(c.get(f"/credits/{cr['id']}").status_code, 404, p)
            self.assertIn(c.post(f"/echeances/{eid}/interventions", json={"motif": "tentative hors périmètre"}).status_code, (403, 404), p)
            self.assertNotIn(cr["id"], c.get("/portefeuille").text if p != "admin" else "")
        self.assertEqual(client(s, "agent-lagune").get(f"/credits/{cr['id']}").status_code, 200)
        # Le commerçant ne paie pas à la place du prêteur et ne décide pas.
        self.assertEqual(client(s, commercant="com-rachidi").post(f"/dossiers/{did}/decisions", json={}).status_code, 401)
        # Le responsable de Baobab ne voit pas les noms des commerçants de Lagune dans son journal.
        self.assertNotIn("com-rachidi", client(s, "responsable-baobab").get("/journal").text)

    def test_commandes_demo_reservees_a_l_admin(self):
        for p in ("agent-lagune", "responsable-lagune", "commercant"):
            c = client(self.s, p)
            for chemin in ("/demo/avancer", "/demo/reinitialiser", "/relances/executer"):
                self.assertIn(c.post(chemin, json={"jours": 1}).status_code, (401, 403), (p, chemin))


class TestEcheances(unittest.TestCase):
    """ADR 0015 : fréquence et durée au choix, modalités par institution, signature par code SMS."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.s = Service(str(Path(cls.tmp.name) / "e.sqlite"))
        cls.s.reinitialiser()

    def test_hebdomadaire_inchange(self):
        e = self.s.estimation("com-koffi", "inst-lagune")
        self.assertEqual((e["plafond"], e["frequence"], e["duree_semaines"], e["nb_echeances"]), (495_000, "hebdomadaire", 26, 26))
        self.assertTrue(e["estimation_eprouvee"])

    def test_modalites_de_l_institution(self):
        c = client(self.s, "commercant")
        base = "/commercants/com-afiavi/estimation"
        e = c.get(f"{base}?institution_id=inst-baobab").json()  # Baobab : mensuel seulement, 6 à 12 mois
        self.assertEqual(e["modalites"], {"frequences": ["mensuelle"], "duree_min_mois": 6, "duree_max_mois": 12, "delai_versement_h": 72})
        self.assertEqual((e["frequence"], e["nb_echeances"]), ("mensuelle", 6))
        self.assertFalse(e["estimation_eprouvee"])
        self.assertEqual(c.get(f"{base}?institution_id=inst-baobab&frequence=hebdomadaire").status_code, 422)
        self.assertEqual(c.get(f"{base}?institution_id=inst-baobab&frequence=mensuelle&duree_mois=4").status_code, 422)
        self.assertEqual(c.get(f"{base}?institution_id=inst-solidaire&frequence=quinzaine&duree_mois=9").status_code, 422)
        m = c.get(f"{base}?institution_id=inst-lagune&frequence=mensuelle&duree_mois=6").json()
        self.assertEqual((m["nb_echeances"], m["duree_mois"]), (6, 6))
        self.assertAlmostEqual(m["echeance"] * 6, m["plafond"] + m["cout_total"], delta=6)
        self.assertIn("par mois", " ".join(m["chaine_calcul"]))
        q = c.get(f"{base}?institution_id=inst-solidaire&frequence=quinzaine&duree_mois=3").json()
        self.assertEqual(q["nb_echeances"], 7)
        # Les modalités ne sortent pas vers l'admin général (ADR 0009).
        a = client(self.s, "admin")
        self.assertNotIn("frequences", a.get("/admin/apercu").text)
        self.assertNotIn("fréquences", a.get("/journal").text)
        self.assertNotIn("delai", a.get("/institutions").text)

    def test_code_sms_obligatoire_pour_l_accord(self):
        c = client(self.s, commercant="com-afiavi")
        url = "/commercants/com-afiavi/consentements"
        corps = {"institution_id": "inst-solidaire", "action": "accorde"}
        self.assertEqual(c.post(url, json=corps).status_code, 403)                       # sans code
        code = c.post("/commercants/com-afiavi/code-sms", json={"institution_id": "inst-solidaire"}).json()["code"]
        faux = f"{(int(code) + 1) % 10**6:06d}"
        self.assertEqual(c.post(url, json={**corps, "code": faux}).status_code, 403)     # mauvais code
        self.assertFalse(self.s.consentement_actif("com-afiavi", "inst-solidaire"))
        self.assertEqual(c.post(url, json={**corps, "code": code}).status_code, 200)
        self.assertTrue(self.s.consentement_actif("com-afiavi", "inst-solidaire"))
        self.assertEqual(c.post(url, json={**corps, "code": code}).status_code, 403)     # code à usage unique
        # Autre commerçant : pas de code pour le compte d'autrui.
        self.assertEqual(client(self.s, commercant="com-sena").post("/commercants/com-afiavi/code-sms",
                                                                     json={"institution_id": "inst-lagune"}).status_code, 403)
        j = self.s.journal(inst="inst-solidaire")  # tracé : essais refusés et validé
        self.assertEqual({e["detail"].split(" — ")[0] for e in j if e["type"] == "signature"}, {"code SMS refusé", "code SMS validé"})
        # Le retrait reste libre et immédiat.
        self.assertEqual(c.post(url, json={"institution_id": "inst-solidaire", "action": "retire"}).status_code, 200)

    def test_code_expire(self):
        s = self.s
        code = s.emettre_code("com-edwige", "inst-lagune")["code"]
        s.avancer(1)
        with self.assertRaises(ErreurMetier):
            s.verifier_code("com-edwige", "inst-lagune", code, "test")

    def test_mensuel_de_bout_en_bout(self):
        s, c = self.s, client(self.s, commercant="com-afiavi")
        code = c.post("/commercants/com-afiavi/code-sms", json={"institution_id": "inst-baobab"}).json()["code"]
        c.post("/commercants/com-afiavi/consentements", json={"institution_id": "inst-baobab", "action": "accorde", "code": code})
        r = c.post("/dossiers", json={"commercant_id": "com-afiavi", "institution_id": "inst-baobab", "frequence": "mensuelle", "duree_mois": 9})
        self.assertEqual(r.status_code, 201)
        self.assertEqual((r.json()["frequence"], r.json()["duree_mois"]), ("mensuelle", 9))
        did = r.json()["id"]
        agent = client(s, "agent-baobab")
        fiche = agent.get(f"/dossiers/{did}").json()
        self.assertEqual((fiche["frequence_demandee"], fiche["duree_mois_demandee"]), ("mensuelle", 9))
        self.assertFalse(fiche["analyse"]["risque_valide"])
        # Ajustement hors limites refusé, dans les limites accepté (12 mois).
        ko = agent.post(f"/dossiers/{did}/decisions", json={"type": "ajuste", "motif": "Durée allongée pour alléger.", "montant_decide": 100_000, "duree_mois": 24})
        self.assertEqual(ko.status_code, 422)
        ko = agent.post(f"/dossiers/{did}/decisions", json={"type": "ajuste", "motif": "Passage en hebdomadaire.", "montant_decide": 100_000, "frequence": "hebdomadaire"})
        self.assertEqual(ko.status_code, 422)
        ok = agent.post(f"/dossiers/{did}/decisions", json={"type": "ajuste", "motif": "Durée allongée pour alléger les mensualités.",
                                                             "montant_decide": fiche["analyse"]["plafond"], "duree_mois": 12})
        self.assertEqual(ok.status_code, 201, ok.text)
        o = c.get(f"/commercants/com-afiavi/dossiers/{did}").json()
        self.assertEqual((o["frequence"], o["duree_mois"], o["nb_echeances"], o["delai_versement_h"]), ("mensuelle", 12, 12, 72))
        self.assertNotIn("risque", json.dumps(o))
        cr = c.post(f"/dossiers/{did}/offre", json={"reponse": "accepte"}).json()
        self.assertEqual((cr["frequence"], len(cr["echeances"])), ("mensuelle", 12))
        dates = [datetime.fromisoformat(e["date_due"]) for e in cr["echeances"]]
        self.assertTrue(all(29 <= (b - a).days <= 32 for a, b in zip(dates, dates[1:])))
        self.assertAlmostEqual(sum(e["montant_attendu"] for e in cr["echeances"]) - cr["montant"], o["cout_total"], delta=12)
        # Rappel avant échéance : mensualité, 5 jours avant.
        s.avancer(26)
        msg = [r["message"] for r in s.credit(cr["id"])["relances"]]
        self.assertTrue(msg and "mensualité" in msg[0], msg)

    def test_parametres_modalites_versionnes(self):
        r = client(self.s, "responsable-lagune")
        url = "/institutions/inst-lagune/parametres"
        avant = len(r.get(url).json()["historique"])
        x = r.post(url, json={"frequences": ["quinzaine", "hebdomadaire"], "duree_min_mois": 4, "duree_max_mois": 8, "delai_versement_h": 24})
        self.assertEqual(x.status_code, 200, x.text)
        self.assertEqual(x.json()["frequences"], "hebdomadaire,quinzaine")
        self.assertEqual(len(r.get(url).json()["historique"]), avant + 1)
        self.assertEqual(r.post(url, json={"frequences": ["annuelle"]}).status_code, 422)
        self.assertEqual(r.post(url, json={"duree_min_mois": 10, "duree_max_mois": 5}).status_code, 422)
        self.assertEqual(client(self.s, "agent-lagune").post(url, json={"frequences": ["mensuelle"]}).status_code, 403)
        self.assertEqual(client(self.s, "responsable-baobab").post(url, json={"frequences": ["mensuelle"]}).status_code, 403)


if __name__ == "__main__":
    unittest.main()
