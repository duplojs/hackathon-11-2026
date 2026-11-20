# 01 · Nombres et ordre d'évaluation

**Projets concernés** : 01, puis tous les autres. Cette problématique sert de base à toutes les autres.

## Problématique

`one + two` paraît trivial à traduire, mais deux règles de JavaScript n'ont pas d'équivalent automatique en Go :

1. **Représentation numérique** : `number` est toujours un flottant IEEE 754 double précision, et les calculs se font à l'exécution.
2. **Ordre d'évaluation** : JavaScript évalue les opérandes et les arguments strictement de gauche à droite, effets de bord compris. Go ne garantit cet ordre qu'entre des appels de fonction : l'ordre entre la lecture d'une variable et un appel reste non spécifié.

Une traduction ligne à ligne compile, mais elle peut produire un résultat différent sans aucune erreur. C'est la pire catégorie de bug pour un transpileur.

## Stratégie retenue

| Règle JS | Traduction Go | Pourquoi |
|---|---|---|
| `number` | `float64` | Même format IEEE 754 binaire 64 bits, mêmes arrondis |
| Littéral `0.1` | `float64(0.1)` dans une variable | Empêche l'arithmétique **exacte** des constantes Go (`0.1 + 0.2 == 0.3`) |
| `a + f()` | `left := a` / `right := f()` / `left + right` | Ordre explicite, identique au source |
| `f(x, g())` | fonction, puis chaque argument, dans des temporaires | Un argument peut émettre ses préparations sans réordonner les effets |

Le mécanisme est commun à tout le transpileur : chaque transformer renvoie `{ before, result }`, c'est-à-dire **les instructions de préparation** puis **l'expression finale**. Le parent concatène les `before` dans l'ordre du source. C'est une mise en *A-normal form* (ANF) : toute sous-expression non triviale reçoit un nom.

## Exemple

```bash
pnpm exec tsx problematiques/analyse-detaillee/01-nombres-et-ordre-evaluation/exemples/exemple.ts
cd problematiques/analyse-detaillee && go run ./01-nombres-et-ordre-evaluation/exemples
```

| | TypeScript | Go naïf | Go retenu |
|---|---|---|---|
| `0.1 + 0.2` | `0.30000000000000004` | `0.3` ❌ | `0.30000000000000004` ✅ |
| `-0` | `-0` | `0` ❌ | `-0` ✅ |
| `counter + bump()` | `12` | `22` ❌ (Go 1.27, gc) | `12` ✅ |

Voir [HISTORIQUE.md](HISTORIQUE.md) pour les pistes écartées.
