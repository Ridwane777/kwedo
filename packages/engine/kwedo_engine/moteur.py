"""Moteur d'analyse de la capacité de remboursement. Sans état, déterministe (graine enregistrée).

R     = C_p × m × s
L_max = R × (1 − (1 + i)^−n) / i
Plafond proposé = plus grand montant ≤ L_max dont le risque simulé reste ≤ seuil de l'institution.

Fréquence de remboursement (ADR 0015) : hebdomadaire (défaut, seule fréquence sur laquelle le risque a été évalué),
quinzaine ou mensuelle. C_p est alors le percentile des encaissements agrégés à la période, i le taux équivalent par
période et n le nombre d'échéances ; la simulation reste à la semaine, le contrôle se fait à chaque échéance.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass

import numpy as np

from . import decision
from .flux import flux_verifies, series_hebdo
from .modeles import appliquer

VERSION = "0.2.0"
PAS = 5_000
SEMAINES_MIN = 12          # en dessous : estimation provisoire
SEMAINES_PLEINES = 26      # au-delà : pas de décote d'ancienneté
PLAFOND_MIN = 25_000
REF_CV = 0.25              # régularité de référence pour neutraliser un facteur
SEUIL_CONCENTRATION = 0.40
SEMAINES_PAR_MOIS = 52 / 12
FREQUENCES = {"hebdomadaire": 1.0, "quinzaine": 2.0, "mensuelle": SEMAINES_PAR_MOIS}
PERIODE = {"hebdomadaire": "semaine", "quinzaine": "quinzaine", "mensuelle": "mois"}
MAUVAISE = {"hebdomadaire": "une mauvaise semaine", "quinzaine": "une mauvaise quinzaine", "mensuelle": "un mauvais mois"}
DUREE_MOIS_MIN, DUREE_MOIS_MAX = 3, 12


@dataclass(frozen=True)
class Parametres:
    m: float = 0.30
    s: float = 0.40
    n: int = 26
    i: float = 0.0035
    percentile: float = 20
    seuil_risque: float = 0.10
    trajectoires: int = 2000
    bloc: int = 4
    p_choc_durable: float = 0.15
    p_semaine_vide: float = 0.03
    gamma_modele: float = 4.0   # modulation par la probabilité de défaut (0 = désactivée), choisie par balayage sur le réglage
    frequence: str = "hebdomadaire"   # hebdomadaire | quinzaine | mensuelle (ADR 0015)
    duree_mois: int | None = None     # 3 à 12 ; None : durée de l'institution (n semaines)

    def __post_init__(self):
        if self.frequence not in FREQUENCES:
            raise ValueError(f"fréquence inconnue : {self.frequence}")
        if self.duree_mois is not None and not DUREE_MOIS_MIN <= self.duree_mois <= DUREE_MOIS_MAX:
            raise ValueError(f"durée entre {DUREE_MOIS_MIN} et {DUREE_MOIS_MAX} mois")

    @classmethod
    def depuis(cls, d: dict | None) -> "Parametres":
        d = d or {}
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})

    @property
    def w(self) -> float:
        """Semaines par période de remboursement."""
        return FREQUENCES[self.frequence]

    @property
    def nb(self) -> int:
        """Nombre d'échéances. Hebdomadaire sans durée en mois : n, exactement comme avant."""
        semaines = self.duree_mois * SEMAINES_PAR_MOIS if self.duree_mois else self.n
        return max(1, int(math.floor(semaines / self.w + 0.5)))  # 6,5 quinzaines → 7 (pas d'arrondi bancaire)

    @property
    def ip(self) -> float:
        """Taux par période, équivalent au taux hebdomadaire i."""
        return self.i if self.frequence == "hebdomadaire" else (1 + self.i) ** self.w - 1

    @property
    def horizon(self) -> int:
        """Semaines simulées : jusqu'à la dernière échéance."""
        return self.nb if self.frequence == "hebdomadaire" else int(math.ceil(self.nb * self.w - 1e-9))

    @property
    def rangs_semaine(self) -> np.ndarray:
        """Indice de la semaine (0 = première) où tombe chaque échéance."""
        if self.frequence == "hebdomadaire":
            return np.arange(self.nb)
        return np.ceil(np.arange(1, self.nb + 1) * self.w - 1e-9).astype(int) - 1


