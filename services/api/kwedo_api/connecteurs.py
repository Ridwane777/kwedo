"""Connecteurs externes derrière une interface commune. Le prototype n'a que des simulateurs.

Remplacer un simulateur par un vrai service = fournir une classe qui respecte le même Protocol.
"""

from __future__ import annotations

import hashlib
from typing import Protocol

from kwedo_gen import REGLAGE, generer_commercant


class Operateur(Protocol):
    def importer_flux(self, commercant_id: str, semaines: int, archetype: str | None) -> list[dict]: ...
    def decaisser(self, credit_id: str, montant: int) -> dict: ...
    def encaisser(self, credit_id: str, montant: int) -> dict: ...


class Emecef(Protocol):
    def verifier(self, code_mecef: str, nim: str) -> dict: ...


class Notifications(Protocol):
    def envoyer(self, canal: str, destinataire: str, message: str) -> dict: ...


def _graine(*parts) -> int:
    return int(hashlib.sha256(":".join(map(str, parts)).encode()).hexdigest()[:8], 16)


class OperateurSimule:
    simule = True

    def importer_flux(self, commercant_id, semaines=52, archetype=None):
        c = generer_commercant(commercant_id, _graine("flux", commercant_id), REGLAGE, semaines=semaines,
                               archetype=archetype, manipulation=None, compte_separe=True)
        return c["transactions"]

    def decaisser(self, credit_id, montant):
        return {"reference": f"SIM-DEC-{_graine(credit_id) % 10**8:08d}", "montant": montant, "simule": True}

    def encaisser(self, credit_id, montant):
        return {"reference": f"SIM-PAY-{_graine(credit_id, montant) % 10**8:08d}", "montant": montant, "simule": True}


class EmecefSimule:
    simule = True

    def verifier(self, code_mecef, nim):
        ok = len(code_mecef) == 24 and len(nim) == 10
        return {"valide": ok, "simule": True, "motif": None if ok else "format invalide (24 et 10 caractères attendus)"}


class NotificationsSimulees:
    """N'envoie rien : le message est seulement inscrit au journal des relances."""
    simule = True

    def envoyer(self, canal, destinataire, message):
        return {"envoye": False, "simule": True, "canal": canal}
