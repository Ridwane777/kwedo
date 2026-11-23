"""Logique métier de l'API : dossiers, consentements, décisions, offres, échéanciers, paiements, relances, journaux."""

from __future__ import annotations

import hashlib
import json
import sqlite3
import sys
from datetime import datetime, timedelta
from pathlib import Path

RACINE = Path(__file__).resolve().parents[3]
sys.path[:0] = [str(RACINE / "packages/engine"), str(RACINE / "packages/generator")]

from kwedo_engine import VERSION, Parametres, analyser, echeance  # noqa: E402

from .connecteurs import EmecefSimule, NotificationsSimulees, OperateurSimule  # noqa: E402

MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations"
DEMO = RACINE / "data/demo/demo.json"
DEBUT_DEMO = "2026-11-23T10:00:00"
MAX_RELANCES = 3
HEURES_OK = range(8, 20)


class ErreurMetier(Exception):
    def __init__(self, statut: int, message: str):
        super().__init__(message)
        self.statut, self.message = statut, message


def connecter(chemin: str) -> sqlite3.Connection:
    db = sqlite3.connect(chemin, check_same_thread=False, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode = WAL")
    db.execute("PRAGMA foreign_keys = ON")
    db.execute("CREATE TABLE IF NOT EXISTS schema_version (version TEXT PRIMARY KEY)")
    faites = {r[0] for r in db.execute("SELECT version FROM schema_version")}
    for f in sorted(MIGRATIONS.glob("*.sql")):
        if f.stem not in faites:
            db.executescript(f.read_text())
            db.execute("INSERT INTO schema_version VALUES (?)", (f.stem,))
    return db


def _f(montant) -> str:
    return "—" if montant is None else f"{int(montant):,}".replace(",", " ") + " FCFA"


RAISON_FORMULE = "La formule de l'institution limite la part de vos encaissements consacrée au remboursement : c'est elle qui fixe le plafond."


def raisons_commercant(raisons: list[dict]) -> list[dict]:
    """Le texte moteur de la raison « formule » cite la part prélevable s de l'institution : remplacé côté commerçant."""
    return [{**r, "texte": RAISON_FORMULE} if r["code"] == "formule" else r for r in raisons]


def manque_commercant(manque: list[str], c_p: int) -> list[str]:
    """Les textes moteur citent le risque simulé, le seuil de l'institution, et un encaissement requis dont on
    déduirait m × s. Côté commerçant : mêmes conseils, sans ces valeurs."""
    out = []
    for t in manque:
        if t.startswith("Un encaissement prudent"):
            t = f"Des encaissements plus élevés sur les mauvaises semaines (aujourd'hui {_f(c_p)} par semaine au moins)."
        elif t.startswith("Des encaissements plus réguliers"):
            t = "Des encaissements plus réguliers : à ce montant, le risque d'une échéance manquée dépasse la limite de l'institution."
        out.append(t)
    return out


def _g(*parts) -> int:
    return int(hashlib.sha256(":".join(map(str, parts)).encode()).hexdigest()[:8], 16)


class Service:
    def __init__(self, chemin: str):
        self.chemin = chemin
        self.db = connecter(chemin)
        self.operateur, self.emecef, self.notif = OperateurSimule(), EmecefSimule(), NotificationsSimulees()
        self._tx: dict[str, list] = {}

    # ---------- utilitaires ----------
    def q(self, sql, *a):
        return [dict(r) for r in self.db.execute(sql, a)]

    def un(self, sql, *a):
        r = self.db.execute(sql, a).fetchone()
        return dict(r) if r else None

    def maintenant(self) -> datetime:
        r = self.un("SELECT maintenant, fixe_le_reel FROM horloge WHERE id = 1")
        if not r:
            return datetime.fromisoformat(DEBUT_DEMO)
        base = datetime.fromisoformat(r["maintenant"])
        if r["fixe_le_reel"]:
            base += datetime.now() - datetime.fromisoformat(r["fixe_le_reel"])
        return base

    def _fixer_horloge(self, d: datetime | str):
        d = d if isinstance(d, str) else d.isoformat(timespec="seconds")
        self.db.execute("INSERT INTO horloge (id, maintenant, fixe_le_reel) VALUES (1, ?, ?) "
                        "ON CONFLICT(id) DO UPDATE SET maintenant = excluded.maintenant, fixe_le_reel = excluded.fixe_le_reel",
                        (d, datetime.now().isoformat()))

    def _iso(self, d: datetime | None = None) -> str:
        return (d or self.maintenant()).isoformat(timespec="seconds")

    def transactions(self, cid: str) -> list[dict]:
        if cid not in self._tx:
            self._tx[cid] = self.q("SELECT id, horodatage, montant, sens, contrepartie, nature FROM transactions "
                                   "WHERE commercant_id = ? ORDER BY horodatage", cid)
        return self._tx[cid]

    def parametres(self, inst: str) -> dict:
        p = self.un("SELECT * FROM parametres_moteur WHERE institution_id = ? ORDER BY id DESC LIMIT 1", inst)
        if not p:
            raise ErreurMetier(404, "institution inconnue")
        return p

    # ---------- démo ----------
    def reinitialiser(self) -> dict:
        d = json.loads(DEMO.read_text())
        # Les triggers « ajout seul » protègent le journal : on repart d'une base neuve plutôt que de les contourner.
        self.db.close()
        if self.chemin != ":memory:":
            for suffixe in ("", "-wal", "-shm"):
                Path(self.chemin + suffixe).unlink(missing_ok=True)
        self.db = connecter(self.chemin)
        self._tx.clear()
        self._fixer_horloge(DEBUT_DEMO)
        for inst in d["institutions"]:
            self.db.execute("INSERT INTO institutions (id, nom) VALUES (?, ?)", (inst["id"], inst["nom"]))
            pr = inst["parametres"]
            self.db.execute("INSERT INTO parametres_moteur (institution_id, m, s, n, i, percentile, seuil_risque, auteur, cree_le) "
                            "VALUES (?,?,?,?,?,?,?,?,?)", (inst["id"], pr["m"], pr["s"], pr["n"], pr["i"], pr["percentile"],
                                                          pr["seuil_risque"], "configuration-demo", DEBUT_DEMO))
        for c in d["commercants"]:
            self._inserer_commercant(c["id"], c["nom"], c["telephone"], c["type_activite"], c["compte_separe"], c["transactions"])
        # File de la console : tous les commerçants sauf la persona (elle enverra son dossier pendant la démo).
        for c in d["commercants"][1:]:
            inst = "inst-lagune"
            self.consentir(c["id"], inst, "accorde")
            self.envoyer_dossier(c["id"], inst)
        return {"ok": True, "maintenant": DEBUT_DEMO, "commercants": len(d["commercants"])}

    def _inserer_commercant(self, cid, nom, tel, activite, separe, txs):
        self.db.execute("INSERT INTO commercants (id, nom, telephone, type_activite, compte_marchand_ouvert_le, compte_separe, "
                        "identite_verifiee, cree_le) VALUES (?,?,?,?,?,?,1,?)",
                        (cid, nom, tel, activite, txs[0]["horodatage"][:10] if txs else None, int(separe), self._iso()))
        self.db.execute("BEGIN")
        self.db.executemany("INSERT INTO transactions (id, commercant_id, horodatage, montant, sens, contrepartie, nature) "
                            "VALUES (?,?,?,?,?,?,?)", [(t["id"], cid, t["horodatage"], t["montant"], t["sens"],
                                                        t["contrepartie"], t["nature"]) for t in txs])
        self.db.execute("COMMIT")
        self._tx.pop(cid, None)

    def avancer(self, jours: int) -> dict:
        """Avance l'horloge simulée jour par jour ; la tâche planifiée de relance tourne chaque jour à 10 h."""
        if not 1 <= jours <= 60:
            raise ErreurMetier(422, "entre 1 et 60 jours")
        rel = []
        for _ in range(jours):
            # Saut au lendemain 10 h : heure de passage de la tâche planifiée de relance.
            nouv = (self.maintenant() + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
            self._fixer_horloge(nouv)
            self.mettre_a_jour_statuts()
            rel += self.executer_relances()
        return {"maintenant": self._iso(), "relances": rel}

    # ---------- commerçant ----------
    def inscrire(self, nom: str, telephone: str, activite: str, compte_separe: bool) -> dict:
        if not nom.strip() or not telephone.strip():
            raise ErreurMetier(422, "nom et téléphone obligatoires")
        cid = f"com-{_g(nom, telephone) % 10**6:06d}"
        if self.un("SELECT id FROM commercants WHERE id = ? OR telephone = ?", cid, telephone.strip()):
            raise ErreurMetier(409, "un profil existe déjà avec ce numéro")
        self._inserer_commercant(cid, nom.strip(), telephone.strip(), activite, compte_separe, [])
        return self.commercant(cid)

    def connecter_flux(self, cid: str, semaines: int = 30) -> dict:
        c = self.commercant(cid)
        if self.transactions(cid):
            return {"deja_connecte": True, "transactions": len(self.transactions(cid))}
        txs = self.operateur.importer_flux(cid, semaines, c["type_activite"])
        self.db.execute("BEGIN")
        self.db.executemany("INSERT INTO transactions (id, commercant_id, horodatage, montant, sens, contrepartie, nature) "
                            "VALUES (?,?,?,?,?,?,?)", [(t["id"], cid, t["horodatage"], t["montant"], t["sens"],
                                                        t["contrepartie"], t["nature"]) for t in txs])
        self.db.execute("UPDATE commercants SET compte_marchand_ouvert_le = ? WHERE id = ?", (txs[0]["horodatage"][:10], cid))
        self.db.execute("COMMIT")
        self._tx.pop(cid, None)
        return {"deja_connecte": False, "transactions": len(txs), "simule": True}

    def commercant(self, cid: str) -> dict:
        c = self.un("SELECT * FROM commercants WHERE id = ?", cid)
        if not c:
            raise ErreurMetier(404, "commerçant inconnu")
        c["compte_separe"] = bool(c["compte_separe"])
        c["nb_transactions"] = len(self.transactions(cid))
        return c

    def choisir_canal(self, cid: str, canal: str) -> dict:
        if canal not in ("sms", "whatsapp", "appli"):
            raise ErreurMetier(422, "canal inconnu")
        self.db.execute("UPDATE commercants SET canal = ? WHERE id = ?", (canal, cid))
        return self.commercant(cid)

    def estimation(self, cid: str, inst: str = "inst-lagune", choc: float = 0.0, souhait: int | None = None) -> dict:
        self.commercant(cid)
        if not -0.9 <= choc <= 0:
            raise ErreurMetier(422, "choc_ventes entre -0,9 et 0")
        p = self.parametres(inst)
        res = analyser(self.transactions(cid), p, graine=_g(cid, inst), choc_ventes=choc, montant_souhaite=souhait)
        res["institution_id"] = inst
        # Le commerçant ne voit jamais les alertes de manipulation : elles vont à l'agent.
        res.pop("alertes"); res.pop("modeles")
        # Réglages internes de l'institution (m, s, percentile, seuil, L_max) et risque simulé R : ils ne sortent pas
        # vers l'espace commerçant. Seul un indicateur binaire « au-dessus du seuil » accompagne le montant souhaité.
        if res.get("souhait"):
            res["souhait"]["au_dessus_du_seuil"] = res["souhait"].pop("risque") > p["seuil_risque"]
            res["souhait"]["manque"] = manque_commercant(res["souhait"]["manque"], res["encaissement_prudent"])
        res["raisons"] = raisons_commercant(res["raisons"])
        res["parametres"] = {"n": res["parametres"]["n"], "i": res["parametres"]["i"]}
        for interne in ("l_max", "l_simulation", "echeance_supportable", "decote_anciennete", "risque", "recommandation", "graine"):
            res.pop(interne)
        res["chaine_calcul"] = [f"Niveau prudent de vos encaissements : {_f(res['encaissement_prudent'])} par semaine",
                                f"Échéance pour ce montant : {_f(res['echeance_hebdo'])} par semaine, sur {res['duree_semaines']} semaines",
                                f"Coût total du crédit : {_f(res['cout_total'])}"]
        return res

    def tableau_de_bord(self, cid: str) -> dict:
        c = self.commercant(cid)
        est = self.estimation(cid) if c["nb_transactions"] else None
        credits = self.q("SELECT id FROM credits WHERE commercant_id = ?", cid)
        return {"commercant": c, "estimation": est, "credits": [self.credit(k["id"]) for k in credits],
                "dossiers": self.q("SELECT d.id, d.institution_id, i.nom AS institution, d.statut, d.montant_offre, d.duree_offre, d.cree_le "
                                   "FROM dossiers d JOIN institutions i ON i.id = d.institution_id WHERE commercant_id = ? ORDER BY d.cree_le", cid)}

    # ---------- consentements ----------
    def consentir(self, cid: str, inst: str, action: str) -> dict:
        if action not in ("accorde", "retire"):
            raise ErreurMetier(422, "action : accorde ou retire")
        self.commercant(cid); self.parametres(inst)
        self.db.execute("INSERT INTO consentements (commercant_id, institution_id, action, horodatage) VALUES (?,?,?,?)",
                        (cid, inst, action, self._iso()))
        return {"commercant_id": cid, "institution_id": inst, "actif": action == "accorde"}

    def consentement_actif(self, cid: str, inst: str) -> bool:
        r = self.un("SELECT action FROM consentements WHERE commercant_id = ? AND institution_id = ? ORDER BY id DESC LIMIT 1", cid, inst)
        return bool(r and r["action"] == "accorde")

    def consentements(self, cid: str) -> list[dict]:
        out = []
        for inst in self.q("SELECT id, nom FROM institutions ORDER BY nom"):
            hist = self.q("SELECT action, horodatage FROM consentements WHERE commercant_id = ? AND institution_id = ? ORDER BY id", cid, inst["id"])
            out.append({**inst, "actif": bool(hist and hist[-1]["action"] == "accorde"), "historique": hist})
        return out

    # ---------- dossiers ----------
    def envoyer_dossier(self, cid: str, inst: str) -> dict:
        if not self.consentement_actif(cid, inst):
            raise ErreurMetier(403, "pas de consentement actif pour cette institution")
        if not self.transactions(cid):
            raise ErreurMetier(422, "flux non connectés")
        exist = self.un("SELECT id FROM dossiers WHERE commercant_id = ? AND institution_id = ? AND statut IN ('recu','en_analyse','complement','accorde')", cid, inst)
        if exist:
            return self.dossier(exist["id"], acteur=None)
        p = self.parametres(inst)
        did = f"dos-{_g(cid, inst, self._iso()) % 10**6:06d}"
        graine = _g(did)
        res = analyser(self.transactions(cid), p, graine=graine)
        self.db.execute("INSERT INTO dossiers (id, commercant_id, institution_id, statut, analyse_json, version_moteur, graine, parametres_id, cree_le) "
                        "VALUES (?,?,?,?,?,?,?,?,?)", (did, cid, inst, "recu", json.dumps(res), VERSION, graine, p["id"], self._iso()))
        return self.dossier(did, acteur=None)

    def file(self, inst: str | None = None, statut: str | None = None, tri: str = "priorite") -> list[dict]:
        rows = self.q("SELECT d.id, d.commercant_id, c.nom, c.type_activite, d.institution_id, d.statut, d.cree_le, d.analyse_json "
                      "FROM dossiers d JOIN commercants c ON c.id = d.commercant_id "
                      "WHERE (? IS NULL OR d.institution_id = ?) AND (? IS NULL OR d.statut = ?)", inst, inst, statut, statut)
        out = []
        for r in rows:
            a = json.loads(r.pop("analyse_json"))
            r.update({"plafond": a["plafond"], "risque": a["risque"], "recommandation": a["recommandation"],
                      "alertes": [x["code"] for x in a["alertes"]], "provisoire": a["provisoire"],
                      "semaines": a["indicateurs"]["semaines"], "consentement_actif": self.consentement_actif(r["commercant_id"], r["institution_id"])})
            out.append(r)
        ordre = {"recu": 0, "en_analyse": 0, "complement": 1}
        if tri == "anciennete":
            out.sort(key=lambda r: r["cree_le"])
        else:  # priorité : à traiter d'abord, alertes ensuite, puis ancienneté
            out.sort(key=lambda r: (ordre.get(r["statut"], 2), -len(r["alertes"]), r["cree_le"]))
        return out

    def dossier(self, did: str, acteur: str | None = "agent.demo") -> dict:
        d = self.un("SELECT * FROM dossiers WHERE id = ?", did)
        if not d:
            raise ErreurMetier(404, "dossier inconnu")
        if acteur:
            self.db.execute("INSERT INTO journal_acces (acteur, dossier_id, action, horodatage) VALUES (?,?,?,?)",
                            (acteur, did, "consultation", self._iso()))
            if d["statut"] == "recu":
                self.db.execute("UPDATE dossiers SET statut = 'en_analyse', ouvert_le = ? WHERE id = ?", (self._iso(), did))
                d["statut"], d["ouvert_le"] = "en_analyse", self._iso()
        d["analyse"] = json.loads(d.pop("analyse_json"))
        d["commercant"] = self.commercant(d["commercant_id"])
        d["institution"] = self.un("SELECT * FROM institutions WHERE id = ?", d["institution_id"])
        d["consentement_actif"] = self.consentement_actif(d["commercant_id"], d["institution_id"])
        d["decisions"] = self.q("SELECT * FROM decisions WHERE dossier_id = ? ORDER BY id", did)
        d["credit"] = self.un("SELECT id FROM credits WHERE dossier_id = ?", did)
        d["acces"] = self.q("SELECT acteur, action, horodatage FROM journal_acces WHERE dossier_id = ? ORDER BY id DESC LIMIT 20", did)
        return d

    def decider(self, did: str, type_: str, auteur: str, motif: str, montant: int | None = None, duree: int | None = None) -> dict:
        d = self.dossier(did, acteur=None)
        if d["statut"] not in ("recu", "en_analyse", "complement"):
            raise ErreurMetier(409, f"dossier déjà {d['statut']}")
        if type_ not in ("valide", "ajuste", "refuse", "complement"):
            raise ErreurMetier(422, "type de décision inconnu")
        if not motif or len(motif.strip()) < 10:
            raise ErreurMetier(422, "justificatif obligatoire (10 caractères au moins)")
        a = d["analyse"]
        if type_ == "valide":
            montant, duree = a["plafond"], a["duree_semaines"]
        if type_ == "ajuste":
            if not montant or montant <= 0:
                raise ErreurMetier(422, "montant décidé obligatoire")
            duree = duree or a["duree_semaines"]
            p = Parametres.depuis({**a["parametres"], "n": duree})
            plafond_formule = a["encaissement_prudent"] * p.m * p.s * (1 - (1 + p.i) ** -p.n) / p.i
            if montant > plafond_formule:
                raise ErreurMetier(422, f"montant au-dessus du plafond de la formule ({round(plafond_formule)} FCFA)")
        if type_ in ("refuse", "complement"):
            montant, duree = None, None
        self.db.execute("INSERT INTO decisions (dossier_id, type, montant_propose, montant_decide, duree_semaines, auteur, motif, "
                        "version_moteur, parametres_json, graine, horodatage) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                        (did, type_, a["plafond"], montant, duree, auteur, motif.strip(), d["version_moteur"],
                         json.dumps(a["parametres"]), d["graine"], self._iso()))
        statut = {"valide": "accorde", "ajuste": "accorde", "refuse": "refuse", "complement": "complement"}[type_]
        self.db.execute("UPDATE dossiers SET statut = ?, decide_le = ?, montant_offre = ?, duree_offre = ? WHERE id = ?",
                        (statut, self._iso(), montant, duree, did))
        return self.dossier(did, acteur=None)

    def rejouer(self, did: str) -> dict:
        """Audit : rejoue l'analyse avec la graine et les paramètres enregistrés."""
        d = self.dossier(did, acteur=None)
        res = analyser(self.transactions(d["commercant_id"]), d["analyse"]["parametres"], graine=d["graine"])
        return {"identique": json.loads(json.dumps(res)) == d["analyse"], "plafond": res["plafond"]}

    def offre(self, cid: str, did: str) -> dict:
        """Vue commerçant d'un dossier : statut, offre, raisons. Jamais les alertes ni les modèles."""
        d = self.un("SELECT d.*, i.nom AS institution FROM dossiers d JOIN institutions i ON i.id = d.institution_id "
                    "WHERE d.id = ? AND d.commercant_id = ?", did, cid)
        if not d:
            raise ErreurMetier(404, "dossier inconnu")
        a = json.loads(d.pop("analyse_json"))
        dec = self.un("SELECT type, motif, montant_decide, duree_semaines, horodatage FROM decisions WHERE dossier_id = ? ORDER BY id DESC LIMIT 1", did)
        out = {k: d[k] for k in ("id", "institution_id", "institution", "statut", "cree_le", "montant_offre", "duree_offre", "decide_le")}
        out.update({"plafond_estime": a["plafond"], "raisons": raisons_commercant(a["raisons"]), "conseils": a["conseils"],
                    "decision": dec, "credit": self.un("SELECT id FROM credits WHERE dossier_id = ?", did)})
        if d["montant_offre"]:
            p = Parametres.depuis({**a["parametres"], "n": d["duree_offre"]})
            e = echeance(d["montant_offre"], p)
            out.update({"echeance": round(e), "cout_total": round(e * p.n - d["montant_offre"]), "taux_periode": p.i})
        return out

    # ---------- offre, crédit, échéancier ----------
    def repondre_offre(self, did: str, reponse: str, montant: int | None = None) -> dict:
        d = self.dossier(did, acteur=None)
        if d["statut"] != "accorde":
            raise ErreurMetier(409, "aucune offre en attente")
        if reponse == "refuse":
            self.db.execute("UPDATE dossiers SET statut = 'offre_refusee' WHERE id = ?", (did,))
            return self.dossier(did, acteur=None)
        if reponse != "accepte":
            raise ErreurMetier(422, "réponse : accepte ou refuse")
        montant = montant or d["montant_offre"]
        if montant > d["montant_offre"] or montant < 5_000:
            raise ErreurMetier(422, "contre-proposition : montant entre 5 000 FCFA et le montant offert")
        p = Parametres.depuis({**d["analyse"]["parametres"], "n": d["duree_offre"]})
        cr = f"cre-{did[4:]}"
        now = self.maintenant()
        self.db.execute("INSERT INTO credits (id, dossier_id, commercant_id, institution_id, montant, duree_semaines, taux_periode, decaisse_le) "
                        "VALUES (?,?,?,?,?,?,?,?)", (cr, did, d["commercant_id"], d["institution_id"], montant, p.n, p.i, self._iso()))
        e = round(echeance(montant, p))
        for k in range(1, p.n + 1):
            self.db.execute("INSERT INTO echeances (credit_id, rang, date_due, montant_attendu, statut) VALUES (?,?,?,?,'a_venir')",
                            (cr, k, (now + timedelta(days=7 * k)).date().isoformat(), e))
        self.operateur.decaisser(cr, montant)
        self.db.execute("UPDATE dossiers SET statut = 'offre_acceptee' WHERE id = ?", (did,))
        return self.credit(cr)

    def credit(self, cr: str) -> dict:
        c = self.un("SELECT c.*, i.nom AS institution FROM credits c JOIN institutions i ON i.id = c.institution_id WHERE c.id = ?", cr)
        if not c:
            raise ErreurMetier(404, "crédit inconnu")
        c["echeances"] = self.q("SELECT * FROM echeances WHERE credit_id = ? ORDER BY rang", cr)
        c["paiements"] = self.q("SELECT * FROM paiements WHERE credit_id = ? ORDER BY id", cr)
        c["relances"] = self.q("SELECT r.* FROM relances r JOIN echeances e ON e.id = r.echeance_id WHERE e.credit_id = ? ORDER BY r.id", cr)
        du = sum(e["montant_attendu"] for e in c["echeances"])
        recu = sum(e["montant_recu"] for e in c["echeances"])
        c.update({"total_du": du, "total_recu": recu, "restant": du - recu, "cout_total": du - c["montant"],
                  "prochaine": next((e for e in c["echeances"] if e["statut"] != "payee"), None)})
        return c

    def payer(self, cr: str, montant: int) -> dict:
        if montant <= 0:
            raise ErreurMetier(422, "montant positif attendu")
        c = self.credit(cr)
        if montant > c["restant"]:
            raise ErreurMetier(422, f"montant supérieur au restant dû ({c['restant']} FCFA)")
        ref = self.operateur.encaisser(cr, montant)["reference"]
        self.db.execute("INSERT INTO paiements (credit_id, montant, horodatage, recu) VALUES (?,?,?,?)", (cr, montant, self._iso(), ref))
        reste = montant
        for e in c["echeances"]:  # rapprochement : la plus ancienne échéance non soldée d'abord
            if reste <= 0:
                break
            manque = e["montant_attendu"] - e["montant_recu"]
            if manque <= 0:
                continue
            verse = min(manque, reste); reste -= verse
            self.db.execute("UPDATE echeances SET montant_recu = montant_recu + ? WHERE id = ?", (verse, e["id"]))
        self.mettre_a_jour_statuts()
        return {"recu": ref, "montant": montant, "simule": True, "credit": self.credit(cr)}

    def mettre_a_jour_statuts(self):
        auj = self.maintenant().date().isoformat()
        self.db.execute("UPDATE echeances SET statut = CASE "
                        "WHEN montant_recu >= montant_attendu THEN 'payee' "
                        "WHEN date_due < ? THEN 'en_retard' "
                        "WHEN montant_recu > 0 THEN 'partielle' ELSE 'a_venir' END", (auj,))

    def intervenir(self, echeance_id: int, auteur: str, motif: str, nouvelle_date: str | None = None, statut: str | None = None) -> dict:
        e = self.un("SELECT * FROM echeances WHERE id = ?", echeance_id)
        if not e:
            raise ErreurMetier(404, "échéance inconnue")
        if not motif or len(motif.strip()) < 10:
            raise ErreurMetier(422, "motif obligatoire (10 caractères au moins)")
        avant = json.dumps({"date_due": e["date_due"], "statut": e["statut"]})
        if nouvelle_date:
            self.db.execute("UPDATE echeances SET date_due = ? WHERE id = ?", (nouvelle_date, echeance_id))
        if statut:
            self.db.execute("UPDATE echeances SET statut = ? WHERE id = ?", (statut, echeance_id))
        else:
            self.mettre_a_jour_statuts()
        apres = self.un("SELECT date_due, statut FROM echeances WHERE id = ?", echeance_id)
        self.db.execute("INSERT INTO interventions (echeance_id, auteur, avant, apres, motif, horodatage) VALUES (?,?,?,?,?,?)",
                        (echeance_id, auteur, avant, json.dumps(apres), motif.strip(), self._iso()))
        return apres

    # ---------- relances éthiques ----------
    def executer_relances(self) -> list[dict]:
        now = self.maintenant()
        if now.hour not in HEURES_OK:
            return []
        envoyees = []
        rows = self.q("SELECT e.*, c.commercant_id, m.canal, m.nom, m.telephone FROM echeances e JOIN credits c ON c.id = e.credit_id "
                      "JOIN commercants m ON m.id = c.commercant_id WHERE e.statut != 'payee'")
        for e in rows:
            due = datetime.fromisoformat(e["date_due"]).date()
            ecart = (now.date() - due).days
            deja = self.q("SELECT horodatage FROM relances WHERE echeance_id = ?", e["id"])
            if len(deja) >= MAX_RELANCES:
                continue
            jours_deja = {(datetime.fromisoformat(r["horodatage"]).date() - due).days for r in deja}
            reste = e["montant_attendu"] - e["montant_recu"]
            montant = f"{reste:,}".replace(",", " ")
            prenom = e["nom"].split()[0]
            if -2 <= ecart < 0 and not any(j < 0 for j in jours_deja):
                msg = f"Bonjour {prenom}, petit rappel : votre échéance de {montant} FCFA arrive le {due:%d/%m}. Merci et bonne vente !"
            elif ecart in (1, 3, 7) and ecart not in jours_deja:
                msg = (f"Bonjour {prenom}, votre échéance du {due:%d/%m} ({montant} FCFA) n'est pas encore réglée. "
                       "Si vous rencontrez une difficulté, répondez à ce message : nous pouvons en parler.")
            else:
                continue
            self.notif.envoyer(e["canal"], e["telephone"], msg)  # destinataire : le commerçant seul, jamais l'entourage
            self.db.execute("INSERT INTO relances (echeance_id, canal, message, horodatage, envoye) VALUES (?,?,?,?,0)",
                            (e["id"], e["canal"], msg, self._iso()))
            envoyees.append({"echeance_id": e["id"], "canal": e["canal"], "message": msg})
        return envoyees

    # ---------- portefeuille, paramètres, journal ----------
    def portefeuille(self, inst: str | None = None) -> dict:
        auj = self.maintenant().date()
        credits = self.q("SELECT id FROM credits WHERE (? IS NULL OR institution_id = ?)", inst, inst)
        lignes, encours, encours30, du_echu, recu_echu = [], 0, 0, 0, 0
        for k in credits:
            c = self.credit(k["id"])
            retard = [e for e in c["echeances"] if e["statut"] in ("en_retard",)]
            jours = max(((auj - datetime.fromisoformat(e["date_due"]).date()).days for e in retard), default=0)
            encours += c["restant"]
            if jours > 30:
                encours30 += c["restant"]
            for e in c["echeances"]:
                if datetime.fromisoformat(e["date_due"]).date() <= auj:
                    du_echu += e["montant_attendu"]; recu_echu += e["montant_recu"]
            m = self.un("SELECT nom FROM commercants WHERE id = ?", c["commercant_id"])
            lignes.append({"credit_id": c["id"], "commercant": m["nom"], "montant": c["montant"], "restant": c["restant"],
                           "payees": sum(e["statut"] == "payee" for e in c["echeances"]),
                           "en_retard": len(retard), "partielles": sum(e["statut"] == "partielle" for e in c["echeances"]),
                           "jours_retard": jours, "echeances": len(c["echeances"]), "relances": len(c["relances"])})
        relances = self.q("SELECT r.*, e.rang, e.credit_id, m.nom FROM relances r JOIN echeances e ON e.id = r.echeance_id "
                          "JOIN credits c ON c.id = e.credit_id JOIN commercants m ON m.id = c.commercant_id "
                          "WHERE (? IS NULL OR c.institution_id = ?) ORDER BY r.id DESC LIMIT 30", inst, inst)
        retards = self.q("SELECT e.id, e.rang, e.date_due, e.montant_attendu, e.montant_recu, e.credit_id, m.nom FROM echeances e "
                         "JOIN credits c ON c.id = e.credit_id JOIN commercants m ON m.id = c.commercant_id "
                         "WHERE e.statut = 'en_retard' AND (? IS NULL OR c.institution_id = ?) ORDER BY e.date_due", inst, inst)
        return {"maintenant": self._iso(), "relances": relances, "retards": retards, "credits": lignes, "encours": encours, "par30": round(encours30 / encours, 4) if encours else 0.0,
                "taux_recouvrement": round(recu_echu / du_echu, 4) if du_echu else None,
                "part_en_retard": round(sum(l["restant"] for l in lignes if l["en_retard"]) / encours, 4) if encours else 0.0}

    def nouveaux_parametres(self, inst: str, auteur: str, **kw) -> dict:
        p = self.parametres(inst)
        nv = {k: kw.get(k, p[k]) for k in ("m", "s", "n", "i", "percentile", "seuil_risque")}
        try:
            self.db.execute("INSERT INTO parametres_moteur (institution_id, m, s, n, i, percentile, seuil_risque, auteur, cree_le) "
                            "VALUES (?,?,?,?,?,?,?,?,?)", (inst, *nv.values(), auteur, self._iso()))
        except sqlite3.IntegrityError:
            raise ErreurMetier(422, "paramètre hors bornes")
        return self.parametres(inst)

    def historique_parametres(self, inst: str) -> list[dict]:
        return self.q("SELECT * FROM parametres_moteur WHERE institution_id = ? ORDER BY id DESC", inst)

    def journal(self, limite: int = 200, inst: str | None = None, expurge: bool = False) -> list[dict]:
        """Journal d'une institution, ou vue d'administration (`expurge`) : qui, quand, quoi, sans contenu de dossier."""
        ev = [{"type": "decision", "horodatage": r["horodatage"], "acteur": r["auteur"], "dossier_id": r["dossier_id"], "institution_id": r["inst"],
               "detail": f"{r['type']} — proposé {_f(r['montant_propose'])}, décidé {_f(r['montant_decide'])} — « {r['motif']} » "
                         f"(moteur {r['version_moteur']}, graine {r['graine']})"}
              for r in self.q("SELECT x.*, d.institution_id AS inst FROM decisions x JOIN dossiers d ON d.id = x.dossier_id")]
        ev += [{"type": "acces", "horodatage": r["horodatage"], "acteur": r["acteur"], "dossier_id": r["dossier_id"], "institution_id": r["inst"], "detail": r["action"]}
               for r in self.q("SELECT x.*, d.institution_id AS inst FROM journal_acces x LEFT JOIN dossiers d ON d.id = x.dossier_id")]
        ev += [{"type": "intervention", "horodatage": r["horodatage"], "acteur": r["auteur"], "dossier_id": None, "institution_id": r["inst"],
                "detail": f"échéance {r['echeance_id']} : {r['avant']} → {r['apres']} — « {r['motif']} »"}
               for r in self.q("SELECT x.*, c.institution_id AS inst FROM interventions x JOIN echeances e ON e.id = x.echeance_id "
                               "JOIN credits c ON c.id = e.credit_id")]
        ev += [{"type": "parametres", "horodatage": r["cree_le"], "acteur": r["auteur"], "dossier_id": None, "institution_id": r["institution_id"],
                "detail": f"{r['institution_id']} : m={r['m']} s={r['s']} n={r['n']} i={r['i']} p{r['percentile']:g} seuil={r['seuil_risque']}"}
               for r in self.q("SELECT * FROM parametres_moteur")]
        ev += [{"type": "consentement", "horodatage": r["horodatage"], "acteur": r["commercant_id"], "dossier_id": None, "institution_id": r["institution_id"],
                "detail": f"{r['action']} pour {r['institution_id']}"} for r in self.q("SELECT * FROM consentements")]
        if inst:
            ev = [e for e in ev if e["institution_id"] == inst]
        if expurge:
            libelles = {"decision": "Décision enregistrée", "acces": "Dossier consulté", "intervention": "Échéance modifiée",
                        "parametres": "Nouvelle version de paramètres", "consentement": "Consentement modifié"}
            ev = [{**e, "dossier_id": None, "detail": libelles[e["type"]],
                   "acteur": "commerçant" if e["type"] == "consentement" else e["acteur"]} for e in ev]
        return sorted(ev, key=lambda e: e["horodatage"], reverse=True)[:limite]

    def apercu_admin(self) -> dict:
        """Supervision de la plateforme : volumes agrégés par institution, sans dossier nominatif ni valeur de paramètre."""
        lignes = []
        for i in self.q("SELECT id, nom FROM institutions ORDER BY nom"):
            lignes.append({**i,
                           "dossiers": self.un("SELECT COUNT(*) n FROM dossiers WHERE institution_id = ?", i["id"])["n"],
                           "a_traiter": self.un("SELECT COUNT(*) n FROM dossiers WHERE institution_id = ? AND statut IN ('recu','en_analyse','complement')", i["id"])["n"],
                           "credits": self.un("SELECT COUNT(*) n FROM credits WHERE institution_id = ?", i["id"])["n"],
                           "versions_parametres": self.un("SELECT COUNT(*) n FROM parametres_moteur WHERE institution_id = ?", i["id"])["n"]})
        return {"maintenant": self._iso(), "version_moteur": VERSION, "institutions": lignes,
                "commercants": self.un("SELECT COUNT(*) n FROM commercants")["n"],
                "dossiers": sum(l["dossiers"] for l in lignes), "credits": sum(l["credits"] for l in lignes),
                "journal": self.journal(40, expurge=True)}

    def institutions(self) -> list[dict]:
        return self.q("SELECT id, nom FROM institutions ORDER BY nom")  # liste publique : jamais les paramètres
