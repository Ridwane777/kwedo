"""Conseils personnalisés : chaque levier est chiffré en relançant le moteur (inchangé) sur un scénario modifié.

Effet = plafond du scénario − plafond actuel, même graine, mêmes paramètres, même modèle. Un levier qu'on ne
peut pas chiffrer honnêtement porte `effet: None` (« effet non chiffré »). Rien ici ne permet de gonfler le
plafond : seuls des encaissements de clients réels sur le compte marchand comptent.
"""

from __future__ import annotations

import numpy as np

from kwedo_engine.moteur import SEMAINES_PLEINES, Parametres, decision, indicateurs, plafond_complet

SEUIL_CV = 0.40          # au-delà, l'engine conseille déjà plus de régularité
SEUIL_PRO = 0.85
SEUIL_CLIENT = 0.25
SEUIL_TENDANCE = -0.01
HAUSSE_COMPTE = 0.10     # scénario : 10 % de ventes en plus encaissées sur le compte marchand
PALIERS = (13, 26, 52)


def _fcfa(x) -> str:
    return f"{int(round(x)):,}".replace(",", " ") + " FCFA"


def _pc(x) -> str:
    return f"{x * 100:.0f} %"


def calculer(transactions: list[dict], parametres: dict, graine: int, en_retard: int = 0) -> dict:
    p = Parametres.depuis(parametres)
    ind, hebdo, fv = indicateurs(transactions)
    W = len(hebdo)
    paliers = [{"semaines": k, "mois": k * 12 // 52, "atteint": W >= k, "reste": max(0, k - W)} for k in PALIERS]
    if W == 0 or hebdo.max() <= 0:
        return {"plafond_actuel": 0, "gain_possible": None, "meilleur_levier": None, "semaines": W,
                "paliers": paliers, "leviers": [], "deja_bien": [], "simule": True}

    mod = decision.charger()
    decote = min(1.0, W / SEMAINES_PLEINES)

    def plafond(h=hebdo, d=decote) -> int:
        return plafond_complet(np.maximum(np.asarray(h, float), 0), p, graine, ind, fv, 0.0, d, mod)[0]

    base = plafond()
    leviers = []

    def effet(v):
        return None if v is None else max(0, int(v) - base)

    # 1. Encaissements sur le compte marchand : la base même du calcul.
    plus = hebdo * (1 + HAUSSE_COMPTE)
    e_compte = effet(plafond(plus))
    leviers.append({
        "code": "compte_marchand", "titre": "Faire payer vos clients sur le compte marchand", "bon": False,
        "constat": f"Une semaine creuse, vous encaissez au moins {_fcfa(np.percentile(hebdo, p.percentile))} "
                   "sur votre compte marchand. C'est ce niveau, pas la moyenne, qui sert de base au calcul.",
        "repere": "Seuls les paiements de clients reçus sur le compte marchand comptent ; les ventes en espèces ne se voient pas.",
        "pourquoi": "Chaque vente encaissée sur le compte marchand augmente vos encaissements vérifiés, donc le plafond.",
        "actions": ["Proposez le paiement mobile money sur votre numéro marchand à chaque client, même pour les petits montants.",
                    "Évitez de faire payer les clients sur votre numéro personnel : ces ventes ne comptent pas."],
        "effet": e_compte, "condition": f"si {_pc(HAUSSE_COMPTE)} de ventes en plus passaient par le compte marchand",
    })

    # 2. Régularité d'une semaine à l'autre.
    cv = ind["regularite_cv"]
    if cv > SEUIL_CV:
        moy = hebdo.mean()
        e_reg = effet(plafond(moy + (hebdo - moy) * (SEUIL_CV / cv)))
        constat = f"Vos ventes varient beaucoup d'une semaine à l'autre : en moyenne {_pc(cv)} d'écart avec une semaine habituelle."
    else:
        e_reg = 0
        constat = f"Vos ventes sont régulières d'une semaine à l'autre : en moyenne {_pc(cv)} d'écart avec une semaine habituelle."
    leviers.append({
        "code": "regularite", "titre": "Garder une activité régulière", "bon": cv <= SEUIL_CV,
        "constat": constat, "repere": f"Bon repère : {_pc(SEUIL_CV)} d'écart au plus.",
        "pourquoi": "Les semaines creuses comptent plus que les bonnes : plus elles sont rares, plus le plafond monte.",
        "actions": ["Encaissez chaque jour d'ouverture, même les petits montants.",
                    "Dans les périodes calmes, gardez la boutique ouverte aux heures habituelles plutôt que de fermer plusieurs jours."],
        "effet": e_reg, "condition": f"si l'écart descendait à {_pc(SEUIL_CV)}",
    })

    # 3. Historique vérifié (paliers 3, 6, 12 mois).
    suivant = next((k for k in PALIERS if W < k), None)
    if W < SEMAINES_PLEINES:
        e_hist = effet(plafond(d=min(1.0, suivant / SEMAINES_PLEINES)))
        cond = f"à {suivant} semaines d'historique ({suivant * 12 // 52} mois), à ventes égales"
    else:
        e_hist, cond = None, "au palier de 12 mois, l'estimation gagne en fiabilité sans changer la formule"
    leviers.append({
        "code": "historique", "titre": "Laisser le temps à l'historique", "bon": W >= SEMAINES_PLEINES,
        "constat": f"Vous avez {W} semaines d'historique vérifié.",
        "repere": f"Le plafond n'est plus réduit à partir de {SEMAINES_PLEINES} semaines (6 mois).",
        "pourquoi": "Un historique court réduit le plafond, car il dit peu de choses sur vos mauvaises périodes.",
        "actions": ["Continuez à encaisser sur le même compte marchand, sans en changer."],
        "effet": e_hist if suivant else None, "condition": cond if suivant else "tous les paliers sont atteints",
        "paliers": paliers,
    })

    # 4. Argent personnel séparé : ne change pas le calcul (il est déjà exclu), mais brouille le dossier.
    pro = ind["part_flux_pro"]
    leviers.append({
        "code": "separation", "titre": "Séparer l'argent personnel du compte marchand", "bon": pro >= SEUIL_PRO,
        "constat": f"{_pc(pro)} de l'argent reçu sur le compte marchand vient de clients"
                   + (f" ; {_fcfa(ind['exclu_transferts_soi'])} de virements vers vous-même ont été mis de côté." if ind["exclu_transferts_soi"] else "."),
        "repere": f"Bon repère : {_pc(SEUIL_PRO)} au moins.",
        "pourquoi": "L'argent personnel est déjà retiré du calcul : il ne fait pas monter le plafond, mais il rend votre dossier plus difficile à lire pour l'agent.",
        "actions": ["Ne faites pas transiter d'argent personnel ou familial par le compte marchand.",
                    "Gardez un autre numéro pour les dépenses de la maison."],
        "effet": None, "condition": "l'argent personnel n'entre jamais dans le calcul",
    })

    # 5. Tendance récente.
    t = ind["tendance_hebdo"]
    if t < SEUIL_TENDANCE:
        k = min(12, W)
        sans = hebdo.astype(float).copy()
        sans[-k:] -= t * float(np.median(hebdo)) * np.arange(k)
        e_t = effet(plafond(sans))
    else:
        e_t = 0
    leviers.append({
        "code": "tendance", "titre": "Attendre la reprise avant de demander plus", "bon": t >= SEUIL_TENDANCE,
        "constat": "Vos ventes baissent ces dernières semaines." if t < SEUIL_TENDANCE else "Vos ventes sont stables ou en hausse ces dernières semaines.",
        "repere": "Bon repère : des ventes stables ou en hausse sur les 3 derniers mois.",
        "pourquoi": "Une baisse récente pèse sur le plafond : le calcul suppose qu'elle peut durer.",
        "actions": ["Si la baisse est passagère, attendez quelques semaines de reprise avant de demander un montant plus élevé."],
        "effet": e_t, "condition": "si vos ventes retrouvaient leur niveau d'il y a 3 mois",
    })

    # 6. Clientèle variée : effet non chiffré (on ne fabrique pas de faux clients).
    top = ind["part_plus_gros_payeur"]
    leviers.append({
        "code": "clientele", "titre": "Avoir des clients variés", "bon": top <= SEUIL_CLIENT,
        "constat": f"Votre plus gros client représente {_pc(top)} de vos encaissements, sur {ind['payeurs_distincts']} clients payant par mobile money.",
        "repere": f"Bon repère : {_pc(SEUIL_CLIENT)} au plus pour un seul client.",
        "pourquoi": "Si un gros client s'arrête, vos encaissements chutent : le prêteur est plus prudent.",
        "actions": ["Invitez vos clients réguliers, pas seulement les plus gros, à payer sur le compte marchand."],
        "effet": None, "condition": "dépend de vos clients réels",
    })

    # 7. Remboursements : pas encore d'effet dans le calcul, mais servent aux prochaines demandes.
    leviers.append({
        "code": "remboursement", "titre": "Rembourser à l'heure", "bon": False if en_retard else None,
        "constat": f"{en_retard} échéance(s) en retard." if en_retard else "Vos remboursements serviront aux prochaines demandes.",
        "repere": "Bon repère : aucune échéance en retard.",
        "pourquoi": "Le calcul actuel ne lit que vos encaissements ; un bon historique de remboursement rassure l'institution lors des demandes suivantes.",
        "actions": ["Payez chaque échéance le jour prévu, ou prévenez l'institution avant si vous ne pouvez pas."],
        "effet": None, "condition": "pas encore pris en compte dans le calcul",
    })

    a_ameliorer = [l for l in leviers if not l["bon"]]
    deja_bien = [l for l in leviers if l["bon"]]
    a_ameliorer.sort(key=lambda l: (l["effet"] is None, -(l["effet"] or 0)))
    chiffres = [l for l in a_ameliorer if l["effet"]]
    meilleur = chiffres[0] if chiffres else None
    return {
        "plafond_actuel": base, "semaines": W, "paliers": paliers,
        "gain_possible": meilleur["effet"] if meilleur else None,
        "meilleur_levier": {"code": meilleur["code"], "titre": meilleur["titre"]} if meilleur else None,
        "leviers": a_ameliorer, "deja_bien": deja_bien, "simule": True,
    }
