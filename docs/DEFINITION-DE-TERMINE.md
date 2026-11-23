# Définition de terminé — vérification case par case (2026-11-23)

| # | Critère du cahier | Verdict | Preuve |
|---|---|---|---|
| 1 | Un parcours complet se joue sans intervention manuelle dans le code, de l'estimation au remboursement | ✅ | `e2e/parcours.spec.ts` : estimation → simulateur → consentements → envoi à 2 institutions → décision ajustée → offre acceptée → échéancier → paiement → retard → relance → portefeuille → journal. Passe (≈ 40 s). `e2e/demo.spec.ts` rejoue les 9 temps. |
| 2 | Chaque montant affiché est accompagné de ses raisons | ✅ | Estimation, offre et fiche affichent 3 raisons + chaîne de calcul ; effets recalculés identiques à 100 % (`docs/evaluation/README.md` §6) ; test `test_raisons_et_conseils`. |
| 3 | Tout élément simulé est étiqueté comme tel à l'écran | ✅ | Composant `Simule` sur chaque en-tête (`/app`, console, démo), estimation, paiements, relances, identité, modèles, offre, horloge ; vérifié sur les 16 captures de `e2e/qualite.spec.ts`. |
| 4 | La décision de l'agent est enregistrée avec son justificatif | ✅ | Table `decisions` (motif ≥ 10 caractères imposé en base, triggers refusant UPDATE/DELETE) ; tests API `test_2_journal_ajout_seul` ; rejeu identique `test_1` ; E2E vérifie le motif au journal. |
| 5 | Le moteur bat la règle naïve sur des profils jamais vus pendant le réglage | ❌ **Non atteint** | À montant total prêté égal sur les archétypes jamais vus : moteur 6,1 / 7,9 / 16,2 % d'impayés contre 6,7 / 8,6 / 15,0 % pour « médiane × k » ; écarts dans le bruit (n = 116). Sur tout le test, la règle médiane fait légèrement mieux. Détails et causes : `docs/evaluation/README.md` §1. |
| 6 | Une alerte de manipulation se déclenche sur un cas injecté | ✅ | Démo : Séna Kpadonou (circulaire) et Koffi Adjovi (pic avant la demande) ; tests `test_alerte_circulaire_et_ca_verifie`, `test_alerte_pic` ; évaluation : 100 % des 58 cas injectés détectés (règles + modèle), 6,1 % de fausses alertes. |

## Règles non négociables du brief

| Règle | Verdict | Preuve |
|---|---|---|
| Décision humaine tracée (proposé, décidé, auteur, date, motif, version, paramètres, graine) | ✅ | Colonnes de `decisions` ; triggers |
| Plafond ≤ formule | ✅ | `min(L_max, L_sim)`, modèle en baisse seule ; tests `test_plafond_sous_lmax`, `test_modele_ne_depasse_jamais_la_formule` ; API refuse un ajustement au-dessus |
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

## Conclusion
5 critères sur 6 sont atteints avec preuve. Le critère 5 ne l'est pas : c'est une limite mesurée du moteur sur ce
simulateur, documentée, et non masquée.