def annuite(i: float, n: int) -> float:
    return (1 - (1 + i) ** -n) / i


def l_max(c_p: float, p: Parametres) -> float:
    return c_p * p.m * p.s * annuite(p.ip, p.nb)


def echeance(montant: float, p: Parametres) -> float:
    return montant / annuite(p.ip, p.nb)


def serie_periode(hebdo: np.ndarray, p: Parametres) -> np.ndarray:
    """Encaissements agrégés à la période : semaines telles quelles, ou sommes glissantes de 2 (quinzaine) ou
    4 semaines ramenées à 52/12 semaines (mois). Glissantes : toutes les « mauvaises quinzaines / mois » comptent."""
    if p.frequence == "hebdomadaire" or len(hebdo) == 0:
        return hebdo
    k = int(round(p.w))
    if len(hebdo) < k:
        return np.array([hebdo.sum() * p.w / len(hebdo)])
    return np.convolve(hebdo, np.ones(k), mode="valid") * (p.w / k)


def _xp(backend: str):
    if backend == "cupy":  # option documentée, jamais exécutée sur cette machine (pas de GPU)
        import cupy  # type: ignore
        return cupy
    return np


def simuler_seuils(hebdo: np.ndarray, p: Parametres, graine: int, choc_ventes: float = 0.0,
                   backend: str = "numpy") -> np.ndarray:
    """Pour chaque avenir simulé, échéance maximale payable sans aucun incident.

    Avenir = blocs de semaines réelles rééchantillonnés + chocs (baisse durable, semaine sans vente).
    Disponible par semaine = flux × m × min(1, 2s), avec report du surplus. Une échéance E est
    manquée à l'échéance k (semaine t_k) si la somme disponible jusqu'à t_k est < k·E ; le seuil de la
    trajectoire est donc min_k cumul[t_k] / k. Hebdomadaire : t_k = k − 1 (contrôle chaque semaine).
    """
    xp = _xp(backend)
    rng = np.random.default_rng(graine)
    N, n, b = p.trajectoires, p.horizon, max(1, min(p.bloc, len(hebdo)))
    nb_blocs = -(-n // b)
    debuts = rng.integers(0, len(hebdo) - b + 1, size=(N, nb_blocs))
    idx = (debuts[:, :, None] + np.arange(b)).reshape(N, -1)[:, :n]
    traj = hebdo[idx] * (1.0 + choc_ventes)
    durable = rng.random(N) < p.p_choc_durable
    debut_choc = rng.integers(0, n, size=N)
    ampleur = rng.uniform(0.5, 0.8, size=N)
    masque = durable[:, None] & (np.arange(n)[None, :] >= debut_choc[:, None])
    traj = np.where(masque, traj * ampleur[:, None], traj)
    traj = np.where(rng.random((N, n)) < p.p_semaine_vide, 0.0, traj)
    traj = xp.asarray(traj)
    dispo = traj * p.m * min(1.0, 2 * p.s)
    cumul = xp.cumsum(dispo, axis=1)
    if p.frequence != "hebdomadaire":
        cumul = cumul[:, xp.asarray(p.rangs_semaine)]
    seuils = (cumul / xp.arange(1, p.nb + 1)).min(axis=1)
    return np.asarray(seuils.get() if hasattr(seuils, "get") else seuils)


def risque_pour_montant(seuils: np.ndarray, montant: float, p: Parametres) -> float:
    return float(np.mean(seuils < echeance(montant, p))) if montant > 0 else 0.0


def _plafond(hebdo, p, graine, choc=0.0, decote=1.0):
    """v0.1 : formule + simulation seule (sans modèle). Conservé comme repli et comme référence d'évaluation."""
    if len(hebdo) == 0 or hebdo.max() <= 0:
        return 0, 0.0, 0.0, 0.0, np.zeros(p.trajectoires)
    c_p = float(np.percentile(serie_periode(hebdo, p), p.percentile)) * (1 + choc)
    lmax = l_max(c_p, p)
    seuils = simuler_seuils(hebdo, p, graine, choc)
    e_sim = float(np.quantile(seuils, p.seuil_risque, method="lower"))  # E max au risque ≤ seuil
    l_sim = e_sim * annuite(p.ip, p.nb)
    brut = max(0.0, min(lmax, l_sim)) * decote
    plafond = int(brut // PAS * PAS)
    return plafond, c_p, lmax, l_sim, seuils


def ind_depuis_hebdo(ind: dict, hebdo: np.ndarray) -> dict:
    """Recalcule les indicateurs qui dépendent de la série hebdomadaire (pour neutraliser un facteur)."""
    W = len(hebdo)
    med = float(np.median(hebdo)) if W else 0.0
    moy = float(hebdo.mean()) if W else 0.0
    recent = hebdo[-12:]
    top = np.sort(hebdo)[-max(1, W // 10):] if W else np.zeros(1)
    return {**ind, "encaissement_median": round(med), "encaissement_moyen": round(moy),
            "regularite_cv": round(float(hebdo.std() / moy), 3) if moy else 0.0,
            "tendance_hebdo": round(float(np.polyfit(np.arange(len(recent)), recent, 1)[0] / med), 4) if len(recent) >= 4 and med else 0.0,
            "saisonnalite": round(float(top.mean() / med - 1), 3) if med else 0.0}


def plafond_complet(hebdo, p, graine, ind, fv, choc=0.0, decote=1.0, mod="auto"):
    """v0.2 : plus grand montant ≤ L_max × décote dont le risque CALIBRÉ reste ≤ seuil (ADR 0008).

    Renvoie (plafond, c_p, lmax, l_risque, seuils, risque_au_plafond, calibre). Sans modèle : v0.1.

    Hors hebdomadaire, le modèle (entraîné et évalué sur des échéances hebdomadaires uniquement, non réentraîné)
    est appliqué au montant équivalent : échéance de la période et seuils simulés ramenés à la semaine (÷ w),
    encaissement prudent hebdomadaire. `analyser` marque alors le résultat `risque_valide: false`.
    """
    mod = decision.charger() if mod == "auto" else mod
    plafond, c_p, lmax, l_sim, seuils = _plafond(hebdo, p, graine, choc, decote)
    if mod is None or not c_p:
        return plafond, c_p, lmax, l_sim, seuils, (risque_pour_montant(seuils, plafond, p) if plafond else 0.0), False
    base = decision.profil(ind_depuis_hebdo(ind, hebdo), hebdo, fv)
    hebdo_seul = p.frequence == "hebdomadaire"
    p20 = c_p / (1 + choc) if hebdo_seul else float(np.percentile(hebdo, p.percentile))
    a = annuite(p.ip, p.nb) * p.w  # montant → échéance équivalente par semaine (w = 1 : inchangé)
    s_eq = seuils if hebdo_seul else seuils / p.w
    l_risque, _ = decision.montant_max(mod, base, hebdo, s_eq, p20, 2 * lmax, p.seuil_risque, a, PAS, choc)
    plafond = int(max(0.0, min(lmax, l_risque)) * decote // PAS * PAS)
    r = float(decision.risque(mod, decision.lignes_montant(base, hebdo, s_eq, [plafond / a], p20, choc))[0]) if plafond else 0.0
    return plafond, c_p, lmax, float(l_risque), seuils, r, True


def indicateurs(transactions) -> tuple[dict, np.ndarray, np.ndarray]:
    fv = flux_verifies(transactions)
    hebdo, actifs, debut = series_hebdo(transactions, fv)
    W = len(hebdo)
    med = float(np.median(hebdo)) if W else 0.0
    moy = float(hebdo.mean()) if W else 0.0
    cv = float(hebdo.std() / moy) if moy else 0.0
    recent = hebdo[-12:]
    pente = float(np.polyfit(np.arange(len(recent)), recent, 1)[0] / med) if len(recent) >= 4 and med else 0.0
    top = np.sort(hebdo)[-max(1, W // 10):] if W else np.zeros(1)
    payeurs, montants = np.unique(fv["cp"][fv["verifie"]], return_inverse=True) if fv["verifie"].any() else (np.array([]), np.array([], int))
    part_top = 0.0
    if len(payeurs):
        s = np.bincount(montants, weights=fv["m"][fv["verifie"]])
        part_top = float(s.max() / s.sum())
    ind = {
        "semaines": W,
        "encaissement_median": round(med),
        "encaissement_moyen": round(moy),
        "regularite_cv": round(cv, 3),
        "jours_actifs": round(float(actifs.mean()), 2) if W else 0.0,
        "tendance_hebdo": round(pente, 4),
        "saisonnalite": round(float(top.mean() / med - 1), 3) if med else 0.0,
        "payeurs_distincts": int(len(payeurs)),
        "part_plus_gros_payeur": round(part_top, 3),
        "part_flux_pro": round(fv["part_pro"], 3),
        "exclu_transferts_soi": round(fv["montant_exclu_soi"]),
        "exclu_circulaires": round(fv["montant_exclu_circulaire"]),
        "debut": str(debut) if debut is not None else None,
    }
    return ind, hebdo, fv


def alertes(ind: dict, hebdo: np.ndarray, fv: dict) -> list[dict]:
    """Alertes destinées à l'agent. Elles n'accusent personne : elles demandent un examen humain."""
    out = []
    if fv["nb_circulaires"] > 0:
        out.append({"code": "circulaire", "texte": f"{fv['nb_circulaires']} entrée(s) suivie(s) d'un renvoi d'un montant proche "
                    "au même payeur sous 7 jours. Montants exclus du chiffre d'affaires vérifié."})
    if ind["part_plus_gros_payeur"] > SEUIL_CONCENTRATION:
        out.append({"code": "concentration", "texte": f"Un seul payeur représente {_pc(ind['part_plus_gros_payeur'])} des encaissements vérifiés."})
    if len(hebdo) >= 14:
        base = np.median(hebdo[-14:-2])
        if base > 0 and hebdo[-2:].mean() > 2 * base:
            out.append({"code": "pic_avant_demande", "texte": f"Les deux dernières semaines sont {hebdo[-2:].mean() / base:.1f} fois "
                        "au-dessus de la médiane des 12 précédentes, juste avant la demande."})
    t, m, e = fv["t"], fv["m"], fv["entree"]
    if len(t):
        fin = t.max()
        rec = e & (t > fin - np.timedelta64(28, "D"))
        anc = e & ~rec
        if rec.sum() >= 10:
            ronds = (m[rec] % 10_000 == 0)
            _, cnt = np.unique(m[rec][ronds], return_counts=True)
            part_ronds_rep = cnt[cnt >= 3].sum() / rec.sum() if len(cnt) else 0
            nouveaux = ~np.isin(fv["cp"][rec], fv["cp"][anc])
            if part_ronds_rep > 0.30 or nouveaux.mean() > 0.50:
                out.append({"code": "rafale_ronds", "texte": f"Sur 4 semaines : {_pc(part_ronds_rep)} de montants ronds répétés, "
                            f"{_pc(nouveaux.mean())} de payeurs jamais vus auparavant."})
        heures = (t[e].astype("datetime64[h]").astype(int) % 24)
        if len(heures) and (heures < 5).mean() > 0.20:
            out.append({"code": "horaires", "texte": f"{_pc((heures < 5).mean())} des encaissements entre 0 h et 5 h, hors des horaires habituels."})
    return out


def _pc(x: float) -> str:
    return f"{x * 100:.0f}\u00a0%"


def _fcfa(x: float) -> str:
    return f"{int(round(x)):,}".replace(",", " ") + " FCFA"


def analyser(transactions: list[dict], parametres: dict | Parametres | None = None, graine: int = 0,
             choc_ventes: float = 0.0, montant_souhaite: int | None = None, avec_raisons: bool = True,
             avec_modeles: bool = True) -> dict:
    p = parametres if isinstance(parametres, Parametres) else Parametres.depuis(parametres)
    ind, hebdo, fv = indicateurs(transactions)
    W = len(hebdo)
    decote = min(1.0, W / SEMAINES_PLEINES) if W else 0.0
    mod = decision.charger() if avec_modeles else None
    plafond, c_p, lmax, l_sim, seuils, risque, calibre = plafond_complet(hebdo, p, graine, ind, fv, choc_ventes, decote, mod)
    al = alertes(ind, hebdo, fv)
    # Le modèle lit l'historique réel : le choc de ventes est un scénario sur l'avenir, pas un nouvel historique.
    ml = appliquer(ind, c_p / (1 + choc_ventes), hebdo, fv, risque if calibre else None) if avec_modeles else None
    if ml and ml["alerte_anomalie"]:
        al.append({"code": "anomalie_modele", "texte": f"Le modèle d'anomalies juge ce profil de flux inhabituel "
                   f"(score {ml['score_anomalie']:.1f}). À examiner : cela ne prouve aucune manipulation."})
    plafond_avant_modele = plafond
    provisoire = W < SEMAINES_MIN

    if plafond < PLAFOND_MIN:
        reco = "refus_motive"
    elif provisoire or al or risque >= 0.8 * p.seuil_risque:
        reco = "examen_renforce"
    else:
        reco = "accord"

    raisons = _raisons(hebdo, p, graine, choc_ventes, decote, plafond, ind, fv, c_p, lmax, l_sim, mod) if avec_raisons else []
    effet_modele = 0
    facteur_modele = 1.0
    hebdo_seul = p.frequence == "hebdomadaire"
    per = PERIODE[p.frequence]
    e_plafond = echeance(plafond, p) if plafond else 0.0
    res = {
        "version_moteur": VERSION,
        "graine": int(graine),
        "parametres": asdict(p),
        "choc_ventes": choc_ventes,
        "provisoire": provisoire,
        "indicateurs": ind,
        "encaissement_prudent": round(c_p),
        "echeance_hebdo": round(e_plafond / p.w) if plafond else 0,
        "echeance_supportable": round(c_p * p.m * p.s),
        "l_max": round(lmax),
        "l_simulation": round(l_sim),
        "decote_anciennete": round(decote, 3),
        "plafond": plafond,
        "duree_semaines": p.horizon,
        "cout_total": round(e_plafond * p.nb - plafond) if plafond else 0,
        "frequence": p.frequence,
        "nb_echeances": p.nb,
        "duree_mois": p.duree_mois or round(p.horizon / SEMAINES_PAR_MOIS, 1),
        "echeance": round(e_plafond),
        "taux_periode": p.ip,
        "risque_valide": hebdo_seul,
        "risque": round(risque, 4),
        "recommandation": reco,
        "raisons": raisons,
        "alertes": al,
        "modeles": ml,
        "serie_hebdo": [int(round(x)) for x in hebdo],
        "chaine_calcul": [
            (f"Encaissement prudent (percentile {p.percentile:g}) : {_fcfa(c_p)} par semaine" if hebdo_seul else
             f"Encaissement prudent (percentile {p.percentile:g}, périodes glissantes) : {_fcfa(c_p)} par {per}"),
            f"× part restant après coûts m = {p.m:g} × part prélevable s = {p.s:g} → échéance supportable {_fcfa(c_p * p.m * p.s)}",
            (f"Sur {p.n} semaines au taux {p.i:.2%} par semaine → plafond théorique {_fcfa(lmax)}" if hebdo_seul else
             f"{p.nb} échéances ({p.frequence}) au taux {p.ip:.2%} par {per} → plafond théorique {_fcfa(lmax)}"),
            *([] if hebdo_seul else [f"Risque : modèle hebdomadaire appliqué à l'échéance équivalente par semaine "
                                     f"({_fcfa(e_plafond / p.w)}) — non validé pour cette fréquence"]),
            (f"Simulation de {p.trajectoires} avenirs + modèle de risque calibré (entraîné sur données simulées) : "
             f"montant au risque ≤ {_pc(p.seuil_risque)} → {_fcfa(l_sim)}" if calibre else
             f"Simulation de {p.trajectoires} avenirs : montant au risque ≤ {_pc(p.seuil_risque)} → {_fcfa(l_sim)}"),
            *( [f"Historique de {W} semaines : décote d'ancienneté × {decote:.2f}"] if decote < 1 else [] ),
            f"Le plus bas des deux, arrondi à {_fcfa(PAS)} (la formule n'est jamais dépassée) : {_fcfa(plafond_avant_modele)}",
            f"Plafond proposé : {_fcfa(plafond)}, risque d'impayé annoncé {_pc(risque)}",
        ],
    }
    res["conseils"] = conseils(res, p)
    if montant_souhaite:
        if calibre:
            base = decision.profil(ind, hebdo, fv)
            if hebdo_seul:
                r_souhait = float(decision.risque(mod, decision.lignes_montant(
                    base, hebdo, seuils, [montant_souhaite / annuite(p.i, p.n)], c_p / (1 + choc_ventes), choc_ventes))[0])
            else:  # montant équivalent, comme dans plafond_complet
                r_souhait = float(decision.risque(mod, decision.lignes_montant(
                    base, hebdo, seuils / p.w, [echeance(montant_souhaite, p) / p.w],
                    float(np.percentile(hebdo, p.percentile)), choc_ventes))[0])
        else:
            r_souhait = risque_pour_montant(seuils, montant_souhaite, p)
        res["souhait"] = souhait(montant_souhaite, hebdo, r_souhait, c_p, p, decote * facteur_modele)
    return res


def _raisons(hebdo, p, graine, choc, decote, plafond, ind, fv, c_p, lmax, l_sim, mod=None):
    """Effet de chaque facteur : plafond recalculé (chaîne complète, modèle compris) en neutralisant ce facteur,
    moins plafond actuel."""
    def _plafond(h, p, graine, choc, decote):  # noqa: F811 - même signature, chaîne complète
        return plafond_complet(h, p, graine, ind, fv, choc, decote, mod)

    if len(hebdo) == 0:
        return [{"code": "historique_vide", "effet": 0, "texte": "Aucun encaissement vérifié : pas d'estimation possible pour l'instant."}]
    med = float(np.median(hebdo)) or 1.0
    effets = []
    cv = ind["regularite_cv"]
    if cv > 0:
        regulier = med + (hebdo - hebdo.mean()) * min(1.0, REF_CV / cv)
        effets.append(("regularite", _plafond(np.maximum(regulier, 0), p, graine, choc, decote)[0] - plafond))
    pente = ind["tendance_hebdo"]
    if pente:
        # Sans tendance : les 12 dernières semaines ramenées au niveau du début de la fenêtre.
        k = min(12, len(hebdo))
        sans = hebdo.astype(float).copy()
        sans[-k:] -= pente * med * np.arange(k)
        effets.append(("tendance", _plafond(np.maximum(sans, 0), p, graine, choc, decote)[0] - plafond))
    if decote < 1:
        effets.append(("anciennete", _plafond(hebdo, p, graine, choc, 1.0)[0] - plafond))
    effets.append(("encaissements", 0))
    textes = {
        "regularite": lambda e: ("Vos encaissements varient beaucoup d'une semaine à l'autre, ce qui baisse le plafond ; plus de régularité le ferait monter."
                                 if e > 0 else "Vos encaissements sont réguliers d'une semaine à l'autre, ce qui soutient le plafond."),
        "tendance": lambda e: ("Votre activité baisse ces dernières semaines, ce qui réduit le plafond." if e > 0
                               else "Votre activité progresse ces dernières semaines, ce qui soutient le plafond."),
        "anciennete": lambda e: f"Votre historique est encore court ({len(hebdo)} semaines) : le plafond est réduit tant qu'il n'atteint pas {SEMAINES_PLEINES} semaines.",
        "encaissements": lambda e: f"Même {MAUVAISE[p.frequence]}, vous encaissez au moins {_fcfa(c_p)} : c'est la base du calcul, pas la moyenne.",
    }
    effets.sort(key=lambda x: -abs(x[1]) if x[0] != "encaissements" else 0)
    base = [e for e in effets if e[0] == "encaissements"]
    autres = [e for e in effets if e[0] != "encaissements"]
    choisis = base + autres[:2]
    if lmax < l_sim:
        choisis = choisis[:2] + [("formule", 0)]
        textes["formule"] = lambda e: f"La formule de l'institution limite le prélèvement à {_pc(p.s)} de la marge : c'est elle qui fixe le plafond."
    return [{"code": c, "effet": int(e), "texte": textes[c](e)} for c, e in choisis]


def conseils(res: dict, p: Parametres) -> list[str]:
    ind, out = res["indicateurs"], []
    W = ind["semaines"]
    for palier in (13, 26, 52):
        if W < palier:
            out.append(f"Continuez à encaisser sur votre compte marchand : à {palier} semaines d'historique vérifié "
                       f"({palier // 4} mois environ), l'estimation devient plus fiable.")
            break
    if ind["regularite_cv"] > 0.4:
        out.append("Encaissez par mobile money chaque jour d'ouverture, même les petits montants : des semaines plus régulières font monter le plafond.")
    if ind["part_flux_pro"] < 0.85:
        out.append("Séparez vos dépenses personnelles du compte marchand : seuls les paiements de clients comptent.")
    if ind["part_plus_gros_payeur"] > 0.25:
        out.append("Diversifiez les clients qui vous paient par mobile money : une clientèle variée rassure le prêteur.")
    if ind["tendance_hebdo"] < -0.01:
        out.append("Vos ventes baissent : attendez quelques semaines de reprise avant de demander un montant plus élevé.")
    out.append("Remboursez à l'heure : vos remboursements passés serviront aux prochaines demandes.")
    return out[:4]


def souhait(montant: int, hebdo, risque: float, c_p, p: Parametres, decote: float) -> dict:
    """Ce qui manque pour obtenir le montant souhaité (risque : celui annoncé par le moteur pour ce montant)."""
    c_p_requis = montant / (p.m * p.s * annuite(p.ip, p.nb) * max(decote, 1e-9))
    per = PERIODE[p.frequence]
    manque = []
    if c_p_requis > c_p:
        manque.append(f"Un encaissement prudent de {_fcfa(c_p_requis)} par {per} (aujourd'hui {_fcfa(c_p)}), "
                      f"soit +{_pc((c_p_requis / c_p - 1) if c_p else 0)} de chiffre d'affaires vérifié sur les mauvaises "
                      f"{'périodes' if per != 'semaine' else 'semaines'}.")
    if risque > p.seuil_risque:
        manque.append(f"Des encaissements plus réguliers : à ce montant, le risque d'au moins une échéance manquée est estimé à {_pc(risque)} "
                      f"(limite de l'institution : {_pc(p.seuil_risque)}).")
    if decote < 1:
        manque.append(f"Un historique plus long : {SEMAINES_PLEINES} semaines au lieu de {len(hebdo)}.")
    return {"montant": montant, "risque": round(risque, 4), "echeance": round(echeance(montant, p)),
            "atteignable": not manque, "manque": manque}
