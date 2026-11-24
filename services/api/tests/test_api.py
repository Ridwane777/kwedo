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

DEMANDE = {"montant": 300_000, "categorie": "stock", "objet": "Acheter du stock avant les fêtes."}
CORPS = {"montant_demande": 300_000, "objet_categorie": "stock", "objet": "Acheter du stock avant les fêtes."}


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
            s.envoyer_dossier("com-afiavi", "inst-baobab", **DEMANDE)
        self.assertEqual(e.exception.statut, 403)
        for inst in ("inst-lagune", "inst-baobab"):
            s.consentir("com-afiavi", inst, "accorde")
            d = s.envoyer_dossier("com-afiavi", inst, **DEMANDE)
        did = s.file("inst-lagune")[0]["id"]
        did = [r for r in s.file("inst-lagune") if r["commercant_id"] == "com-afiavi"][0]["id"]
        fiche = s.dossier(did)
        self.assertEqual(fiche["statut"], "en_analyse")
        with self.assertRaises(ErreurMetier):
            s.decider(did, "ajuste", "agent.test", "court", 100_000)
        with self.assertRaises(ErreurMetier):
            s.decider(did, "ajuste", "agent.test", "montant au-dessus de la formule", 10**9)
        montant = min(fiche["palier"]["montant_accordable"], DEMANDE["montant"]) - 20_000  # sous le palier : sans motif
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
        self.assertEqual(len([l for l in p["credits"] if l["credit_id"] == cr["id"]]), 1)
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
            s.envoyer_dossier("com-afiavi", "inst-baobab", **DEMANDE)
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
        r = c.post("/dossiers", json={"commercant_id": "com-rachidi", "institution_id": "inst-lagune", **CORPS})
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

    def test_apercu_parametres_reserve_au_responsable_et_sans_ecriture(self):
        chemin = "/institutions/inst-lagune/parametres/apercu"
        for p in ("agent-lagune", "responsable-baobab", "admin"):
            self.assertEqual(client(self.s, p).post(chemin, json={"s": 0.5}).status_code, 403, p)
        versions = len(self.s.historique_parametres("inst-lagune"))
        r = client(self.s, "responsable-lagune").post(chemin, json={"s": 0.6, "seuil_risque": 0.2})
        self.assertEqual(r.status_code, 200)
        a = r.json()
        self.assertGreater(a["nb_dossiers"], 0)
        self.assertGreaterEqual(a["plafond_moyen"]["apres"], a["plafond_moyen"]["avant"])  # marge plus haute, tolérance plus large
        self.assertLessEqual(a["au_dessus_tolerance"]["apres"], a["au_dessus_tolerance"]["avant"])
        self.assertEqual(len(self.s.historique_parametres("inst-lagune")), versions)  # rien n'est écrit
        self.assertEqual(client(self.s, "responsable-lagune").post(chemin, json={"s": 3}).status_code, 422)

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
        self.assertNotIn("formule", r[0]["texte"].lower())

    def test_credits_echeances_et_offres_cloisonnes(self):
        s = self.s
        did = [r for r in s.file("inst-lagune") if r["commercant_id"] == "com-rachidi"][0]["id"]
        s.decider(did, "valide", "agent.lagune", "Dossier régulier, accord au plafond.",
                  motif_depassement="Commerçant connu de l'agence depuis longtemps.")
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


