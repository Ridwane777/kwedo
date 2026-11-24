"""Console institution organisée par objet (ADR 0019) : demandes, crédits, recouvrement, commerçants.

Toutes les fonctions prennent l'institution de la session (jamais un paramètre client) : le cloisonnement
(ADR 0009) est appliqué dans chaque requête SQL. Listes filtrées, triées et paginées côté serveur.
"""

from __future__ import annotations

import json
import re
import unicodedata
from datetime import date, datetime, timedelta

from .service import ErreurMetier

TAILLE_DEFAUT, TAILLE_MAX = 20, 50
DEFAUT_JOURS = 90  # une échéance impayée depuis plus de 90 jours : crédit en défaut (convention PAR 90)
OFFRE_SANS_REPONSE_JOURS = 3
ONGLETS_DEMANDES = {
    "a_decider": ("recu", "en_analyse"),
    "complement": ("complement",),
    "attente": ("accorde",),
    "traitees": ("refuse", "offre_acceptee", "offre_refusee"),
    "toutes": ("recu", "en_analyse", "complement", "accorde", "refuse", "offre_acceptee", "offre_refusee"),
}
ONGLETS_CREDITS = ("en_cours", "en_retard", "rembourses", "en_defaut", "tous")
STATUT_CREDIT = {"en_cours": "en_cours", "en_retard": "en_retard", "rembourses": "rembourse", "en_defaut": "en_defaut"}
TRANCHES = ("faible", "proche", "au_dessus")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _norm(t: str) -> str:
    return unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode().lower().strip()


def _choix(q: dict, cle: str, permis, defaut=None):
    v = q.get(cle) or defaut
    if v is not None and v not in permis:
        raise ErreurMetier(422, f"{cle} : valeur inconnue ({', '.join(permis)})")
    return v


def _date(q: dict, cle: str):
    v = q.get(cle) or None
    if v is not None:
        if not DATE.match(v):
            raise ErreurMetier(422, f"{cle} : date AAAA-MM-JJ attendue")
        try:
            date.fromisoformat(v)
        except ValueError:
            raise ErreurMetier(422, f"{cle} : date invalide")
    return v


def _booleen(q: dict, cle: str) -> bool:
    v = q.get(cle)
    if v in (None, "", "0", "false"):
        return False
    if v in ("1", "true"):
        return True
    raise ErreurMetier(422, f"{cle} : 1 ou 0")


