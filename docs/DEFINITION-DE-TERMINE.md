# Définition de terminé — vérification case par case (2026-11-23)

| # | Critère du cahier | Verdict | Preuve |
|---|---|---|---|
| 1 | Un parcours complet se joue sans intervention manuelle dans le code, de l'estimation au remboursement | ✅ | `e2e/parcours.spec.ts` : estimation → simulateur → consentements → envoi à 2 institutions → décision ajustée → offre acceptée → échéancier → paiement → retard → relance → portefeuille → journal. Passe (≈ 40 s). `e2e/demo.spec.ts` rejoue les 9 temps. |
| 2 | Chaque montant affiché est accompagné de ses raisons | ✅ | Estimation, offre et fiche affichent 3 raisons + chaîne de calcul ; effets recalculés identiques à 100 % (`docs/evaluation/README.md` §6) ; test `test_raisons_et_conseils`. |
| 3 | Tout élément simulé est étiqueté comme tel à l'écran | ✅ | Composant `Simule` sur chaque en-tête (`/app`, console, démo), estimation, paiements, relances, identité, modèles, offre, horloge ; vérifié sur les 16 captures de `e2e/qualite.spec.ts`. |
| 4 | La décision de l'agent est enregistrée avec son justificatif | ✅ | Table `decisions` (motif ≥ 10 caractères imposé en base, triggers refusant UPDATE/DELETE) ; tests API `test_2_journal_ajout_seul` ; rejeu identique `test_1` ; E2E vérifie le motif au journal. |
| 5 | Le moteur bat la règle naïve sur des profils jamais vus pendant le réglage | ❌ **Non atteint** (passe de correction, run final 1/3) | `docs/evaluation/runs/run-1.json` (4 000 dossiers, 10 graines neuves, exposition égale) : sur tout le test, moteur 0,93 % d'échéances manquées contre 1,25 % (moyenne × k) et 1,23 % (médiane × k), IC 95 % excluant zéro ✅ ; **sur les archétypes jamais vus (n = 1 130), 1,41 % contre 1,43 % et 1,40 % : pas de différence** (IC contenant zéro) ❌. Calibration ECE 0,089 > 0,05 ❌. |
| 6 | Une alerte de manipulation se déclenche sur un cas injecté | ✅ | Démo : Séna Kpadonou (circulaire) et Koffi Adjovi (pic avant la demande) ; tests `test_alerte_circulaire_et_ca_verifie`, `test_alerte_pic` ; évaluation : 100 % des 58 cas injectés détectés (règles + modèle), 6,1 % de fausses alertes. |

## Règles non négociables du brief

| Règle | Verdict | Preuve |
|---|---|---|
| Décision humaine tracée (proposé, décidé, auteur, date, motif, version, paramètres, graine) | ✅ | Colonnes de `decisions` ; triggers |
| Plafond ≤ formule | ✅ | `min(L_max, montant au risque calibré ≤ seuil)` (ADR 0008) ; tests `test_plafond_sous_lmax`, `test_modele_ne_depasse_jamais_la_formule` ; API refuse un ajustement au-dessus |
| Moteur déterministe, rejouable | ✅ | `test_deterministe`, `GET /dossiers/{id}/rejouer` |
| CA vérifié hors transferts vers soi et circuits | ✅ | `flux.py` ; montants exclus affichés |
| Alerte à l'agent, commerçant jamais accusé | ✅ | `Service.estimation` retire alertes ; route commerçant dédiée sans alertes |
| Consentement par institution, journal d'accès | ✅ | Tables + écrans ; 403 sans consentement |
| Aucune variable sensible | ✅ | Contrôle automatique (évaluation Q7) |
| Relances éthiques | ✅ | Canal, 3 max, 8 h–20 h, destinataire unique |
| Aucune commission, aucun frais commerçant | ✅ | Offre affiche « Frais Kwedo : 0 FCFA » |
| Données synthétiques, entités fictives, aucun logo réel | ✅ | `data/demo/demo.json`, mentions « (fictive) » |
| Score simulé jamais présenté comme réel | ✅ | Avertissements sur modèles, évaluation, page d'accueil |
| Chiffres de marché « à recontrôler » | ✅ | Page d'accueil, SWOT |
| Pas de GPU revendiqué | ✅ | ADR 0001/0002/0003, rétrospective, mesures |

## Critères de la passe de correction (`docs/evaluation/protocole-final.md`, run 1)

| # | Critère | Verdict |
|---|---|---|
| 1 | Moteur < chaque règle naïve, test complet **et** hors réglage | ❌ (✅ test complet, ❌ hors réglage vs médiane × k) |
| 2 | IC 95 % bootstrap excluant zéro, chaque règle | ❌ (✅ test complet, ❌ hors réglage) |
| 3 | ECE ≤ 0,05 et écart moyen ≤ 5 pts | ❌ (0,089 ; 7,9 pts) |
| 4 | Détection ≥ 90 %, fausses alertes ≤ 10 % ; stabilité, raisons, équité | ✅ (100 % ; 4,9 % ; p90 4,6 % ; 100 % ; 40/40) |
| 5 | Tests unitaires et E2E, `next build`, axe | ✅ (27 unitaires, 20 E2E, build OK, 0 violation grave/critique) |

## Conclusion
5 critères du cahier sur 6 sont atteints avec preuve. Le critère 5 ne l'est toujours pas : le moteur bat les règles
naïves sur l'ensemble du jeu de test, mais pas sur les activités jamais vues, et son risque annoncé reste sous-estimé
quand le générateur change. Limite mesurée, documentée, non masquée.

Temps humain : le chronomètre de la console a été retiré sur décision produit. Le gain de temps humain n'a jamais
été mesuré et n'est revendiqué nulle part (protocole prêt : `docs/evaluation/protocole-temps.md`).
