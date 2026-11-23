# Registre des risques juridiques (brouillon)

| Risque | Source | Parade de conception | État prototype |
|---|---|---|---|
| Traitement de données personnelles sans base légale | Loi n° 2017-20 (Code du numérique), livre V | Consentement explicite, horodaté, révocable, par institution | Construit (table `consentements`, écran « Mon dossier ») |
| Partage d'informations de crédit sans accord écrit | Dispositif BIC de l'UMOA (Creditinfo UMOA) | Aucun envoi sans consentement actif (403 sinon) ; export bureau de crédit hors prototype | Construit ; export = phase 2 |
| Décision automatisée contestée | Droits d'opposition et d'information | Décision humaine obligatoire, justificatif tracé, raisons lisibles | Construit |
| Discrimination | Principe d'égalité | Aucune variable sensible en entrée ; contrôle automatique du code | Construit, mesuré (éval. Q7) |
| Relances abusives / harcèlement | Pratiques rapportées chez des prêteurs numériques | Canal choisi, 3 messages max, 8 h–20 h, jamais l'entourage | Construit (règles codées) |
| Frais payés d'avance (schéma de fraude) | Confiance, protection du consommateur | Aucun frais côté commerçant, aucune commission sur le montant | Engagement produit |
| Exercice illégal d'activité de crédit | Réglementation bancaire UMOA | Kwedo ne prête pas : institutions agréées uniquement | Positionnement |
| Hébergement / transfert hors du Bénin | Règle non trouvée | À vérifier auprès de l'APDP avant pilote | Ouvert |
| Usurpation d'identité | Cas rapportés (CIO Mag, juin 2026) | Vérification d'identité renforcée | Simulé ; phase 2 |
| Données mobile money d'un tiers | Accord opérateur requis | Accès autorisé par le commerçant, canal à négocier | Simulé |

## Accès et cloisonnement (ADR 0009)

**Le choix de profil n'est pas une authentification : pas de mot de passe.** Le cloisonnement est réel (appliqué
par l'API, testé), mais n'importe quel visiteur peut choisir n'importe quel profil. Acceptable uniquement sur
données fictives.

| Risque | Gravité | Parade dans le prototype | Reste à faire avant pilote |
|---|---|---|---|
| Usurpation de profil (aucun mot de passe) | Critique hors démo | Données 100 % fictives ; avertissement sur `/connexion` | Authentification réelle (OTP SMS commerçant, comptes nominatifs + 2FA prêteurs) |
| Une institution lit ou modifie les données d'une autre | Élevée | Règles par route, institution lue dans la session signée, 404 hors périmètre ; tests croisés | Revue externe, tests d'intrusion |
| Fuite des réglages ou du risque vers le commerçant | Moyenne (secret des affaires) | Champs internes retirés, textes moteur réécrits à la frontière ; test dédié | Limitation de débit contre l'inférence par essais répétés |
| Admin qui lit des données personnelles | Élevée (minimisation, loi 2017-20) | Agrégats et journal expurgé seulement | Journalisation des accès admin |
| Vol de session | Moyenne | Cookie HttpOnly, SameSite=Lax, HMAC, 12 h | HTTPS + `Secure`, révocation côté serveur, secret fixe et protégé |
| Énumération des numéros à l'inscription (409 si déjà inscrit) | Faible | — | Réponse uniforme + vérification par OTP |
