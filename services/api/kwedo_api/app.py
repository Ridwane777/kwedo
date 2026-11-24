"""API HTTP JSON sur FastAPI (ADR 0006). Écoute locale uniquement : 127.0.0.1:3460.

Usage : .venv/bin/python services/api/serveur.py [--db chemin] [--port 3460]

Les routes sont déclarées une fois (table ROUTES, indépendante du transport) puis montées sur FastAPI :
chemins, codes et corps sont ceux du contrat `docs/contracts/openapi.yaml`, inchangés depuis l'ADR 0004.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import threading
import time
import traceback

from fastapi import FastAPI, Request
from fastapi.responses import Response
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import auth
from .service import CHAMPS_PARAMETRES, ErreurMetier, Service

ROUTES = []


def route(methode, motif, acces):
    def deco(f):
        ROUTES.append((methode, re.compile("^" + motif + "$"), f, acces))
        return f
    return deco


def _int(v):
    return int(v) if v not in (None, "") else None


# ---------- contrôle d'accès (ADR 0009) : chaque route déclare sa règle, appliquée avant la logique métier ----------
def public(s, u, b, pp):
    return None


def _pro(u, *roles):
    if not u["pro"]:
        raise ErreurMetier(401, "connexion requise")
    if u["pro"]["role"] not in roles:
        raise ErreurMetier(403, "action non autorisée pour ce rôle")
    return u["pro"]


def _proprietaire(u, cid):
    if not u["com"]:
        raise ErreurMetier(401, "connexion requise")
    if u["com"]["commercant_id"] != cid:
        raise ErreurMetier(403, "ce profil n'est pas le vôtre")


def admin(s, u, b, pp):
    _pro(u, "admin")


def equipe(s, u, b, pp):
    _pro(u, "agent", "responsable")


def connecte_pro(s, u, b, pp):
    _pro(u, "agent", "responsable", "admin")


def commercant_du_chemin(s, u, b, pp):
    _proprietaire(u, pp["cid"])


def commercant_du_corps(s, u, b, pp):
    _proprietaire(u, b.get("commercant_id", ""))


def equipe_institution(s, u, b, pp):
    if _pro(u, "agent", "responsable")["institution_id"] != pp["inst"]:
        raise ErreurMetier(403, "ces paramètres appartiennent à une autre institution")


def responsable_institution(s, u, b, pp):
    if _pro(u, "responsable")["institution_id"] != pp["inst"]:
        raise ErreurMetier(403, "seul le responsable de cette institution peut modifier ses paramètres")


def equipe_dossier(s, u, b, pp):
    p = _pro(u, "agent", "responsable")
    if not s.un("SELECT 1 FROM dossiers WHERE id = ? AND institution_id = ?", pp["did"], p["institution_id"]):
        raise ErreurMetier(404, "dossier inconnu")  # même réponse qu'un dossier inexistant


def commercant_du_dossier(s, u, b, pp):
    d = s.un("SELECT commercant_id FROM dossiers WHERE id = ?", pp["did"])
    if not d or not u["com"] or u["com"]["commercant_id"] != d["commercant_id"]:
        if not u["com"]:
            raise ErreurMetier(401, "connexion requise")
        raise ErreurMetier(404, "dossier inconnu")


def _voit_credit(s, u, cr):
    c = s.un("SELECT commercant_id, institution_id FROM credits WHERE id = ?", cr)
    if not c:
        return False
    return bool((u["com"] and u["com"]["commercant_id"] == c["commercant_id"])
                or (u["pro"] and u["pro"]["institution_id"] == c["institution_id"]))


def lecteur_credit(s, u, b, pp):
    if not u["com"] and not u["pro"]:
        raise ErreurMetier(401, "connexion requise")
    if not _voit_credit(s, u, pp["cr"]):
        raise ErreurMetier(404, "crédit inconnu")


def payeur_credit(s, u, b, pp):
    c = s.un("SELECT commercant_id FROM credits WHERE id = ?", pp["cr"])
    if not u["com"]:
        raise ErreurMetier(401, "connexion requise")
    if not c or c["commercant_id"] != u["com"]["commercant_id"]:
        raise ErreurMetier(404, "crédit inconnu")


def equipe_echeance(s, u, b, pp):
    p = _pro(u, "agent", "responsable")
    if not s.un("SELECT 1 FROM echeances e JOIN credits c ON c.id = e.credit_id WHERE e.id = ? AND c.institution_id = ?",
                int(pp["eid"]), p["institution_id"]):
        raise ErreurMetier(404, "échéance inconnue")


# ---------- sessions ----------
@route("GET", r"/auth/profils", public)
def profils(s, q, b, h):
    noms = {i["id"]: i["nom"] for i in s.q("SELECT id, nom FROM institutions")}
    return [{"id": k, "role": p["role"], "nom": p["nom"], "institution": noms.get(p["institution_id"])} for k, p in auth.PROFILS.items()]


@route("POST", r"/auth/connexion", public)
def connexion_profil(s, q, b, h):
    p = auth.PROFILS.get(b.get("profil", ""))
    if not p:
        raise ErreurMetier(422, "profil inconnu")
    u = {**p, "profil": b["profil"]}
    return {"role": p["role"], "_cookies": {auth.COOKIES[auth.espace(u)]: auth.signer(u)}}


@route("GET", r"/auth/moi", public)
def moi(s, q, b, h):
    com, pro = h["com"], h["pro"]
    if com and not s.un("SELECT 1 FROM commercants WHERE id = ?", com["commercant_id"]):
        com = None  # profil inscrit effacé par une réinitialisation de la démo
    if pro and pro["institution_id"]:
        pro = {**pro, "institution": s.un("SELECT nom FROM institutions WHERE id = ?", pro["institution_id"])["nom"]}
    return {"commercant": com, "pro": pro}


@route("POST", r"/auth/deconnexion", public)
def deconnexion(s, q, b, h):
    if b.get("espace") not in auth.COOKIES:
        raise ErreurMetier(422, "espace : com ou pro")
    return {"ok": True, "_cookies": {auth.COOKIES[b["espace"]]: None}}


@route("GET", r"/sante", public)
def sante(s, q, b, h):
    return {"ok": True, "maintenant": s.maintenant().isoformat(), "donnees": "simulees"}


@route("POST", r"/demo/reinitialiser", admin)
def demo_reset(s, q, b, h):
    return s.reinitialiser()


@route("POST", r"/demo/avancer", admin)
def demo_avancer(s, q, b, h):
    return s.avancer(int(b.get("jours", 7)))


@route("GET", r"/institutions", public)
def institutions(s, q, b, h):
    return s.institutions()


@route("POST", r"/commercants", public)
def inscrire(s, q, b, h):
    c = s.inscrire(b.get("nom", ""), b.get("telephone", ""), b.get("type_activite", "tissus"), bool(b.get("compte_separe", True)))
    u = {"role": "commercant", "nom": c["nom"], "login": c["id"], "commercant_id": c["id"], "institution_id": None, "profil": "inscription"}
    return {**c, "_cookies": {auth.COOKIES["com"]: auth.signer(u)}}


@route("GET", r"/commercants/(?P<cid>[\w-]+)", commercant_du_chemin)
def commercant(s, q, b, h, cid):
    return s.tableau_de_bord(cid)


@route("POST", r"/commercants/(?P<cid>[\w-]+)/connexion-flux", commercant_du_chemin)
def connexion(s, q, b, h, cid):
    return s.connecter_flux(cid, int(b.get("semaines", 30)))


@route("POST", r"/commercants/(?P<cid>[\w-]+)/canal", commercant_du_chemin)
def canal(s, q, b, h, cid):
    return s.choisir_canal(cid, b.get("canal", ""))


@route("GET", r"/commercants/(?P<cid>[\w-]+)/estimation", commercant_du_chemin)
def estimation(s, q, b, h, cid):
    return s.estimation(cid, q.get("institution_id", "inst-lagune"), float(q.get("choc_ventes", 0) or 0), _int(q.get("montant_souhaite")),
                        q.get("frequence") or None, _int(q.get("duree_mois")))


@route("GET", r"/commercants/(?P<cid>[\w-]+)/plafonds", commercant_du_chemin)
def plafonds(s, q, b, h, cid):
    return s.plafonds(cid, q.get("institution_id", "inst-lagune"), q.get("frequence") or None)


@route("GET", r"/commercants/(?P<cid>[\w-]+)/conseils", commercant_du_chemin)
def conseils(s, q, b, h, cid):
    return s.conseils(cid, q.get("institution_id", "inst-lagune"), q.get("frequence") or None, _int(q.get("duree_mois")))


@route("GET", r"/commercants/(?P<cid>[\w-]+)/consentements", commercant_du_chemin)
def consentements(s, q, b, h, cid):
    return s.consentements(cid)


@route("POST", r"/commercants/(?P<cid>[\w-]+)/code-sms", commercant_du_chemin)
def code_sms(s, q, b, h, cid):
    return s.emettre_code(cid, b.get("institution_id", ""))


@route("POST", r"/commercants/(?P<cid>[\w-]+)/consentements", commercant_du_chemin)
def consentir(s, q, b, h, cid):
    # Accorder l'accès exige la signature par code SMS (ADR 0015) ; le retrait reste libre et immédiat.
    if b.get("action") == "accorde":
        s.verifier_code(cid, b.get("institution_id", ""), b.get("code", ""), "accord de consultation du dossier")
    return s.consentir(cid, b.get("institution_id", ""), b.get("action", ""))


@route("GET", r"/commercants/(?P<cid>[\w-]+)/dossiers/(?P<did>[\w-]+)", commercant_du_chemin)
def offre_commercant(s, q, b, h, cid, did):
    return s.offre(cid, did)


@route("GET", r"/dossiers", equipe)
def file(s, q, b, h):
    return s.file(h["institution"], q.get("statut"), q.get("tri", "priorite"))


@route("POST", r"/dossiers", commercant_du_corps)
def envoyer(s, q, b, h):
    d = s.envoyer_dossier(b.get("commercant_id", ""), b.get("institution_id", ""), b.get("frequence") or None, _int(b.get("duree_mois")),
                          b.get("montant_demande"), b.get("objet_categorie"), b.get("objet"))
    # Jamais les alertes ni le risque côté commerçant.
    return {k: d[k] for k in ("id", "institution_id", "statut", "frequence", "duree_mois", "montant_demande", "objet_categorie", "objet_texte")}


@route("GET", r"/dossiers/(?P<did>[\w-]+)/risque", equipe_dossier)
def risque_termes(s, q, b, h, did):
    """Risque recalculé pour une contre-proposition (montant, fréquence, durée dans les modalités de l'institution)."""
    return s.evaluer(did, _int(q.get("montant")), q.get("frequence") or None, _int(q.get("duree_mois")))


@route("GET", r"/dossiers/(?P<did>[\w-]+)", equipe_dossier)
def dossier(s, q, b, h, did):
    return s.dossier(did, acteur=h["X-Acteur"])


@route("GET", r"/dossiers/(?P<did>[\w-]+)/rejouer", equipe_dossier)
def rejouer(s, q, b, h, did):
    return s.rejouer(did)


@route("POST", r"/dossiers/(?P<did>[\w-]+)/decisions", equipe_dossier)
def decider(s, q, b, h, did):
    return s.decider(did, b.get("type", ""), h["X-Acteur"], b.get("motif", ""),
                     _int(b.get("montant_decide")), _int(b.get("duree_semaines")), b.get("frequence") or None, _int(b.get("duree_mois")))


@route("POST", r"/dossiers/(?P<did>[\w-]+)/offre", commercant_du_dossier)
def offre(s, q, b, h, did):
    r = s.repondre_offre(did, b.get("reponse", ""), _int(b.get("montant")))
    return s.offre(r["commercant_id"], did) if "analyse" in r else r


@route("GET", r"/credits/(?P<cr>[\w-]+)", lecteur_credit)
def credit(s, q, b, h, cr):
    return s.credit(cr)


@route("POST", r"/credits/(?P<cr>[\w-]+)/paiements", payeur_credit)
def payer(s, q, b, h, cr):
    return s.payer(cr, int(b.get("montant", 0)))


@route("POST", r"/echeances/(?P<eid>\d+)/interventions", equipe_echeance)
def intervenir(s, q, b, h, eid):
    return s.intervenir(int(eid), h["X-Acteur"], b.get("motif", ""), b.get("nouvelle_date"), b.get("statut"))


@route("GET", r"/portefeuille", equipe)
def portefeuille(s, q, b, h):
    return s.portefeuille(h["institution"])


@route("POST", r"/relances/executer", admin)
def relances(s, q, b, h):
    return s.executer_relances()


@route("GET", r"/institutions/(?P<inst>[\w-]+)/parametres", equipe_institution)
def params(s, q, b, h, inst):
    return {"actifs": s.parametres(inst), "historique": s.historique_parametres(inst)}


@route("POST", r"/institutions/(?P<inst>[\w-]+)/parametres", responsable_institution)
def nv_params(s, q, b, h, inst):
    kw = {k: b[k] for k in CHAMPS_PARAMETRES if k in b}
    return s.nouveaux_parametres(inst, h["X-Acteur"], **kw)


@route("GET", r"/journal", connecte_pro)
def journal(s, q, b, h):
    return s.journal(int(q.get("limite", 200)), h["institution"], expurge=h["role"] == "admin")


@route("GET", r"/admin/apercu", admin)
def admin_apercu(s, q, b, h):
    return s.apercu_admin()


CODES_201 = ("/dossiers", "/decisions", "/paiements")
PARAM = re.compile(r"\(\?P<(\w+)>([^)]+)\)")


def _json(statut: int, corps, t0: float) -> Response:
    cookies = corps.pop("_cookies", {}) if isinstance(corps, dict) else {}
    data = json.dumps(corps, ensure_ascii=False, default=str).encode()
    r = Response(data, status_code=statut, media_type="application/json; charset=utf-8",
                 headers={"Server-Timing": f"app;dur={(time.perf_counter() - t0) * 1000:.1f}"})
    for nom, valeur in cookies.items():
        if valeur is None:
            r.delete_cookie(nom, path="/")
        else:
            r.set_cookie(nom, valeur, max_age=auth.DUREE, path="/", httponly=True, samesite="lax")
    return r


def fabriquer(service: Service) -> FastAPI:
    """Monte la table ROUTES sur FastAPI. Le corps JSON est lu à la main pour garder les codes du contrat
    (422 si invalide, 404 « route inconnue », 201 sur les créations)."""
    app = FastAPI(title="Kwedo API", version="0.2.0", description="Données 100 % simulées.")
    verrou = threading.Lock()  # SQLite + une seule connexion : sérialiser les requêtes suffit au prototype

    def monter(methode, motif, f, acces):
        source = motif.pattern[1:-1]
        params = {m.group(1): re.compile("^" + m.group(2) + "$") for m in PARAM.finditer(source)}
        chemin = PARAM.sub(lambda m: "{" + m.group(1) + "}", source)

        async def point(request: Request):
            t0 = time.perf_counter()
            pp = dict(request.path_params)
            if any(not params[k].match(v) for k, v in pp.items()):
                return _json(404, {"erreur": "route inconnue"}, t0)
            try:
                brut = await request.body()
                b = json.loads(brut) if brut else {}
                if not isinstance(b, dict):
                    raise ValueError("objet JSON attendu")
            except (ValueError, UnicodeDecodeError) as e:
                return _json(422, {"erreur": f"requête invalide : {e}"}, t0)
            return await _executer(f, acces, dict(request.query_params), b, dict(request.cookies), pp,
                                   201 if methode == "POST" and request.url.path.endswith(CODES_201) else 200, t0)

        app.add_api_route(chemin, point, methods=[methode], name=f.__name__, include_in_schema=True)

    def _appel(f, acces, q, b, cookies, pp, code, t0):
        u = {e: auth.lire(cookies.get(nom)) for e, nom in auth.COOKIES.items()}
        # Contexte construit ici depuis les sessions signées : aucun en-tête client n'y entre.
        qui = u["pro"] or u["com"] or {}
        h = {**u, "X-Acteur": qui.get("login"), "institution": (u["pro"] or {}).get("institution_id"), "role": qui.get("role")}
        try:
            with verrou:
                acces(service, u, b, pp)
                return _json(code, f(service, q, b, h, **pp), t0)
        except ErreurMetier as e:
            return _json(e.statut, {"erreur": e.message}, t0)
        except ValueError as e:
            return _json(422, {"erreur": f"requête invalide : {e}"}, t0)
        except Exception:  # noqa: BLE001
            traceback.print_exc()
            return _json(500, {"erreur": "erreur interne"}, t0)

    async def _executer(*args):
        from starlette.concurrency import run_in_threadpool
        return await run_in_threadpool(_appel, *args)

    for methode, motif, f, acces in ROUTES:
        monter(methode, motif, f, acces)

    @app.exception_handler(StarletteHTTPException)
    async def introuvable(request: Request, exc: StarletteHTTPException):
        statut = 404 if exc.status_code in (404, 405) else exc.status_code
        return _json(statut, {"erreur": "route inconnue" if statut == 404 else str(exc.detail)}, time.perf_counter())

    return app


def main():
    import uvicorn

    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="kwedo.sqlite")
    ap.add_argument("--port", type=int, default=3460)
    a = ap.parse_args()
    s = Service(a.db)
    if not s.un("SELECT 1 FROM institutions LIMIT 1"):
        s.reinitialiser()
    # KWEDO_HOST : 127.0.0.1 par défaut (VPS partagé) ; 0.0.0.0 dans le conteneur Docker (ADR 0013).
    hote = os.environ.get("KWEDO_HOST", "127.0.0.1")
    print(f"Kwedo API sur http://{hote}:{a.port} (données simulées, FastAPI)", flush=True)
    uvicorn.run(fabriquer(s), host=hote, port=a.port, log_level="warning", access_log=False)


if __name__ == "__main__":
    main()
