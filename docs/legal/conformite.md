# Conformité — état du prototype (brouillon)

| Exigence (cahier) | Où dans le code | Statut |
|---|---|---|
| Consentement explicite, horodaté, révocable, par institution | `consentements` (ajout seul de lignes accorde/retire), `POST /commercants/{id}/consentements` ; l'accord est donné au dépôt du dossier, pour la seule institution choisie (« J'accepte que <institution> consulte mon dossier de crédit »), signé par code SMS (`POST /commercants/{id}/code-sms`, table `signatures` en ajout seul, chaque essai journalisé) ; retrait dans « Mon compte marchand » (`/app/compte`) | Fait (SMS simulé : code affiché à l'écran en démo) |
| Journal d'accès « qui a vu quoi, quand » | `journal_acces` + triggers refusant UPDATE/DELETE ; `GET /dossiers/{id}` journalise | Fait |
| Journal de décision non modifiable | `decisions` + triggers ; motif ≥ 10 caractères imposé en base | Fait |
| Minimisation | Contreparties hachées par le générateur ; aucun contenu de message | Fait (données simulées) |
| Pas de variable sensible | Schéma et moteur ; contrôle automatique (`ml/evaluate.py` Q7) | Fait |
| Relances éthiques | `Service.executer_relances` : canal, 3 max, 8 h–20 h, destinataire unique | Fait (simulé) |
| Alerte de manipulation à l'agent seulement | `Service.estimation` retire alertes et modèles de la vue commerçant | Fait |
| Contrôle d'accès par rôle, chiffrement, conservation, droits des personnes | — | Phase 2 |

Cadre de référence (à faire confirmer) : loi n° 2017-20 portant Code du numérique (livre V, APDP) ; dispositif
de partage d'information sur le crédit de l'UMOA (instruction BCEAO n° 005-05-2015).
