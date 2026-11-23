"""Serveur HTTP JSON (bibliothèque standard). Écoute locale uniquement : 127.0.0.1:3460.

Usage : python3 -m kwedo_api.app [--db chemin] [--port 3460]
"""

from __future__ import annotations

import argparse
import json
import re
import threading
import time
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

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


def fabriquer(service: Service):
    verrou = threading.Lock()  # SQLite + une seule connexion : sérialiser les requêtes suffit au prototype

    class Gestionnaire(BaseHTTPRequestHandler):
        server_version = "kwedo-api/0.1"

        def log_message(self, fmt, *args):
            pass

        def _traiter(self, methode):
            t0 = time.perf_counter()
            u = urlparse(self.path)
            q = {k: v[-1] for k, v in parse_qs(u.query).items()}
            try:
                n = int(self.headers.get("Content-Length") or 0)
                b = json.loads(self.rfile.read(n) or b"{}") if n else {}
                for m, motif, f in ROUTES:
                    if m == methode and (r := motif.match(u.path)):
                        with verrou:
                            res = f(service, q, b, dict(self.headers), **r.groupdict())
                        return self._repondre(201 if methode == "POST" and u.path.endswith(("/dossiers", "/decisions", "/paiements")) else 200, res, t0)
                self._repondre(404, {"erreur": "route inconnue"}, t0)
            except ErreurMetier as e:
                self._repondre(e.statut, {"erreur": e.message}, t0)
            except (ValueError, json.JSONDecodeError) as e:
                self._repondre(422, {"erreur": f"requête invalide : {e}"}, t0)
            except Exception:  # noqa: BLE001
                traceback.print_exc()
                self._repondre(500, {"erreur": "erreur interne"}, t0)

        def _repondre(self, statut, corps, t0):
            data = json.dumps(corps, ensure_ascii=False, default=str).encode()
            self.send_response(statut)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Server-Timing", f"app;dur={(time.perf_counter() - t0) * 1000:.1f}")
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            self._traiter("GET")

        def do_POST(self):
            self._traiter("POST")

    return Gestionnaire


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="kwedo.sqlite")
    ap.add_argument("--port", type=int, default=3460)
    a = ap.parse_args()
    s = Service(a.db)
    if not s.un("SELECT 1 FROM institutions LIMIT 1"):
        s.reinitialiser()
    srv = ThreadingHTTPServer(("127.0.0.1", a.port), fabriquer(s))
    print(f"Kwedo API sur http://127.0.0.1:{a.port} (données simulées)")
    srv.serve_forever()


if __name__ == "__main__":
    main()
