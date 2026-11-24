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

import secrets  # noqa: E402

import numpy as np  # noqa: E402
from kwedo_engine import VERSION, Parametres, analyser, echeance  # noqa: E402
from kwedo_engine.moteur import FREQUENCES_EPROUVEES  # noqa: E402
from kwedo_engine.moteur import FREQUENCES, PERIODE, SEMAINES_PAR_MOIS, l_max, serie_periode  # noqa: E402

from .connecteurs import EmecefSimule, NotificationsSimulees, OperateurSimule  # noqa: E402

MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations"
DEMO = RACINE / "data/demo/demo.json"
DEBUT_DEMO = "2026-11-23T10:00:00"
MAX_RELANCES = 3
HEURES_OK = range(8, 20)
# Modalités de démonstration (ADR 0015) : fréquences acceptées, durée min/max en mois, délai de versement annoncé.
MODALITES_DEMO = {
    "inst-lagune": ("hebdomadaire,mensuelle", 3, 12, 48),
    "inst-baobab": ("mensuelle", 6, 12, 72),
    "inst-solidaire": ("hebdomadaire,quinzaine", 3, 6, 24),
}
CODE_VALIDITE_MIN = 10
CODE_ESSAIS_MAX = 5
ECHEANCE_DE = {"hebdomadaire": "échéance", "quinzaine": "échéance", "mensuelle": "mensualité"}
RAPPEL_AVANT_JOURS = {"hebdomadaire": 2, "quinzaine": 3, "mensuelle": 5}
# Demande libre (ADR 0017) : objet du crédit par catégorie + une phrase ; borne haute de saisie (anti-faute de frappe).
CATEGORIES_OBJET = {"stock": "Achat de stock", "equipement": "Équipement", "fonds_roulement": "Fonds de roulement",
                    "ponctuel": "Besoin ponctuel", "autre": "Autre"}
OBJET_MAX = 200
MONTANT_DEMANDE_MIN, MONTANT_DEMANDE_MAX = 5_000, 50_000_000
DUREES_REPERES = (3, 6, 9, 12)
# Démo : montants demandés (multiples du plafond, certains au-dessus) et objets variés pour la file de la console.
DEMANDES_DEMO = [
    (0.8, "stock", "Acheter des pagnes wax avant les fêtes de fin d'année."),
    (1.4, "equipement", "Un congélateur pour garder le poisson plus longtemps."),
    (0.5, "fonds_roulement", "Avancer les achats de la semaine pendant la saison creuse."),
    (1.0, "stock", "Recharger le stock de téléphones et d'accessoires."),
    (1.8, "equipement", "Une machine à coudre électrique pour l'atelier."),
    (0.6, "ponctuel", "Réparer le toit de la boutique avant la saison des pluies."),
    (1.2, "autre", "Ouvrir un second point de vente au marché de Cotonou."),
]
# Profils à risque (formule hors des écrans, palette contrastée) : demande en multiple du plafond prudent,
# institutions où le dossier est déposé. Le risque de la demande est celui que calcule le moteur.
DEMANDES_RISQUE = {
    "com-hounkpe": (1.4, "stock", "Doubler le stock de wax pour rattraper la baisse des ventes.", ("inst-lagune",)),
    "com-yaba": (1.5, "equipement", "Une vitrine réfrigérée pour les crèmes et parfums.", ("inst-lagune", "inst-baobab")),
}
CHAMPS_PARAMETRES = ("m", "s", "n", "i", "percentile", "seuil_risque", "frequences", "duree_min_mois", "duree_max_mois", "delai_versement_h")