class TestPaletteDemo(unittest.TestCase):
    """Données de démo contrastées : risques calculés par le moteur, pas imposés."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.s = Service(str(Path(cls.tmp.name) / "p.sqlite"))
        cls.s.reinitialiser()

    def test_dossiers_au_dessus_et_en_dessous_de_la_tolerance(self):
        f = [d for d in self.s.file("inst-lagune", tri="risque") if d["statut"] in ("recu", "en_analyse")]  # hors crédits passés
        self.assertEqual(len(f), 8)  # tous les commerçants de démo sauf la persona
        self.assertGreaterEqual(sum(not d["dans_tolerance"] for d in f), 1)
        self.assertGreaterEqual(sum(d["dans_tolerance"] for d in f), 1)
        self.assertEqual([d["risque_demande"] for d in f], sorted((d["risque_demande"] for d in f), reverse=True))
        self.assertGreaterEqual(sum(d["montant_demande"] > d["plafond"] for d in f), 1)  # au moins une demande au-dessus du plafond
        baobab = self.s.file("inst-baobab")
        self.assertEqual(len(baobab), 1)
        self.assertFalse(baobab[0]["dans_tolerance"])

    def test_raisons_nomment_la_cause(self):
        f = {d["commercant_id"]: d for d in self.s.file("inst-lagune") if d["statut"] in ("recu", "en_analyse")}
        baisse = self.s.dossier(f["com-hounkpe"]["id"], acteur=None)
        self.assertLess(baisse["analyse"]["indicateurs"]["tendance_hebdo"], -0.03)
        self.assertIn("tendance", [r["code"] for r in baisse["analyse"]["raisons"] if r["effet"] > 0])
        conc = self.s.dossier(f["com-yaba"]["id"], acteur=None)
        self.assertGreater(conc["analyse"]["indicateurs"]["part_plus_gros_payeur"], 0.4)
        self.assertIn("concentration", [a["code"] for a in conc["analyse"]["alertes"]])

    def test_profil_commercant_a_risque(self):
        c = client(self.s, "commercant-risque")
        self.assertIn("Commerçant à risque", [p["libelle"] for p in c.get("/auth/profils").json()])
        e = c.get("/commercants/com-yaba/estimation?institution_id=inst-lagune&montant_souhaite=530000").json()
        self.assertTrue(e["souhait"]["au_dessus_du_seuil"])
        self.assertTrue(any("Diversifiez" in x for x in e["conseils"]))

    def test_aucune_formule_a_l_ecran(self):
        c = client(self.s, "agent-lagune")
        for d in self.s.file("inst-lagune"):
            r = c.get(f"/dossiers/{d['id']}").json()
            self.assertFalse(any("formule" in x["texte"].lower() for x in r["analyse"]["raisons"]))


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
        self.assertTrue(e["estimation_eprouvee"])  # mensuel éprouvé au run 2026-11-24-frequences
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
        r = c.post("/dossiers", json={"commercant_id": "com-afiavi", "institution_id": "inst-baobab", "frequence": "mensuelle", "duree_mois": 9, **CORPS})
        self.assertEqual(r.status_code, 201)
        self.assertEqual((r.json()["frequence"], r.json()["duree_mois"]), ("mensuelle", 9))
        did = r.json()["id"]
        agent = client(s, "agent-baobab")
        fiche = agent.get(f"/dossiers/{did}").json()
        self.assertEqual((fiche["frequence_demandee"], fiche["duree_mois_demandee"]), ("mensuelle", 9))
        self.assertTrue(fiche["analyse"]["risque_valide"])
        # Ajustement hors limites refusé, dans les limites accepté (12 mois).
        ko = agent.post(f"/dossiers/{did}/decisions", json={"type": "ajuste", "motif": "Durée allongée pour alléger.", "montant_decide": 100_000, "duree_mois": 24})
        self.assertEqual(ko.status_code, 422)
        ko = agent.post(f"/dossiers/{did}/decisions", json={"type": "ajuste", "motif": "Passage en hebdomadaire.", "montant_decide": 100_000, "frequence": "hebdomadaire"})
        self.assertEqual(ko.status_code, 422)
        ok = agent.post(f"/dossiers/{did}/decisions", json={"type": "ajuste", "motif": "Durée allongée pour alléger les mensualités.",
                                                             "montant_decide": 250_000, "duree_mois": 12,
                                                             "motif_depassement": "Garantie du groupement de commerçants."})
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


class TestDemande(unittest.TestCase):
    """ADR 0017 : montant demandé librement + objet ; l'institution décide sur le risque de la demande."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.s = Service(str(Path(cls.tmp.name) / "d.sqlite"))
        cls.s.reinitialiser()

    def _envoyer(self, cid, inst, **corps):
        c = client(self.s, commercant=cid)
        code = c.post(f"/commercants/{cid}/code-sms", json={"institution_id": inst}).json()["code"]
        c.post(f"/commercants/{cid}/consentements", json={"institution_id": inst, "action": "accorde", "code": code})
        return c, c.post("/dossiers", json={"commercant_id": cid, "institution_id": inst, **corps})

    def test_validation_serveur(self):
        c, r = self._envoyer("com-afiavi", "inst-solidaire", montant_demande=0, objet_categorie="stock", objet="Du stock.")
        self.assertEqual(r.status_code, 422)
        for corps in ({"objet_categorie": "stock", "objet": "Du stock."},                                   # sans montant
                      {"montant_demande": 10**9, "objet_categorie": "stock", "objet": "Du stock."},         # borne haute
                      {"montant_demande": 200_000, "objet_categorie": "voyage", "objet": "Du stock."},      # catégorie inconnue
                      {"montant_demande": 200_000, "objet_categorie": "stock", "objet": "   "},             # objet vide
                      {"montant_demande": 200_000, "objet_categorie": "stock", "objet": "x" * 201}):        # objet trop long
            self.assertEqual(c.post("/dossiers", json={"commercant_id": "com-afiavi", "institution_id": "inst-solidaire", **corps}).status_code, 422, corps)

    def test_demande_au_dessus_du_plafond_accordee_sur_le_risque(self):
        s = self.s
        plafond = s.estimation("com-afiavi", "inst-lagune")["plafond"]
        demande = plafond + 200_000
        c, r = self._envoyer("com-afiavi", "inst-lagune", montant_demande=demande, objet_categorie="equipement",
                             objet="Un congélateur pour la boutique.")
        self.assertEqual(r.status_code, 201, r.text)
        self.assertNotIn("risque", r.text)
        did = r.json()["id"]
        agent = client(s, "agent-lagune")
        fiche = agent.get(f"/dossiers/{did}").json()
        dem = fiche["demande"]
        self.assertEqual((fiche["montant_demande"], fiche["objet_texte"], dem["montant"]), (demande, "Un congélateur pour la boutique.", demande))
        self.assertGreaterEqual(dem["risque"], dem["risque_plafond"])           # plus demandé : risque au moins égal
        self.assertEqual(dem["dans_tolerance"], dem["risque"] <= dem["seuil_risque"])
        self.assertTrue(any(x["code"] == "au_dessus_du_plafond" for x in dem["raisons"]))
        self.assertIn("mauvaise semaine", " ".join(x["texte"] for x in dem["raisons"]))
        # Contre-proposition : risque recalculé à chaque changement, plus bas pour un montant plus bas.
        bas = agent.get(f"/dossiers/{did}/risque?montant={plafond}&frequence=mensuelle&duree_mois=12").json()
        self.assertLessEqual(bas["risque"], dem["risque"])
        self.assertEqual((bas["frequence"], bas["duree_mois"], bas["nb_echeances"]), ("mensuelle", 12, 12))
        self.assertEqual(agent.get(f"/dossiers/{did}/risque?duree_mois=24").status_code, 422)
        self.assertEqual(client(s, "agent-baobab").get(f"/dossiers/{did}/risque").status_code, 404)
        self.assertEqual(c.get(f"/dossiers/{did}/risque").status_code, 401)
        # File : montant demandé et risque, triable par risque.
        f = agent.get("/dossiers?tri=risque").json()
        self.assertEqual([x["risque_demande"] for x in f], sorted((x["risque_demande"] for x in f), reverse=True))
        self.assertEqual([x for x in f if x["id"] == did][0]["montant_demande"], demande)
        # Pas plus que demandé.
        ko = agent.post(f"/dossiers/{did}/decisions", json={"type": "ajuste", "motif": "Plus que demandé, pour voir.", "montant_decide": demande + 5_000})
        self.assertEqual(ko.status_code, 422)
        ok = agent.post(f"/dossiers/{did}/decisions", json={"type": "valide", "motif": "Risque acceptable pour cet équipement.",
                                                             "motif_depassement": "Équipement déjà commandé, facture fournie."})
        self.assertEqual(ok.status_code, 201, ok.text)
        o = c.get(f"/commercants/com-afiavi/dossiers/{did}").json()
        self.assertEqual((o["montant_offre"], o["nature"], o["ecart_montant"]), (demande, "demande_acceptee", 0))
        self.assertNotIn("risque", json.dumps(o))
        self.assertTrue(s.rejouer(did)["identique"])
        self.assertIn("demande accordée", s.journal(inst="inst-lagune")[0]["detail"])

    def test_contre_proposition_visible_et_admin_sans_objet(self):
        s = self.s
        c, r = self._envoyer("com-sena", "inst-baobab", montant_demande=400_000, objet_categorie="autre",
                             objet="Ouvrir un second étal au marché.")
        did = r.json()["id"]
        agent = client(s, "agent-baobab")
        ok = agent.post(f"/dossiers/{did}/decisions", json={"type": "ajuste", "motif": "Montant réduit, durée allongée à 12 mois.",
                                                             "montant_decide": 150_000, "duree_mois": 12})
        self.assertEqual(ok.status_code, 201, ok.text)
        self.assertIsNotNone(ok.json()["decisions"][-1]["risque"])
        o = c.get(f"/commercants/com-sena/dossiers/{did}").json()
        self.assertEqual((o["nature"], o["ecart_montant"], o["duree_mois"]), ("contre_proposition", -250_000, 12))
        a = client(s, "admin")
        for url in ("/admin/apercu", "/journal"):
            t = a.get(url).text
            self.assertNotIn("second étal", t, url)
            self.assertNotIn("400 000", t, url)

    def test_plafond_selon_la_duree(self):
        c = client(self.s, "commercant")
        p = c.get("/commercants/com-afiavi/plafonds?institution_id=inst-lagune&frequence=hebdomadaire").json()
        self.assertEqual([l["duree_mois"] for l in p["lignes"]], [3, 6, 9, 12])
        plafonds = [l["plafond"] for l in p["lignes"]]
        self.assertEqual(plafonds, sorted(plafonds))
        self.assertGreater(plafonds[-1], plafonds[0])
        self.assertNotIn("risque", c.get("/commercants/com-afiavi/plafonds?institution_id=inst-baobab").text)
        self.assertEqual([l["duree_mois"] for l in c.get("/commercants/com-afiavi/plafonds?institution_id=inst-baobab").json()["lignes"]], [6, 9, 12])
        self.assertEqual(client(self.s, commercant="com-sena").get("/commercants/com-afiavi/plafonds").status_code, 403)

    def test_conseils_pour_les_modalites_choisies(self):
        c = client(self.s, "commercant")
        a = c.get("/commercants/com-afiavi/conseils?institution_id=inst-lagune&frequence=mensuelle&duree_mois=9").json()
        self.assertEqual((a["frequence"], a["duree_mois"]), ("mensuelle", 9))
        e = c.get("/commercants/com-afiavi/estimation?institution_id=inst-lagune&frequence=mensuelle&duree_mois=9").json()
        self.assertEqual(a["plafond_actuel"], e["plafond"])