def _paginer(lignes: list, q: dict) -> dict:
    try:
        page = int(q.get("page") or 1)
        taille = int(q.get("taille") or TAILLE_DEFAUT)
    except ValueError:
        raise ErreurMetier(422, "page et taille : entiers attendus")
    if page < 1 or not 1 <= taille <= TAILLE_MAX:
        raise ErreurMetier(422, f"page ≥ 1 et taille entre 1 et {TAILLE_MAX}")
    total = len(lignes)
    return {"elements": lignes[(page - 1) * taille: page * taille], "total": total, "page": page, "taille": taille,
            "pages": max(1, -(-total // taille))}


def _periode(v: str, du, au) -> bool:
    j = (v or "")[:10]
    return (not du or j >= du) and (not au or j <= au)


def _trier(lignes: list, q: dict, cles: dict, defaut: str):
    tri = _choix(q, "tri", tuple(cles), defaut)
    ordre = _choix(q, "ordre", ("asc", "desc"), "asc" if tri in ("priorite", "nom") else "desc")
    lignes.sort(key=cles[tri], reverse=ordre == "desc")
    return tri, ordre


# ---------- demandes ----------
def lignes_demandes(s, inst: str) -> list[dict]:
    seuil = s.parametres(inst)["seuil_risque"]
    dec = {r["dossier_id"]: r for r in s.q(
        "SELECT x.dossier_id, x.type, x.auteur, x.horodatage, x.montant_decide FROM decisions x JOIN dossiers d ON d.id = x.dossier_id "
        "WHERE d.institution_id = ? ORDER BY x.id", inst)}
    out = []
    for r in s.file(inst):
        a_seuil = r["risque_demande"] / seuil if seuil else 0
        d = dec.get(r["id"])
        out.append({**r, "tranche": "faible" if a_seuil <= 0.5 else "proche" if r["dans_tolerance"] else "au_dessus",
                    "decision": d and d["type"], "decide_par": d and d["auteur"], "decide_le": d and d["horodatage"],
                    "montant_decide": d and d["montant_decide"]})
    return out


def compteurs_demandes(lignes: list) -> dict:
    return {k: sum(l["statut"] in v for l in lignes) for k, v in ONGLETS_DEMANDES.items()}


def demandes(s, inst: str, q: dict) -> dict:
    onglet = _choix(q, "onglet", tuple(ONGLETS_DEMANDES), "a_decider")
    statut = _choix(q, "statut", ONGLETS_DEMANDES["toutes"])
    decision = _choix(q, "decision", ("valide", "ajuste", "refuse", "complement"))
    tranche = _choix(q, "tranche", TRANCHES)
    hors, alertes = _booleen(q, "hors_tolerance"), _booleen(q, "alertes")
    du, au = _date(q, "du"), _date(q, "au")
    texte = _norm(q.get("q", ""))[:80]
    toutes = lignes_demandes(s, inst)
    l = [r for r in toutes if r["statut"] in ONGLETS_DEMANDES[onglet] and (not statut or r["statut"] == statut)
         and (not decision or r["decision"] == decision) and (not tranche or r["tranche"] == tranche)
         and (not hors or not r["dans_tolerance"]) and (not alertes or r["alertes"])
         and _periode(r["cree_le"], du, au) and (not texte or texte in _norm(r["nom"]))]
    ordre_statut = {"recu": 0, "en_analyse": 0, "complement": 1}
    tri, ordre = _trier(l, q, {
        "priorite": lambda r: (ordre_statut.get(r["statut"], 2), -len(r["alertes"]), r["cree_le"]),
        "risque": lambda r: r["risque_demande"], "date": lambda r: r["decide_le"] or r["cree_le"],
        "montant": lambda r: r["montant_demande"] or 0}, "priorite" if onglet == "a_decider" else "date")
    return {**_paginer(l, q), "onglet": onglet, "tri": tri, "ordre": ordre, "compteurs": compteurs_demandes(toutes)}


# ---------- crédits ----------
def _etat_credit(s, c: dict, auj: date) -> dict:
    ech = s.q("SELECT * FROM echeances WHERE credit_id = ? ORDER BY rang", c["id"])
    du = sum(e["montant_attendu"] for e in ech)
    recu = sum(e["montant_recu"] for e in ech)
    retard = [e for e in ech if e["statut"] == "en_retard"]
    jours = max(((auj - date.fromisoformat(e["date_due"])).days for e in retard), default=0)
    statut = ("rembourse" if ech and recu >= du else "en_defaut" if jours > DEFAUT_JOURS
              else "en_retard" if retard else "en_cours")
    echu = [e for e in ech if date.fromisoformat(e["date_due"]) <= auj]
    return {"statut": statut, "restant": du - recu, "total_du": du, "total_recu": recu, "jours_retard": jours,
            "echeances": len(ech), "payees": sum(e["statut"] == "payee" for e in ech), "en_retard": len(retard),
            "du_echu": sum(e["montant_attendu"] for e in echu), "recu_echu": sum(e["montant_recu"] for e in echu),
            "prochaine": next((e["date_due"] for e in ech if e["statut"] != "payee"), None)}


def lignes_credits(s, inst: str) -> list[dict]:
    auj = s.maintenant().date()
    out = []
    for c in s.q("SELECT c.id, c.dossier_id, c.commercant_id, m.nom, c.montant, c.decaisse_le, c.frequence, "
                 "(SELECT COUNT(*) FROM relances r JOIN echeances e ON e.id = r.echeance_id WHERE e.credit_id = c.id) AS relances "
                 "FROM credits c JOIN commercants m ON m.id = c.commercant_id WHERE c.institution_id = ?", inst):
        out.append({**c, **_etat_credit(s, c, auj)})
    return out


def indicateurs_credits(lignes: list) -> dict:
    vivants = [l for l in lignes if l["statut"] != "rembourse"]
    encours = sum(l["restant"] for l in vivants)
    retard = sum(l["restant"] for l in vivants if l["en_retard"])
    par30 = sum(l["restant"] for l in vivants if l["jours_retard"] > 30)
    du, recu = sum(l["du_echu"] for l in lignes), sum(l["recu_echu"] for l in lignes)
    return {"encours": encours, "part_en_retard": round(retard / encours, 4) if encours else 0.0,
            "par30": round(par30 / encours, 4) if encours else 0.0,
            "taux_recouvrement": round(recu / du, 4) if du else None}


def credits(s, inst: str, q: dict) -> dict:
    onglet = _choix(q, "onglet", ONGLETS_CREDITS, "en_cours")
    du, au = _date(q, "du"), _date(q, "au")
    texte = _norm(q.get("q", ""))[:80]
    toutes = lignes_credits(s, inst)
    l = [c for c in toutes if (onglet == "tous" or c["statut"] == STATUT_CREDIT[onglet])
         and _periode(c["decaisse_le"], du, au) and (not texte or texte in _norm(c["nom"]))]
    tri, ordre = _trier(l, q, {"date": lambda c: c["decaisse_le"] or "", "montant": lambda c: c["montant"],
                               "restant": lambda c: c["restant"], "retard": lambda c: c["jours_retard"]},
                        "retard" if onglet in ("en_retard", "en_defaut") else "date")
    compteurs = {k: sum(c["statut"] == v for c in toutes) for k, v in STATUT_CREDIT.items()}
    compteurs["tous"] = len(toutes)
    return {**_paginer(l, q), "onglet": onglet, "tri": tri, "ordre": ordre, "compteurs": compteurs,
            "indicateurs": indicateurs_credits(toutes)}


def credit(s, inst: str, cr: str) -> dict:
    c = s.credit(cr)
    if c["institution_id"] != inst:
        raise ErreurMetier(404, "crédit inconnu")
    auj = s.maintenant().date()
    c.update({k: v for k, v in _etat_credit(s, c, auj).items() if k in ("statut", "jours_retard")})
    c["commercant"] = s.un("SELECT id, nom, telephone, type_activite FROM commercants WHERE id = ?", c["commercant_id"])
    c["dossier"] = s.un("SELECT id, statut, cree_le, montant_demande, objet_categorie, objet_texte FROM dossiers WHERE id = ?", c["dossier_id"])
    c["interventions"] = [{**x, "avant": json.loads(x["avant"]), "apres": json.loads(x["apres"])} for x in s.q(
        "SELECT x.*, e.rang FROM interventions x JOIN echeances e ON e.id = x.echeance_id WHERE e.credit_id = ? ORDER BY x.id", cr)]
    for e in c["echeances"]:
        e["jours_retard"] = (auj - date.fromisoformat(e["date_due"])).days if e["statut"] == "en_retard" else 0
    return c


# ---------- recouvrement ----------
def retards(s, inst: str, q: dict) -> dict:
    auj = s.maintenant().date()
    texte = _norm(q.get("q", ""))[:80]
    l = s.q("SELECT e.id, e.rang, e.date_due, e.montant_attendu, e.montant_recu, e.credit_id, c.commercant_id, m.nom, "
            "(SELECT COUNT(*) FROM relances r WHERE r.echeance_id = e.id) AS relances FROM echeances e "
            "JOIN credits c ON c.id = e.credit_id JOIN commercants m ON m.id = c.commercant_id "
            "WHERE e.statut = 'en_retard' AND c.institution_id = ? ORDER BY e.date_due", inst)
    for e in l:
        e["jours_retard"] = (auj - date.fromisoformat(e["date_due"])).days
    l = [e for e in l if not texte or texte in _norm(e["nom"])]
    return _paginer(l, q)


def relances(s, inst: str, q: dict) -> dict:
    du, au = _date(q, "du"), _date(q, "au")
    cid = q.get("commercant") or None
    texte = _norm(q.get("q", ""))[:80]
    l = s.q("SELECT r.id, r.canal, r.message, r.horodatage, e.rang, e.credit_id, c.commercant_id, m.nom FROM relances r "
            "JOIN echeances e ON e.id = r.echeance_id JOIN credits c ON c.id = e.credit_id JOIN commercants m ON m.id = c.commercant_id "
            "WHERE c.institution_id = ? ORDER BY r.horodatage DESC, r.id DESC", inst)
    l = [r for r in l if (not cid or r["commercant_id"] == cid) and _periode(r["horodatage"], du, au)
         and (not texte or texte in _norm(r["nom"]))]
    return _paginer(l, q)


# ---------- commerçants ----------
def commercants(s, inst: str, q: dict) -> dict:
    texte = _norm(q.get("q", ""))[:80]
    cr = {}
    for c in lignes_credits(s, inst):
        x = cr.setdefault(c["commercant_id"], {"credits": 0, "encours": 0, "en_retard": 0})
        x["credits"] += 1
        x["encours"] += c["restant"] if c["statut"] != "rembourse" else 0
        x["en_retard"] += c["statut"] in ("en_retard", "en_defaut")
    l = s.q("SELECT m.id, m.nom, m.type_activite, COUNT(d.id) AS dossiers, MAX(d.cree_le) AS derniere_demande, "
            "SUM(d.statut IN ('recu','en_analyse')) AS a_decider FROM commercants m "
            "JOIN dossiers d ON d.commercant_id = m.id WHERE d.institution_id = ? GROUP BY m.id", inst)
    l = [{**m, **cr.get(m["id"], {"credits": 0, "encours": 0, "en_retard": 0})} for m in l if not texte or texte in _norm(m["nom"])]
    tri, ordre = _trier(l, q, {"nom": lambda m: _norm(m["nom"]), "date": lambda m: m["derniere_demande"] or "",
                               "encours": lambda m: m["encours"]}, "nom")
    return {**_paginer(l, q), "tri": tri, "ordre": ordre}


def commercant(s, inst: str, cid: str) -> dict:
    """Historique DANS CETTE INSTITUTION seulement : rien d'une autre institution, ni dossier, ni crédit, ni consentement."""
    m = s.un("SELECT id, nom, telephone, type_activite, compte_separe, compte_marchand_ouvert_le, canal FROM commercants WHERE id = ?", cid)
    if not m or not s.un("SELECT 1 FROM dossiers WHERE commercant_id = ? AND institution_id = ?", cid, inst):
        raise ErreurMetier(404, "commerçant inconnu")
    m["compte_separe"] = bool(m["compte_separe"])
    dem = [d for d in lignes_demandes(s, inst) if d["commercant_id"] == cid]
    dem.sort(key=lambda d: d["cree_le"], reverse=True)
    crs = sorted((c for c in lignes_credits(s, inst) if c["commercant_id"] == cid), key=lambda c: c["decaisse_le"] or "", reverse=True)
    ret = [e for e in retards(s, inst, {"taille": TAILLE_MAX})["elements"] if e["commercant_id"] == cid]
    actif = s.consentement_actif(cid, inst)
    flux = None
    if actif:  # flux récents seulement tant que le commerçant laisse l'accès à CETTE institution
        fin = s.maintenant()
        tx = [t for t in s.transactions(cid) if t["sens"] == "entree" and t["nature"] == "paiement_client"]

        def somme(j):
            debut = (fin - timedelta(days=j)).isoformat()
            return sum(t["montant"] for t in tx if debut <= t["horodatage"] <= fin.isoformat())
        dernier = tx[-1]["horodatage"] if tx else None
        flux = {"encaisse_4_semaines": somme(28), "encaisse_12_semaines": somme(84), "moyenne_hebdo_12_semaines": round(somme(84) / 12),
                "derniere_transaction": dernier}
    return {"commercant": m, "consentement_actif": actif, "demandes": dem, "credits": crs, "retards": ret, "flux": flux,
            "resume": {"demandes": len(dem), "credits": len(crs), "encours": sum(c["restant"] for c in crs if c["statut"] != "rembourse"),
                       "retards": len(ret)}}


# ---------- aujourd'hui ----------
def aujourdhui(s, inst: str) -> dict:
    now = s.maintenant()
    dem = lignes_demandes(s, inst)
    a_decider = sorted((d for d in dem if d["statut"] in ONGLETS_DEMANDES["a_decider"]),
                       key=lambda d: (-len(d["alertes"]), d["cree_le"]))
    limite = (now - timedelta(days=OFFRE_SANS_REPONSE_JOURS)).isoformat()
    sans_reponse = sorted((d for d in dem if d["statut"] == "accorde" and (d["decide_le"] or "") <= limite), key=lambda d: d["decide_le"])
    for d in sans_reponse:
        d["jours_sans_reponse"] = (now - datetime.fromisoformat(d["decide_le"])).days
    r = retards(s, inst, {"taille": TAILLE_MAX})
    hier = (now.date() - timedelta(days=1)).isoformat()
    lc = lignes_credits(s, inst)
    return {"maintenant": s._iso(now), "a_decider": a_decider[:6], "nb_a_decider": len(a_decider),
            "avec_alertes": sum(bool(d["alertes"]) for d in a_decider),
            "retards": r["elements"][:6], "nb_retards": r["total"], "nouveaux_retards": sum(e["date_due"] == hier for e in r["elements"]),
            "offres_sans_reponse": sans_reponse[:6], "nb_offres_sans_reponse": len(sans_reponse),
            "delai_sans_reponse_jours": OFFRE_SANS_REPONSE_JOURS, "indicateurs": indicateurs_credits(lc),
            "compteurs": compteurs_demandes(dem)}