def _empreinte(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def parametres_dossier(params: dict, frequence: str | None, duree_mois: int | None, duree_semaines: int | None = None) -> Parametres:
    """Paramètres effectifs d'un dossier : ceux de l'analyse, avec les modalités retenues (fréquence, durée).
    Hebdomadaire sans durée en mois : n semaines (comportement d'avant l'ADR 0015)."""
    d = {**params, "frequence": frequence or "hebdomadaire", "duree_mois": duree_mois}
    if duree_mois is None and duree_semaines:
        d["n"] = duree_semaines
    return Parametres.depuis(d)


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


# Formule hors des écrans : la raison moteur « formule » est dite en mots, sans la nommer ni citer s.
RAISON_FORMULE = ("Les règles de remboursement de l'institution limitent la part de vos encaissements consacrée au remboursement : "
                  "au-delà, vos ventes ne permettent pas de rembourser prudemment.")


def raisons_commercant(raisons: list[dict]) -> list[dict]:
    """Le texte moteur de la raison « formule » cite la part prélevable s et nomme la formule : remplacé à l'écran
    (commerçant et console ; le dossier stocké et le journal d'audit gardent le texte moteur)."""
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

    def _nom_institution(self, inst: str) -> str:
        return self.un("SELECT nom FROM institutions WHERE id = ?", inst)["nom"]

    def modalites(self, inst: str) -> dict:
        """Modalités commerciales proposées au commerçant (pas les réglages internes du moteur)."""
        p = self.parametres(inst)
        return {"frequences": [f for f in p["frequences"].split(",") if f], "duree_min_mois": p["duree_min_mois"],
                "duree_max_mois": p["duree_max_mois"], "delai_versement_h": p["delai_versement_h"]}

    def termes(self, inst: str, frequence: str | None = None, duree_mois: int | None = None) -> dict:
        """Paramètres moteur de l'institution + fréquence et durée choisies, contrôlées contre ses modalités.
        Sans choix : hebdomadaire sur n semaines si l'institution l'accepte (inchangé), sinon sa première fréquence."""
        p = self.parametres(inst)
        mod = self.modalites(inst)
        f = frequence or ("hebdomadaire" if "hebdomadaire" in mod["frequences"] else mod["frequences"][0])
        if f not in mod["frequences"]:
            raise ErreurMetier(422, "fréquence non proposée par cette institution")
        lo, hi = mod["duree_min_mois"], mod["duree_max_mois"]
        if duree_mois is None:
            mois_n = p["n"] / SEMAINES_PAR_MOIS
            if not (f == "hebdomadaire" and lo - 0.05 <= mois_n <= hi + 0.05):
                duree_mois = int(min(hi, max(lo, round(mois_n))))
        elif not lo <= duree_mois <= hi:
            raise ErreurMetier(422, f"durée entre {lo} et {hi} mois pour cette institution")
        return {**p, "frequence": f, "duree_mois": duree_mois}

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
            mod = MODALITES_DEMO.get(inst["id"], ("hebdomadaire", 3, 12, 48))
            self.db.execute("INSERT INTO parametres_moteur (institution_id, m, s, n, i, percentile, seuil_risque, auteur, cree_le, "
                            "frequences, duree_min_mois, duree_max_mois, delai_versement_h) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                            (inst["id"], pr["m"], pr["s"], pr["n"], pr["i"], pr["percentile"], pr["seuil_risque"],
                             "configuration-demo", DEBUT_DEMO, *mod))
        for c in d["commercants"]:
            self._inserer_commercant(c["id"], c["nom"], c["telephone"], c["type_activite"], c["compte_separe"], c["transactions"])
        # File de la console : tous les commerçants sauf la persona (elle enverra son dossier pendant la démo).
        for k, c in enumerate(d["commercants"][1:]):
            fois, cat, objet, insts = DEMANDES_RISQUE.get(c["id"], (*DEMANDES_DEMO[k % len(DEMANDES_DEMO)], ("inst-lagune",)))
            for inst in insts:
                self.consentir(c["id"], inst, "accorde")
                plafond = self.estimation(c["id"], inst)["plafond"] or 100_000
                self.envoyer_dossier(c["id"], inst, montant=max(MONTANT_DEMANDE_MIN, round(plafond * fois / 5_000) * 5_000),
                                     categorie=cat, objet=objet)
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

    def estimation(self, cid: str, inst: str = "inst-lagune", choc: float = 0.0, souhait: int | None = None,
                   frequence: str | None = None, duree_mois: int | None = None) -> dict:
        self.commercant(cid)
        if not -0.9 <= choc <= 0:
            raise ErreurMetier(422, "choc_ventes entre -0,9 et 0")
        p = self.termes(inst, frequence, duree_mois)
        res = analyser(self.transactions(cid), p, graine=_g(cid, inst), choc_ventes=choc, montant_souhaite=souhait)
        res["institution_id"] = inst
        res["institution"] = self._nom_institution(inst)  # « aux conditions de … » : jamais un plafond sans ses conditions
        res["modalites"] = self.modalites(inst)
        # Le commerçant ne voit jamais les alertes de manipulation : elles vont à l'agent.
        res.pop("alertes"); res.pop("modeles")
        # Réglages internes de l'institution (m, s, percentile, seuil, L_max) et risque simulé R : ils ne sortent pas
        # vers l'espace commerçant. Seul un indicateur binaire « au-dessus du seuil » accompagne le montant souhaité.
        if res.get("souhait"):
            res["souhait"]["au_dessus_du_seuil"] = res["souhait"].pop("risque") > p["seuil_risque"]
            res["souhait"]["manque"] = manque_commercant(res["souhait"]["manque"], res["encaissement_prudent"])
        res["raisons"] = raisons_commercant(res["raisons"])
        res["parametres"] = {k: res["parametres"][k] for k in ("n", "i", "frequence", "duree_mois")}
        for interne in ("l_max", "l_simulation", "echeance_supportable", "decote_anciennete", "risque", "recommandation", "graine"):
            res.pop(interne)
        # Côté commerçant : seulement « estimation éprouvée ou non » (fréquence ayant passé le run final, ADR 0016).
        res.pop("risque_valide")
        res["estimation_eprouvee"] = res.pop("risque_eprouve")
        per = PERIODE[res["frequence"]]
        res["chaine_calcul"] = [f"Niveau prudent de vos encaissements : {_f(res['encaissement_prudent'])} par {per}",
                                (f"Échéance pour ce montant : {_f(res['echeance_hebdo'])} par semaine, sur {res['duree_semaines']} semaines"
                                 if res["frequence"] == "hebdomadaire" and not res["parametres"]["duree_mois"] else
                                 f"Échéance pour ce montant : {_f(res['echeance'])} par {per}, {res['nb_echeances']} échéances"),
                                f"Coût total du crédit : {_f(res['cout_total'])}"]
        return res

    def plafonds(self, cid: str, inst: str = "inst-lagune", frequence: str | None = None) -> dict:
        """Plafond selon la durée (3, 6, 9, 12 mois, dans les modalités de l'institution) pour une fréquence : même
        graine que l'estimation. Montre qu'allonger la durée monte le plafond, et ce que cela coûte."""
        self.commercant(cid)
        mod = self.modalites(inst)
        lo, hi = mod["duree_min_mois"], mod["duree_max_mois"]
        durees = sorted({lo, hi} | {d for d in DUREES_REPERES if lo <= d <= hi})
        lignes = []
        for dm in durees:
            p = self.termes(inst, frequence, dm)
            r = analyser(self.transactions(cid), p, graine=_g(cid, inst), avec_raisons=False)
            lignes.append({"duree_mois": dm, "plafond": r["plafond"], "echeance": r["echeance"], "nb_echeances": r["nb_echeances"],
                           "cout_total": r["cout_total"]})
        return {"institution_id": inst, "frequence": p["frequence"], "modalites": mod, "lignes": lignes,
                "institution": self._nom_institution(inst)}

    def conseils(self, cid: str, inst: str = "inst-lagune", frequence: str | None = None, duree_mois: int | None = None) -> dict:
        """Leviers chiffrés par le moteur sur des scénarios modifiés (même graine que l'estimation), pour la
        fréquence et la durée choisies (affichées en haut de la page)."""
        from .conseils import calculer
        self.commercant(cid)
        p = self.termes(inst, frequence, duree_mois)
        retard = self.un("SELECT COUNT(*) AS n FROM echeances e JOIN credits c ON c.id = e.credit_id "
                         "WHERE c.commercant_id = ? AND e.statut = 'en_retard'", cid)["n"]
        return {**calculer(self.transactions(cid), p, _g(cid, inst), retard), "institution_id": inst,
                "frequence": p["frequence"], "duree_mois": p["duree_mois"], "duree_semaines": Parametres.depuis(p).horizon,
                "modalites": self.modalites(inst), "institution": self._nom_institution(inst)}

    def tableau_de_bord(self, cid: str) -> dict:
        c = self.commercant(cid)
        est = self.estimation(cid) if c["nb_transactions"] else None
        credits = self.q("SELECT id FROM credits WHERE commercant_id = ?", cid)
        return {"commercant": c, "estimation": est, "credits": [self.credit(k["id"]) for k in credits],
                "dossiers": self.q("SELECT d.id, d.institution_id, i.nom AS institution, d.statut, d.montant_offre, d.duree_offre, d.cree_le, d.frequence, d.duree_mois, "
                                   "d.montant_demande, d.objet_categorie "
                                   "FROM dossiers d JOIN institutions i ON i.id = d.institution_id WHERE commercant_id = ? ORDER BY d.cree_le", cid)}

    # ---------- consentements ----------
    def consentir(self, cid: str, inst: str, action: str) -> dict:
        if action not in ("accorde", "retire"):
            raise ErreurMetier(422, "action : accorde ou retire")
        self.commercant(cid); self.parametres(inst)
        self.db.execute("INSERT INTO consentements (commercant_id, institution_id, action, horodatage) VALUES (?,?,?,?)",
                        (cid, inst, action, self._iso()))
        return {"commercant_id": cid, "institution_id": inst, "actif": action == "accorde"}

    # ---------- signature par code SMS (simulé) ----------
    def emettre_code(self, cid: str, inst: str) -> dict:
        """Code à 6 chiffres, valable 10 minutes (horloge simulée). Démo : renvoyé pour être affiché à l'écran ;
        en production il partirait seulement par SMS et ne serait jamais renvoyé par l'API."""
        c = self.commercant(cid)
        self.parametres(inst)
        code = f"{secrets.randbelow(10**6):06d}"
        now = self.maintenant()
        expire = self._iso(now + timedelta(minutes=CODE_VALIDITE_MIN))
        self.db.execute("INSERT INTO codes_sms (commercant_id, institution_id, empreinte, emis_le, expire_le) VALUES (?,?,?,?,?)",
                        (cid, inst, _empreinte(code), self._iso(now), expire))
        self.notif.envoyer("sms", c["telephone"], f"Kwedo : votre code de signature est {code}. Ne le donnez à personne.")
        return {"code": code, "expire_le": expire, "simule": True}

    def verifier_code(self, cid: str, inst: str, code: str, objet: str) -> None:
        """Le dernier code émis pour cette institution, non expiré, non utilisé, moins de 5 essais. Tout essai est tracé."""
        c = self.un("SELECT * FROM codes_sms WHERE commercant_id = ? AND institution_id = ? ORDER BY id DESC LIMIT 1", cid, inst)
        ok = False
        if c:
            essais = self.q("SELECT resultat FROM signatures WHERE code_id = ?", c["id"])
            utilisable = (c["expire_le"] >= self._iso() and not any(e["resultat"] == "valide" for e in essais)
                          and len(essais) < CODE_ESSAIS_MAX)
            ok = utilisable and secrets.compare_digest(c["empreinte"], _empreinte(str(code or "").strip()))
        self.db.execute("INSERT INTO signatures (code_id, commercant_id, institution_id, resultat, objet, horodatage) VALUES (?,?,?,?,?,?)",
                        (c["id"] if c else None, cid, inst, "valide" if ok else "refuse", objet, self._iso()))
        if not ok:
            raise ErreurMetier(403, "code SMS incorrect ou expiré : demandez un nouveau code")

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
    @staticmethod
    def valider_demande(montant, categorie, objet) -> tuple[int, str, str]:
        """Demande libre (ADR 0017) : montant saisi, catégorie connue, objet en une phrase."""
        try:
            montant = int(montant)
        except (TypeError, ValueError):
            raise ErreurMetier(422, "montant demandé obligatoire")
        if not MONTANT_DEMANDE_MIN <= montant <= MONTANT_DEMANDE_MAX:
            raise ErreurMetier(422, f"montant demandé entre {_f(MONTANT_DEMANDE_MIN)} et {_f(MONTANT_DEMANDE_MAX)}")
        if categorie not in CATEGORIES_OBJET:
            raise ErreurMetier(422, "objet du crédit : catégorie inconnue")
        objet = " ".join(str(objet or "").split())
        if not objet:
            raise ErreurMetier(422, "objet du crédit obligatoire : dites en une phrase à quoi il servira")
        if len(objet) > OBJET_MAX:
            raise ErreurMetier(422, f"objet du crédit : {OBJET_MAX} caractères au plus")
        return montant, categorie, objet

    def envoyer_dossier(self, cid: str, inst: str, frequence: str | None = None, duree_mois: int | None = None,
                        montant=None, categorie=None, objet=None) -> dict:
        if not self.consentement_actif(cid, inst):
            raise ErreurMetier(403, "pas de consentement actif pour cette institution")
        if not self.transactions(cid):
            raise ErreurMetier(422, "flux non connectés")
        exist = self.un("SELECT id FROM dossiers WHERE commercant_id = ? AND institution_id = ? AND statut IN ('recu','en_analyse','complement','accorde')", cid, inst)
        if exist:
            return self.dossier(exist["id"], acteur=None)
        montant, categorie, objet = self.valider_demande(montant, categorie, objet)
        p = self.termes(inst, frequence, duree_mois)
        did = f"dos-{_g(cid, inst, self._iso()) % 10**6:06d}"
        graine = _g(did)
        # Une seule analyse : plafond prudent ET risque pour le montant demandé (rejouable avec la même graine).
        res = analyser(self.transactions(cid), p, graine=graine, montant_souhaite=montant)
        self.db.execute("INSERT INTO dossiers (id, commercant_id, institution_id, statut, analyse_json, version_moteur, graine, parametres_id, cree_le, "
                        "frequence, duree_mois, frequence_demandee, duree_mois_demandee, montant_demande, objet_categorie, objet_texte) "
                        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        (did, cid, inst, "recu", json.dumps(res), VERSION, graine, p["id"], self._iso(),
                         p["frequence"], p["duree_mois"], p["frequence"], p["duree_mois"], montant, categorie, objet))
        return self.dossier(did, acteur=None)

    def evaluer(self, did: str, montant: int | None = None, frequence: str | None = None, duree_mois: int | None = None) -> dict:
        """Risque de défaut pour des termes donnés (montant, fréquence, durée dans les modalités de l'institution),
        avec la graine et les paramètres du dossier. Sert à la demande, à la contre-proposition et à la décision."""
        d = self.un("SELECT * FROM dossiers WHERE id = ?", did)
        if not d:
            raise ErreurMetier(404, "dossier inconnu")
        a = json.loads(d["analyse_json"])
        f = frequence or d["frequence_demandee"]
        dm = duree_mois if duree_mois is not None else d["duree_mois_demandee"]
        if frequence or duree_mois is not None:
            t = self.termes(d["institution_id"], f, dm)
            f, dm = t["frequence"], t["duree_mois"]
        montant = montant if montant is not None else (d["montant_demande"] or a["plafond"])
        if not MONTANT_DEMANDE_MIN <= montant <= MONTANT_DEMANDE_MAX:
            raise ErreurMetier(422, f"montant entre {_f(MONTANT_DEMANDE_MIN)} et {_f(MONTANT_DEMANDE_MAX)}")
        p = parametres_dossier(a["parametres"], f, dm, a["duree_semaines"] if dm is None else None)
        r = analyser(self.transactions(d["commercant_id"]), p, graine=d["graine"], montant_souhaite=montant, avec_raisons=False)
        s, seuil = r["souhait"], p.seuil_risque
        e_pl = r["echeance"]
        return {"montant": montant, "frequence": f, "duree_mois": dm, "duree_semaines": r["duree_semaines"],
                "nb_echeances": r["nb_echeances"], "echeance": s["echeance"], "cout_total": s["cout_total"],
                "risque": s["risque"], "seuil_risque": seuil, "dans_tolerance": s["risque"] <= seuil,
                "plafond": r["plafond"], "risque_plafond": r["risque"], "echeance_plafond": e_pl,
                "plafond_formule": r["l_max"], "encaissement_prudent": r["encaissement_prudent"],
                "part_mauvaise_periode": s["part_mauvaise_periode"], "raisons": s["raisons"], "risque_valide": r["risque_valide"]}

    def file(self, inst: str | None = None, statut: str | None = None, tri: str = "priorite") -> list[dict]:
        rows = self.q("SELECT d.id, d.commercant_id, c.nom, c.type_activite, d.institution_id, d.statut, d.cree_le, d.analyse_json, "
                      "d.frequence, d.duree_mois, d.montant_demande, d.objet_categorie "
                      "FROM dossiers d JOIN commercants c ON c.id = d.commercant_id "
                      "WHERE (? IS NULL OR d.institution_id = ?) AND (? IS NULL OR d.statut = ?)", inst, inst, statut, statut)
        out = []
        for r in rows:
            a = json.loads(r.pop("analyse_json"))
            # Risque de la DEMANDE (ADR 0017) ; dossiers antérieurs sans montant demandé : risque au plafond.
            rd = a["souhait"]["risque"] if a.get("souhait") else a["risque"]
            r.update({"plafond": a["plafond"], "risque": a["risque"], "recommandation": a["recommandation"],
                      "risque_demande": rd, "dans_tolerance": rd <= a["parametres"]["seuil_risque"],
                      "alertes": [x["code"] for x in a["alertes"]], "provisoire": a["provisoire"],
                      "semaines": a["indicateurs"]["semaines"], "consentement_actif": self.consentement_actif(r["commercant_id"], r["institution_id"])})
            out.append(r)
        ordre = {"recu": 0, "en_analyse": 0, "complement": 1}
        if tri == "anciennete":
            out.sort(key=lambda r: r["cree_le"])
        elif tri == "risque":  # les demandes les plus risquées d'abord
            out.sort(key=lambda r: (-r["risque_demande"], r["cree_le"]))
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
        d["analyse"]["raisons"] = raisons_commercant(d["analyse"]["raisons"])
        d["commercant"] = self.commercant(d["commercant_id"])
        d["institution"] = self.un("SELECT * FROM institutions WHERE id = ?", d["institution_id"])
        d["consentement_actif"] = self.consentement_actif(d["commercant_id"], d["institution_id"])
        d["modalites"] = self.modalites(d["institution_id"])
        d["decisions"] =self.q("SELECT * FROM decisions WHERE dossier_id = ? ORDER BY id", did)
        d["credit"] = self.un("SELECT id FROM credits WHERE dossier_id = ?", did)
        d["acces"] = self.q("SELECT acteur, action, horodatage FROM journal_acces WHERE dossier_id = ? ORDER BY id DESC LIMIT 20", did)
        d["demande"] = self.evaluer(did)  # risque de la demande, plafond prudent en repère
        d["objet_libelle"] = CATEGORIES_OBJET.get(d["objet_categorie"] or "", None)
        return d

    def decider(self, did: str, type_: str, auteur: str, motif: str, montant: int | None = None, duree: int | None = None,
                frequence: str | None = None, duree_mois: int | None = None) -> dict:
        d = self.dossier(did, acteur=None)
        if d["statut"] not in ("recu", "en_analyse", "complement"):
            raise ErreurMetier(409, f"dossier déjà {d['statut']}")
        if type_ not in ("valide", "ajuste", "refuse", "complement"):
            raise ErreurMetier(422, "type de décision inconnu")
        if not motif or len(motif.strip()) < 10:
            raise ErreurMetier(422, "justificatif obligatoire (10 caractères au moins)")
        a = d["analyse"]
        f, dm = d["frequence"], d["duree_mois"]
        demande = d["montant_demande"]
        risque = None
        if type_ == "valide":
            # Accorder la demande telle quelle (ADR 0017) ; dossier antérieur sans montant demandé : le plafond.
            montant, duree = demande or a["plafond"], a["duree_semaines"]
            risque = d["demande"]["risque"]
        if type_ == "ajuste":  # contre-proposition
            if not montant or montant <= 0:
                raise ErreurMetier(422, "montant décidé obligatoire")
            if frequence or duree_mois:  # l'agent ajuste les modalités dans les limites de l'institution
                t = self.termes(d["institution_id"], frequence or f, duree_mois or dm)
                f, dm = t["frequence"], t["duree_mois"]
            p = parametres_dossier(a["parametres"], f, dm, duree if (duree and not dm) else None)
            # Plafond de la formule pour ces modalités : C_p recalculé à la période depuis la série enregistrée.
            if f == a["parametres"].get("frequence", "hebdomadaire"):
                c_p = a["encaissement_prudent"]
            else:
                serie = np.asarray(a["serie_hebdo"], float)
                c_p = float(np.percentile(serie_periode(serie, p), p.percentile)) if len(serie) else 0.0
            plafond_formule = l_max(c_p, p)
            # Jamais plus que demandé ; au-dessus de la formule seulement pour rester sous le montant demandé.
            borne = max(plafond_formule, demande or 0)
            if montant > borne:
                raise ErreurMetier(422, (f"contre-proposition au-dessus du montant demandé ({_f(demande)})" if demande and demande >= plafond_formule
                                         else f"montant au-dessus du plafond de la formule ({round(plafond_formule)} FCFA)"))
            if demande and montant > demande:
                raise ErreurMetier(422, f"contre-proposition au-dessus du montant demandé ({_f(demande)})")
            duree = p.horizon
            risque = self.evaluer(did, montant, f, dm)["risque"]
        if type_ in ("refuse", "complement"):
            montant, duree = None, None
        self.db.execute("INSERT INTO decisions (dossier_id, type, montant_propose, montant_decide, duree_semaines, auteur, motif, "
                        "version_moteur, parametres_json, graine, horodatage, frequence, duree_mois, montant_demande, risque) "
                        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        (did, type_, a["plafond"], montant, duree, auteur, motif.strip(), d["version_moteur"],
                         json.dumps(a["parametres"]), d["graine"], self._iso(), f if montant else None, dm if montant else None,
                         demande, risque))
        statut = {"valide": "accorde", "ajuste": "accorde", "refuse": "refuse", "complement": "complement"}[type_]
        self.db.execute("UPDATE dossiers SET statut = ?, decide_le = ?, montant_offre = ?, duree_offre = ?, frequence = ?, duree_mois = ? WHERE id = ?",
                        (statut, self._iso(), montant, duree, f, dm, did))
        return self.dossier(did, acteur=None)

    def rejouer(self, did: str) -> dict:
        """Audit : rejoue l'analyse avec la graine et les paramètres enregistrés."""
        d = self.un("SELECT * FROM dossiers WHERE id = ?", did)
        if not d:
            raise ErreurMetier(404, "dossier inconnu")
        stockee = json.loads(d["analyse_json"])  # sortie moteur enregistrée, pas la vue reformulée pour l'écran
        res = analyser(self.transactions(d["commercant_id"]), stockee["parametres"], graine=d["graine"],
                       montant_souhaite=d["montant_demande"])
        return {"identique": json.loads(json.dumps(res)) == stockee, "plafond": res["plafond"]}

    def offre(self, cid: str, did: str) -> dict:
        """Vue commerçant d'un dossier : statut, offre, raisons. Jamais les alertes ni les modèles."""
        d = self.un("SELECT d.*, i.nom AS institution FROM dossiers d JOIN institutions i ON i.id = d.institution_id "
                    "WHERE d.id = ? AND d.commercant_id = ?", did, cid)
        if not d:
            raise ErreurMetier(404, "dossier inconnu")
        a = json.loads(d.pop("analyse_json"))
        dec = self.un("SELECT type, motif, montant_decide, duree_semaines, horodatage FROM decisions WHERE dossier_id = ? ORDER BY id DESC LIMIT 1", did)
        out = {k: d[k] for k in ("id", "institution_id", "institution", "statut", "cree_le", "montant_offre", "duree_offre", "decide_le",
                                 "frequence", "duree_mois", "frequence_demandee", "duree_mois_demandee",
                                 "montant_demande", "objet_categorie", "objet_texte")}
        out["objet_libelle"] = CATEGORIES_OBJET.get(d["objet_categorie"] or "")
        if d["montant_offre"] and d["montant_demande"]:
            # Demande acceptée telle quelle, ou contre-proposition de l'institution (avec l'écart).
            meme = (d["montant_offre"] == d["montant_demande"] and d["frequence"] == d["frequence_demandee"]
                    and d["duree_mois"] == d["duree_mois_demandee"])
            out.update({"nature": "demande_acceptee" if meme else "contre_proposition",
                        "ecart_montant": d["montant_offre"] - d["montant_demande"]})
        out.update({"plafond_estime": a["plafond"], "raisons": raisons_commercant(a["raisons"]), "conseils": a["conseils"],
                    "decision": dec, "credit": self.un("SELECT id FROM credits WHERE dossier_id = ?", did),
                    "delai_versement_h": self.modalites(d["institution_id"])["delai_versement_h"],
                    "estimation_eprouvee": d["frequence"] in FREQUENCES_EPROUVEES})
        if d["montant_offre"]:
            p = parametres_dossier(a["parametres"], d["frequence"], d["duree_mois"], d["duree_offre"])
            e = echeance(d["montant_offre"], p)
            out.update({"echeance": round(e), "cout_total": round(e * p.nb - d["montant_offre"]), "taux_periode": p.ip,
                        "nb_echeances": p.nb})
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
        p = parametres_dossier(d["analyse"]["parametres"], d["frequence"], d["duree_mois"], d["duree_offre"])
        cr = f"cre-{did[4:]}"
        now = self.maintenant()
        self.db.execute("INSERT INTO credits (id, dossier_id, commercant_id, institution_id, montant, duree_semaines, taux_periode, decaisse_le, frequence) "
                        "VALUES (?,?,?,?,?,?,?,?,?)", (cr, did, d["commercant_id"], d["institution_id"], montant, p.horizon, p.ip, self._iso(), p.frequence))
        e = round(echeance(montant, p))
        for k in range(1, p.nb + 1):  # une échéance par période choisie : 7, 14 ou ≈ 30,3 jours
            self.db.execute("INSERT INTO echeances (credit_id, rang, date_due, montant_attendu, statut) VALUES (?,?,?,?,'a_venir')",
                            (cr, k, (now + timedelta(days=round(7 * p.w * k))).date().isoformat(), e))
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
        rows = self.q("SELECT e.*, c.commercant_id, c.frequence, m.canal, m.nom, m.telephone FROM echeances e JOIN credits c ON c.id = e.credit_id "
                      "JOIN commercants m ON m.id = c.commercant_id WHERE e.statut != 'payee'")
        for e in rows:
            # Rappel calé sur le rythme du crédit : 2 jours avant une échéance hebdomadaire, 3 avant une quinzaine, 5 avant un mois.
            avant = RAPPEL_AVANT_JOURS[e["frequence"]]
            nom_ech = ECHEANCE_DE[e["frequence"]]
            due = datetime.fromisoformat(e["date_due"]).date()
            ecart = (now.date() - due).days
            deja = self.q("SELECT horodatage FROM relances WHERE echeance_id = ?", e["id"])
            if len(deja) >= MAX_RELANCES:
                continue
            jours_deja = {(datetime.fromisoformat(r["horodatage"]).date() - due).days for r in deja}
            reste = e["montant_attendu"] - e["montant_recu"]
            montant = f"{reste:,}".replace(",", " ")
            prenom = e["nom"].split()[0]
            if -avant <= ecart < 0 and not any(j < 0 for j in jours_deja):
                msg = f"Bonjour {prenom}, petit rappel : votre {nom_ech} de {montant} FCFA arrive le {due:%d/%m}. Merci et bonne vente !"
            elif ecart in (1, 3, 7) and ecart not in jours_deja:
                msg = (f"Bonjour {prenom}, votre {nom_ech} du {due:%d/%m} ({montant} FCFA) n'est pas encore réglée. "
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
        nv = {k: kw.get(k, p[k]) for k in CHAMPS_PARAMETRES}
        fr = nv["frequences"]
        fr = [x.strip() for x in (fr.split(",") if isinstance(fr, str) else fr or [])]
        if not fr or any(x not in FREQUENCES for x in fr):
            raise ErreurMetier(422, "fréquences : au moins une parmi hebdomadaire, quinzaine, mensuelle")
        nv["frequences"] = ",".join(x for x in FREQUENCES if x in fr)  # ordre canonique, sans doublon
        try:
            nv["duree_min_mois"], nv["duree_max_mois"], nv["delai_versement_h"] = (
                int(nv["duree_min_mois"]), int(nv["duree_max_mois"]), int(nv["delai_versement_h"]))
        except (TypeError, ValueError):
            raise ErreurMetier(422, "durées et délai : nombres entiers attendus")
        if nv["duree_min_mois"] > nv["duree_max_mois"]:
            raise ErreurMetier(422, "durée minimale au-dessus de la durée maximale")
        try:
            self.db.execute(f"INSERT INTO parametres_moteur (institution_id, {', '.join(CHAMPS_PARAMETRES)}, auteur, cree_le) "
                            f"VALUES (?, {', '.join('?' * len(CHAMPS_PARAMETRES))}, ?, ?)", (inst, *nv.values(), auteur, self._iso()))
        except sqlite3.IntegrityError:
            raise ErreurMetier(422, "paramètre hors bornes")
        return self.parametres(inst)

    BORNES_APERCU = {"m": (0.05, 1), "s": (0.05, 1), "n": (1, 104), "i": (0.0001, 0.19), "percentile": (1, 50), "seuil_risque": (0.01, 0.5)}

    def apercu_parametres(self, inst: str, **kw) -> dict:
        """Effet d'un réglage proposé, avant enregistrement, sur les dossiers en attente de l'institution :
        plafond prudent moyen et risque moyen de la demande, avant (analyse du dossier) et après (recalcul moteur,
        même graine, mêmes modalités). Rien n'est écrit."""
        actuels = self.parametres(inst)
        nv = {}
        for k, (lo, hi) in self.BORNES_APERCU.items():
            try:
                v = float(kw.get(k, actuels[k]))
            except (TypeError, ValueError):
                raise ErreurMetier(422, f"{k} : nombre attendu")
            if not lo <= v <= hi:
                raise ErreurMetier(422, "paramètre hors bornes")
            nv[k] = int(v) if k in ("n", "percentile") else v
        dossiers = self.q("SELECT id, commercant_id, analyse_json, graine, frequence, duree_mois, montant_demande FROM dossiers "
                          "WHERE institution_id = ? AND statut IN ('recu','en_analyse','complement') ORDER BY cree_le", inst)
        avant, apres = [], []
        for d in dossiers:
            a = json.loads(d["analyse_json"])
            montant = d["montant_demande"] or a["plafond"] or MONTANT_DEMANDE_MIN
            avant.append((a["plafond"], a["souhait"]["risque"] if a.get("souhait") else a["risque"]))
            p = parametres_dossier({**a["parametres"], **nv}, d["frequence"], d["duree_mois"], a["duree_semaines"] if d["duree_mois"] is None else None)
            r = analyser(self.transactions(d["commercant_id"]), p, graine=d["graine"], montant_souhaite=montant, avec_raisons=False)
            apres.append((r["plafond"], r["souhait"]["risque"]))

        def moy(xs, k):
            return round(sum(x[k] for x in xs) / len(xs), 4) if xs else None
        return {"nb_dossiers": len(dossiers), "seuil_risque": {"avant": actuels["seuil_risque"], "apres": nv["seuil_risque"]},
                "plafond_moyen": {"avant": moy(avant, 0), "apres": moy(apres, 0)},
                "risque_moyen": {"avant": moy(avant, 1), "apres": moy(apres, 1)},
                "au_dessus_tolerance": {"avant": sum(x[1] > actuels["seuil_risque"] for x in avant),
                                        "apres": sum(x[1] > nv["seuil_risque"] for x in apres)}}

    def historique_parametres(self, inst: str) -> list[dict]:
        return self.q("SELECT * FROM parametres_moteur WHERE institution_id = ? ORDER BY id DESC", inst)

    def journal(self, limite: int = 200, inst: str | None = None, expurge: bool = False) -> list[dict]:
        """Journal d'une institution, ou vue d'administration (`expurge`) : qui, quand, quoi, sans contenu de dossier."""
        ev = [{"type": "decision", "horodatage": r["horodatage"], "acteur": r["auteur"], "dossier_id": r["dossier_id"], "institution_id": r["inst"],
               "detail": f"{ {'valide': 'demande accordée', 'ajuste': 'contre-proposition'}.get(r['type'], r['type'])} — "
                         f"{'demandé ' + _f(r['montant_demande']) + ', ' if r['montant_demande'] else ''}"
                         f"plafond {_f(r['montant_propose'])}, décidé {_f(r['montant_decide'])}"
                         f"{', risque ' + format(r['risque'], '.1%').replace('.', ',') if r['risque'] is not None else ''} — « {r['motif']} » "
                         f"(moteur {r['version_moteur']}, graine {r['graine']})"}
              for r in self.q("SELECT x.*, d.institution_id AS inst FROM decisions x JOIN dossiers d ON d.id = x.dossier_id")]
        ev += [{"type": "acces", "horodatage": r["horodatage"], "acteur": r["acteur"], "dossier_id": r["dossier_id"], "institution_id": r["inst"], "detail": r["action"]}
               for r in self.q("SELECT x.*, d.institution_id AS inst FROM journal_acces x LEFT JOIN dossiers d ON d.id = x.dossier_id")]
        ev += [{"type": "intervention", "horodatage": r["horodatage"], "acteur": r["auteur"], "dossier_id": None, "institution_id": r["inst"],
                "detail": f"échéance {r['echeance_id']} : {r['avant']} → {r['apres']} — « {r['motif']} »"}
               for r in self.q("SELECT x.*, c.institution_id AS inst FROM interventions x JOIN echeances e ON e.id = x.echeance_id "
                               "JOIN credits c ON c.id = e.credit_id")]
        ev += [{"type": "parametres", "horodatage": r["cree_le"], "acteur": r["auteur"], "dossier_id": None, "institution_id": r["institution_id"],
                "detail": f"{r['institution_id']} : m={r['m']} s={r['s']} n={r['n']} i={r['i']} p{r['percentile']:g} seuil={r['seuil_risque']} "
                          f"fréquences={r['frequences']} durée={r['duree_min_mois']}–{r['duree_max_mois']} mois versement={r['delai_versement_h']} h"}
               for r in self.q("SELECT * FROM parametres_moteur")]
        ev += [{"type": "consentement", "horodatage": r["horodatage"], "acteur": r["commercant_id"], "dossier_id": None, "institution_id": r["institution_id"],
                "detail": f"{r['action']} pour {r['institution_id']}"} for r in self.q("SELECT * FROM consentements")]
        ev += [{"type": "signature", "horodatage": r["horodatage"], "acteur": r["commercant_id"], "dossier_id": None, "institution_id": r["institution_id"],
                "detail": f"code SMS {'validé' if r['resultat'] == 'valide' else 'refusé'} — {r['objet']}"} for r in self.q("SELECT * FROM signatures")]
        if inst:
            ev = [e for e in ev if e["institution_id"] == inst]
        if expurge:
            libelles = {"decision": "Décision enregistrée", "acces": "Dossier consulté", "intervention": "Échéance modifiée",
                        "parametres": "Nouvelle version de paramètres", "consentement": "Consentement modifié",
                        "signature": "Signature par code SMS"}
            ev = [{**e, "dossier_id": None, "detail": libelles[e["type"]],
                   "acteur": "commerçant" if e["type"] in ("consentement", "signature") else e["acteur"]} for e in ev]
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