class TestPalier(unittest.TestCase):
    """ADR 0018 : crédit progressif. Le palier limite le montant accordable par-dessus le moteur, sans le modifier."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.s = Service(str(Path(self.tmp.name) / "palier.sqlite"))
        self.s.reinitialiser()

    def tearDown(self):
        self.s.db.close()
        self.tmp.cleanup()

    def _credit(self, cid, montant, inst="inst-lagune"):
        s = self.s
        d = [r for r in s.file(inst, statut="recu") if r["commercant_id"] == cid]
        if not d:
            s.consentir(cid, inst, "accorde")
            d = [s.envoyer_dossier(cid, inst, montant=montant, categorie="stock", objet="Du stock pour la saison.")]
        s.decider(d[0]["id"], "ajuste", "agent.lagune", "Montant ramené au palier du commerçant.", montant)
        return s.repondre_offre(d[0]["id"], "accepte")

    def test_palier_initial(self):
        s = self.s
        p = s.estimation("com-afiavi")["palier"]
        self.assertEqual((p["niveau"], p["cycle"], p["premier_credit"], p["montant_palier"]), (1, 1, True, 150_000))
        self.assertEqual((p["montant_accordable"], p["limite_par"], p["suivant_accordable"]), (150_000, "palier", 225_000))
        self.assertGreater(p["plafond_moteur"], p["montant_palier"])
        self.assertEqual([x["montant"] for x in p["paliers"]][:3], [150_000, 225_000, 335_000])
        self.assertEqual(s.estimation("com-afiavi", "inst-baobab")["palier"]["montant_palier"], 200_000)  # par institution

    def test_demo_paliers_generes(self):
        s = self.s
        gildas, edwige, hounkpe = (s.estimation(c)["palier"] for c in ("com-gildas", "com-edwige", "com-hounkpe"))
        self.assertEqual((gildas["niveau"], gildas["montant_palier"]), (2, 225_000))
        self.assertEqual(edwige["niveau"], 3)
        self.assertEqual((hounkpe["niveau"], hounkpe["redescendu"], hounkpe["cycle"]), (1, True, 3))
        self.assertEqual([h["etat"] for h in hounkpe["historique"]], ["rembourse_a_l_heure", "retard_grave"])

    def test_montee_apres_remboursement_a_l_heure(self):
        s = self.s
        cr = self._credit("com-afiavi", 150_000)
        self.assertIsNone(s.credit(cr["id"])["palier_debloque"])
        self.assertEqual(s.estimation("com-afiavi")["palier"]["cycle"], 1)  # crédit en cours : même cycle
        s.payer(cr["id"], s.credit(cr["id"])["restant"])
        c = s.credit(cr["id"])
        self.assertEqual((c["palier_etat"], c["palier_debloque"]), ("rembourse_a_l_heure", 225_000))
        p = s.estimation("com-afiavi")["palier"]
        self.assertEqual((p["niveau"], p["cycle"], p["montant_palier"]), (2, 2, 225_000))

    def test_descente_apres_retard_grave(self):
        s = self.s
        cr = self._credit("com-gildas", 200_000)  # palier 2 (225 000)
        s.avancer(16)  # première échéance (J+7) impayée 9 jours > 7 : retard grave, même avant le solde
        self.assertEqual(s.estimation("com-gildas")["palier"]["montant_palier"], 150_000)
        s.payer(cr["id"], s.credit(cr["id"])["restant"])
        c = s.credit(cr["id"])
        self.assertEqual((c["palier_etat"], c["palier_debloque"]), ("retard_grave", None))
        p = s.estimation("com-gildas")["palier"]
        self.assertEqual((p["niveau"], p["montant_palier"], p["redescendu"]), (1, 150_000, True))
        # Comportement « bloquer » : versionné, et plus aucun montant accordable sans dépassement motivé.
        r = client(s, "responsable-lagune").post("/institutions/inst-lagune/palier", json={"apres_defaut": "bloquer"})
        self.assertEqual(r.status_code, 200, r.text)
        p = s.estimation("com-gildas")["palier"]
        self.assertEqual((p["bloque"], p["montant_palier"], p["montant_accordable"]), (True, 0, 0))

    def test_jamais_au_dessus_du_plafond_moteur(self):
        s = self.s
        for cid in ("com-afiavi", "com-gildas", "com-edwige", "com-hounkpe", "com-yaba", "com-nafissatou"):
            for inst in ("inst-lagune", "inst-baobab"):
                p = s.estimation(cid, inst)["palier"]
                self.assertLessEqual(p["montant_accordable"], p["plafond_moteur"], (cid, inst))
                self.assertEqual(p["montant_accordable"], min(p["plafond_moteur"], p["montant_palier"]))
        e = s.estimation("com-edwige")["palier"]
        self.assertEqual((e["limite_par"], e["montant_accordable"]), ("plafond", e["plafond_moteur"]))
        # Même avec un motif de dépassement, la borne du moteur tient.
        did = [r for r in s.file("inst-lagune", statut="recu") if r["commercant_id"] == "com-edwige"][0]["id"]
        with self.assertRaises(ErreurMetier) as x:
            s.decider(did, "ajuste", "agent.lagune", "Tentative au-dessus du moteur.", 10**8, motif_depassement="Client très fidèle.")
        self.assertEqual(x.exception.statut, 422)

    def test_depassement_par_l_agent_avec_motif(self):
        s = self.s
        did = [r for r in s.file("inst-lagune", statut="recu") if r["commercant_id"] == "com-gildas"][0]["id"]
        agent = client(s, "agent-lagune")
        fiche = agent.get(f"/dossiers/{did}").json()
        self.assertEqual((fiche["palier"]["montant_accordable"], fiche["palier"]["demande_au_dessus"]), (225_000, True))
        self.assertEqual([h["etat"] for h in fiche["palier"]["historique"]], ["rembourse_a_l_heure"])
        ko = agent.post(f"/dossiers/{did}/decisions", json={"type": "valide", "motif": "Demande raisonnable pour la saison."})
        self.assertEqual(ko.status_code, 422)
        self.assertIn("palier", ko.json()["erreur"])
        ko = agent.post(f"/dossiers/{did}/decisions", json={"type": "valide", "motif": "Demande raisonnable pour la saison.",
                                                           "motif_depassement": "court"})
        self.assertEqual(ko.status_code, 422)
        ok = agent.post(f"/dossiers/{did}/decisions", json={"type": "valide", "motif": "Demande raisonnable pour la saison.",
                                                           "motif_depassement": "Commande ferme d'un chantier, bon de commande vu."})
        self.assertEqual(ok.status_code, 201, ok.text)
        dec = ok.json()["decisions"][-1]
        self.assertEqual((dec["palier"], dec["montant_decide"]), (225_000, 290_000))
        self.assertEqual(dec["motif_depassement"], "Commande ferme d'un chantier, bon de commande vu.")
        self.assertIn("dépassement du palier", s.journal(inst="inst-lagune")[0]["detail"])
        with self.assertRaises(sqlite3.DatabaseError):
            s.db.execute("UPDATE decisions SET motif_depassement = NULL")

    def test_cloisonnement_des_cycles(self):
        s = self.s
        # Gildas a remboursé un crédit chez Lagune : chez Baobab, il reste au premier crédit, sans historique visible.
        b = s.estimation("com-gildas", "inst-baobab")["palier"]
        self.assertEqual((b["niveau"], b["historique"], b["premier_credit"]), (1, [], True))
        did = [r for r in s.file("inst-baobab") if r["commercant_id"] == "com-yaba"][0]["id"]
        fiche = client(s, "agent-baobab").get(f"/dossiers/{did}").json()
        self.assertEqual(fiche["palier"]["institution_id"], "inst-baobab")
        lagune = {c["id"] for c in s.q("SELECT id FROM credits WHERE institution_id = 'inst-lagune'")}
        self.assertFalse(any(cr in json.dumps(fiche) for cr in lagune))
        # Politique : lecture par l'équipe de l'institution, écriture et aperçu par son responsable seul.
        self.assertEqual(client(s, "agent-baobab").get("/institutions/inst-lagune/palier").status_code, 403)
        self.assertEqual(client(s, "agent-lagune").get("/institutions/inst-lagune/palier").status_code, 200)
        for p in ("agent-lagune", "responsable-baobab", "admin"):
            self.assertIn(client(s, p).post("/institutions/inst-lagune/palier", json={"palier_initial": 10**6}).status_code, (401, 403), p)
            self.assertIn(client(s, p).post("/institutions/inst-lagune/palier/apercu", json={}).status_code, (401, 403), p)
        self.assertEqual(client(s, commercant="com-sena").get("/commercants/com-gildas/palier").status_code, 403)
        g = client(s, commercant="com-gildas").get("/commercants/com-gildas/palier?institution_id=inst-lagune").json()
        self.assertEqual(g["niveau"], 2)

    def test_politique_versionnee_et_apercu_sans_ecriture(self):
        s = self.s
        r = client(s, "responsable-lagune")
        avant = len(s.historique_politique("inst-lagune"))
        a = r.post("/institutions/inst-lagune/palier/apercu", json={"palier_initial": 400_000, "multiplicateur": 1.2})
        self.assertEqual(a.status_code, 200, a.text)
        a = a.json()
        self.assertEqual(a["nb_dossiers"], 8)
        self.assertLess(a["au_dessus_du_palier"]["apres"], a["au_dessus_du_palier"]["avant"])
        self.assertGreater(a["accordable_moyen"]["apres"], a["accordable_moyen"]["avant"])
        self.assertEqual(len(s.historique_politique("inst-lagune")), avant)  # rien n'est écrit
        for corps in ({"multiplicateur": 5}, {"palier_initial": 10}, {"apres_defaut": "effacer"}, {"retard_grave_jours": 0}):
            self.assertEqual(r.post("/institutions/inst-lagune/palier", json=corps).status_code, 422, corps)
        ok = r.post("/institutions/inst-lagune/palier", json={"palier_initial": 100_000})
        self.assertEqual((ok.status_code, ok.json()["palier_initial"], ok.json()["auteur"]), (200, 100_000, "responsable.lagune"))
        self.assertEqual(len(s.historique_politique("inst-lagune")), avant + 1)
        self.assertEqual(s.estimation("com-afiavi")["palier"]["montant_palier"], 100_000)


if __name__ == "__main__":
    unittest.main()
