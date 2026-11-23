# Règles de calcul figées (version moteur `0.1.0`)

Toutes les grandeurs en FCFA entiers. Semaine = lundi à dimanche.

## 1. Chiffre d'affaires vérifié

Entrées hebdomadaires = somme des transactions `sens = entree` et `nature = paiement_client`, **moins** :
- les transferts vers soi-même (`nature = transfert_soi`) ;
- les entrées circulaires : entrée d'un payeur P suivie, dans les 7 jours, d'une sortie vers P d'un montant à ±10 %.

## 2. Indicateurs

| Indicateur | Calcul |
|---|---|
| `C_p` encaissement prudent | percentile `p` (paramètre) des encaissements hebdo vérifiés |
| médiane | médiane hebdo |
| régularité | écart-type / moyenne hebdo (CV) |
| jours actifs | moyenne des jours avec ≥1 encaissement par semaine |
| tendance | pente relative (régression linéaire / médiane) sur les 12 dernières semaines |
| saisonnalité | (moyenne des 10 % meilleures semaines / médiane) − 1 |
| diversité | nb de payeurs distincts, part du plus gros payeur |
| part pro | entrées pro / entrées totales |
| ancienneté | nb de semaines d'historique |

## 3. Capacité et plafond

```
R     = C_p × m × s
L_max = R × (1 − (1 + i)^−n) / i
```

## 4. Simulation

- `N = 2000` trajectoires (paramétrable), graine enregistrée.
- Chaque trajectoire : blocs de 4 semaines réelles tirés avec remise jusqu'à `n` semaines ; chocs :
  baisse durable (prob. 15 %, −20 à −50 % à partir d'une semaine aléatoire), semaine sans vente (prob. 3 % / semaine).
- Une option `choc_ventes` (ex. −0,30) multiplie toute la trajectoire (curseur « mes ventes baissent de 30 % »).
- Échéance pour un montant `L` : `E(L) = L × i / (1 − (1+i)^−n)`.
- Paiement d'une semaine : possible si `flux × m × s_max ≥ E` où `s_max = min(1, 2 s)` + réserve reportée
  (le surplus de la semaine reste disponible). Défaut de trajectoire = au moins une échéance manquée.
- **Plafond proposé** = plus grand `L ≤ L_max` (pas de 5 000 FCFA, recherche dichotomique) tel que risque ≤ seuil.

## 5. Recommandation

- `examen_renforce` si ancienneté < 12 semaines (estimation provisoire), alerte de manipulation, ou risque ≥ 0,8 × seuil.
- `refus_motive` si plafond < 25 000 FCFA.
- sinon `accord`. L'agent a toujours le dernier mot.

## 6. Raisons

Chaque facteur (régularité, tendance, ancienneté, part pro, concentration) est neutralisé à une valeur de référence ;
l'écart de plafond qui en résulte est l'effet affiché. Les trois plus gros effets forment les « trois raisons ».

## 7. Alertes (destinées à l'agent uniquement)

| Code | Règle |
|---|---|
| `circulaire` | ≥ 1 circuit détecté (§1) |
| `concentration` | plus gros payeur > 40 % des entrées |
| `pic_avant_demande` | moyenne des 2 dernières semaines > 2 × médiane des 12 précédentes |
| `rafale_ronds` | > 30 % des entrées sur 4 semaines sont des montants ronds (multiple de 10 000) répétés, ou > 50 % de nouveaux payeurs |
| `horaires` | > 20 % des entrées entre 0 h et 5 h |

Une alerte ne réduit pas automatiquement le plafond ; elle oriente vers un examen humain.
