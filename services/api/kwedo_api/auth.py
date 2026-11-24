"""Sessions de démonstration : profils fictifs, jeton signé (HMAC) dans un cookie HttpOnly (ADR 0009).

Deux cookies distincts, un par espace, pour qu'un même navigateur puisse jouer le commerçant et le prêteur pendant la démo.
Le choix du profil n'est pas une authentification : il n'y a pas de mot de passe. Le cloisonnement, lui, est appliqué par l'API.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time

COOKIES = {"com": "kwedo_commercant", "pro": "kwedo_pro"}
DUREE = 12 * 3600
SECRET = os.environ.get("KWEDO_SECRET") or secrets.token_hex(32)

PROFILS = {
    "commercant": {"role": "commercant", "nom": "Afiavi Houngbo", "login": "com-afiavi", "commercant_id": "com-afiavi", "institution_id": None},
    # L'autre côté : un profil à risque (dépendance à un seul client, ventes irrégulières), plafond bas.
    "commercant-risque": {"role": "commercant", "nom": "Yaba Agossou", "login": "com-yaba", "commercant_id": "com-yaba", "institution_id": None,
                          "libelle": "Commerçant à risque"},
    "agent-lagune": {"role": "agent", "nom": "Agent de crédit", "login": "agent.lagune", "commercant_id": None, "institution_id": "inst-lagune"},
    "responsable-lagune": {"role": "responsable", "nom": "Responsable crédit", "login": "responsable.lagune", "commercant_id": None, "institution_id": "inst-lagune"},
    "agent-baobab": {"role": "agent", "nom": "Agent de crédit", "login": "agent.baobab", "commercant_id": None, "institution_id": "inst-baobab"},
    "responsable-baobab": {"role": "responsable", "nom": "Responsable crédit", "login": "responsable.baobab", "commercant_id": None, "institution_id": "inst-baobab"},
    "admin": {"role": "admin", "nom": "Administration Kwedo", "login": "admin.kwedo", "commercant_id": None, "institution_id": None},
}


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _signature(corps: str) -> str:
    return _b64(hmac.new(SECRET.encode(), corps.encode(), hashlib.sha256).digest())


def signer(utilisateur: dict) -> str:
    corps = _b64(json.dumps({**utilisateur, "exp": int(time.time()) + DUREE}, ensure_ascii=False).encode())
    return f"{corps}.{_signature(corps)}"


def lire(jeton: str | None) -> dict | None:
    if not jeton or "." not in jeton:
        return None
    corps, signature = jeton.rsplit(".", 1)
    if not hmac.compare_digest(signature, _signature(corps)):
        return None
    try:
        u = json.loads(base64.urlsafe_b64decode(corps + "=" * (-len(corps) % 4)))
    except ValueError:
        return None
    return u if u.get("exp", 0) > time.time() else None


def espace(utilisateur: dict) -> str:
    return "com" if utilisateur["role"] == "commercant" else "pro"
