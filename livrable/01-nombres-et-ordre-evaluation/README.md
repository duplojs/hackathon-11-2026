# 01 — Nombres et ordre d'évaluation

**Exercices concernés** : tous (00 à 07). **État** : traité.

## La problématique

En TypeScript, `number` est un flottant IEEE 754 double précision. Une traduction littérale en Go
compile, mais ne donne pas toujours le même résultat que JS :

| Expression | JavaScript | Go avec des constantes | Relevé dans |
|---|---|---|---|
| `0.1 + 0.2` | `0.30000000000000004` | `0.3` (calcul exact à la compilation) | exercice 01 |
| `-0` | `-0` | `+0` (une constante n'a pas de zéro négatif) | exercice 04 |
| `1 / 0` | `Infinity` | ne compile pas (« division by zero ») | exercice 07 |

Il faut aussi garder l'ordre de calcul de JS : la fonction appelée et ses arguments sont évalués
dans l'ordre d'apparition, avant l'appel (problématique posée dès le projet 00).

## Stratégie de l'équipe

1. `number` devient **toujours** `float64` : même format que JS (décision n°3).
2. Chaque opérande et chaque argument est rangé dans une **variable temporaire, dans l'ordre du
   TS**, avant l'opération. Le calcul se fait alors à l'exécution, en `float64`, comme en JS.

```go
// TS : one + two
Generated_7 := Sourced_one
Generated_8 := Sourced_two
Generated_9 := Generated_7 + Generated_8

// TS : -1   (le moins est appliqué à une variable, pour garder -0)
Generated_20 := (float64)(1)
Generated_21 := -(Generated_20)
```

Dans le transpileur, c'est le mécanisme `{ before, result }` : `before` contient les variables
préparées, `result` l'expression finale (`expression/binary.ts`, `expression/prefixUnary.ts`,
`shared/call.ts`).

## Résultat

- `./scripts/compare.sh 00` à `07` : sorties identiques.
- `brouillons/variations-04` : `add(-0, -0)` affiche bien `-0`.
- `exemples/traduction` : la stratégie écrite à la main donne la même sortie que la référence TS
  (`./livrable/verifier.sh 01`).

## Limites

- Les variables temporaires rendent le Go généré long à lire. `go build -gcflags=-m` montre que
  Go les fait disparaître dans l'exercice 01. Pour les autres exercices, c'est supposé, pas mesuré.
- Les `const` du haut d'un fichier deviennent des variables locales de `func init()` : une fonction
  du même fichier ne peut pas les lire, et une variable jamais utilisée fait échouer la compilation
  Go (« declared and not used »).
- Seul le moins unaire est traduit : `!x`, `+x`, `++x` s'arrêtent sur l'erreur « aucun transformer ».

Voir aussi : [HISTORIQUE.md](HISTORIQUE.md).
