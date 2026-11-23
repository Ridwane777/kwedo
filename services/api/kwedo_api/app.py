"""API HTTP JSON sur FastAPI (ADR 0006). Écoute locale uniquement : 127.0.0.1:3460.

Usage : .venv/bin/python services/api/serveur.py [--db chemin] [--port 3460]

Les routes sont déclarées une fois (table ROUTES, indépendante du transport) puis montées sur FastAPI :
chemins, codes et corps sont ceux du contrat `docs/contracts/openapi.yaml`, inchangés depuis l'ADR 0004.
"""

from __future__ import annotations

import argparse
import json
import re
import threading
import time
import traceback

from fastapi import FastAPI, Request
from fastapi.responses import Response
from starlette.exceptions import HTTPException as StarletteHTTPException

from .service import ErreurMetier, Service

ROUTES = []


def route(methode, motif):
    def deco(f):
        ROUTES.append((methode, re.compile("^" + motif + "$"), f))
        return f
    return deco


def _int(v):
    return int(v) if v not in (None, "") else None


@route("GET", r"/sante")
def sante(s, q, b, h):
    return {"ok": True, "maintenant": s.maintenant().isoformat(), "donnees": "simulees"}


@route("POST", r"/demo/reinitialiser")
def demo_reset(s, q, b, h):
    return s.reinitialiser()


@route("POST", r"/demo/avancer")
def demo_avancer(s, q, b, h):
    return s.avancer(int(b.get("jours", 7)))


@route("GET", r"/institutions")
def institutions(s, q, b, h):
    return s.institutions()


@route("POST", r"/commercants")
def inscrire(s, q, b, h):
    return s.inscrire(b.get("nom", ""), b.get("telephone", ""), b.get("type_activite", "tissus"), bool(b.get("compte_separe", True)))


@route("GET", r"/commercants/(?P<cid>[\w-]+)")
def commercant(s, q, b, h, cid):
    return s.tableau_de_bord(cid)


@route("POST", r"/commercants/(?P<cid>[\w-]+)/connexion-flux")
def connexion(s, q, b, h, cid):
    return s.connecter_flux(cid, int(b.get("semaines", 30)))


@route("POST", r"/commercants/(?P<cid>[\w-]+)/canal")
def canal(s, q, b, h, cid):
    return s.choisir_canal(cid, b.get("canal", ""))


@route("GET", r"/commercants/(?P<cid>[\w-]+)/estimation")
def estimation(s, q, b, h, cid):
    return s.estimation(cid, q.get("institution_id", "inst-lagune"), float(q.get("choc_ventes", 0) or 0), _int(q.get("montant_souhaite")))


@route("GET", r"/commercants/(?P<cid>[\w-]+)/consentements")
def consentements(s, q, b, h, cid):
    return s.consentements(cid)


@route("POST", r"/commercants/(?P<cid>[\w-]+)/consentements")
def consentir(s, q, b, h, cid):
    return s.consentir(cid, b.get("institution_id", ""), b.get("action", ""))


@route("GET", r"/commercants/(?P<cid>[\w-]+)/dossiers/(?P<did>[\w-]+)")
def offre_commercant(s, q, b, h, cid, did):
    return s.offre(cid, did)


@route("GET", r"/dossiers")
def file(s, q, b, h):
    return s.file(q.get("institution_id"), q.get("statut"), q.get("tri", "priorite"))


@route("POST", r"/dossiers")
def envoyer(s, q, b, h):
    return s.envoyer_dossier(b.get("commercant_id", ""), b.get("institution_id", ""))


@route("GET", r"/dossiers/(?P<did>[\w-]+)")
def dossier(s, q, b, h, did):
    return s.dossier(did, acteur=h.get("X-Acteur", "agent.demo"))


@route("GET", r"/dossiers/(?P<did>[\w-]+)/rejouer")
def rejouer(s, q, b, h, did):
    return s.rejouer(did)


@route("POST", r"/dossiers/(?P<did>[\w-]+)/decisions")
def decider(s, q, b, h, did):
    return s.decider(did, b.get("type", ""), b.get("auteur") or h.get("X-Acteur", "agent.demo"), b.get("motif", ""),
                     _int(b.get("montant_decide")), _int(b.get("duree_semaines")))


@route("POST", r"/dossiers/(?P<did>[\w-]+)/offre")
def offre(s, q, b, h, did):
    return s.repondre_offre(did, b.get("reponse", ""), _int(b.get("montant")))


@route("GET", r"/credits/(?P<cr>[\w-]+)")
def credit(s, q, b, h, cr):
    return s.credit(cr)


@route("POST", r"/credits/(?P<cr>[\w-]+)/paiements")
def payer(s, q, b, h, cr):
    return s.payer(cr, int(b.get("montant", 0)))


@route("POST", r"/echeances/(?P<eid>\d+)/interventions")
def intervenir(s, q, b, h, eid):
    return s.intervenir(int(eid), b.get("auteur") or h.get("X-Acteur", "agent.demo"), b.get("motif", ""),
                        b.get("nouvelle_date"), b.get("statut"))


@route("GET", r"/portefeuille")
def portefeuille(s, q, b, h):
    return s.portefeuille(q.get("institution_id"))


@route("POST", r"/relances/executer")
def relances(s, q, b, h):
    return s.executer_relances()


@route("GET", r"/institutions/(?P<inst>[\w-]+)/parametres")
def params(s, q, b, h, inst):
    return {"actifs": s.parametres(inst), "historique": s.historique_parametres(inst)}


@route("POST", r"/institutions/(?P<inst>[\w-]+)/parametres")
def nv_params(s, q, b, h, inst):
    kw = {k: b[k] for k in ("m", "s", "n", "i", "percentile", "seuil_risque") if k in b}
    return s.nouveaux_parametres(inst, b.get("auteur") or h.get("X-Acteur", "responsable.demo"), **kw)


@route("GET", r"/journal")
def journal(s, q, b, h):
    return s.journal(int(q.get("limite", 200)))


CODES_201 = ("/dossiers", "/decisions", "/paiements")
PARAM = re.compile(r"\(\?P<(\w+)>([^)]+)\)")


def _json(statut: int, corps, t0: float) -> Response:
    data = json.dumps(corps, ensure_ascii=False, default=str).encode()
    return Response(data, status_code=statut, media_type="application/json; charset=utf-8",
                    headers={"Server-Timing": f"app;dur={(time.perf_counter() - t0) * 1000:.1f}"})


def fabriquer(service: Service) -> FastAPI:
    """Monte la table ROUTES sur FastAPI. Le corps JSON est lu à la main pour garder les codes du contrat
    (422 si invalide, 404 « route inconnue », 201 sur les créations)."""
    app = FastAPI(title="Kwedo API", version="0.2.0", description="Données 100 % simulées.")
    verrou = threading.Lock()  # SQLite + une seule connexion : sérialiser les requêtes suffit au prototype

    def monter(methode, motif, f):
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
            return await _executer(f, dict(request.query_params), b, dict(request.headers), pp,
                                   201 if methode == "POST" and request.url.path.endswith(CODES_201) else 200, t0)

        app.add_api_route(chemin, point, methods=[methode], name=f.__name__, include_in_schema=True)

    def _appel(f, q, b, h, pp, code, t0):
        try:
            with verrou:
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

    for methode, motif, f in ROUTES:
        monter(methode, motif, f)

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
    print(f"Kwedo API sur http://127.0.0.1:{a.port} (données simulées, FastAPI)", flush=True)
    uvicorn.run(fabriquer(s), host="127.0.0.1", port=a.port, log_level="warning", access_log=False)


if __name__ == "__main__":
    main()
