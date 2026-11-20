# 04 — Des expressions TS qui deviennent des instructions Go

**Exercices concernés** : 01 (`if`, `else if`), 04 (plusieurs `return`), 06 et 07 (ternaire,
`||`). **État** : traité.

## La problématique

En TypeScript, une **expression** peut choisir ce qui est calculé :

```ts
DEither.left("negative-operand", one < 0 ? one : two)   // ternaire dans un argument
if (one < 0 || two < 0) { … }                          // two < 0 n'est pas calculé si one < 0
```

Go n'a pas de ternaire. Et comme le transpileur range les opérandes dans des variables avant
l'opération (problématique 01), un `||` traduit tel quel calculerait les deux côtés, alors que JS
ne calcule la partie droite que si elle peut changer le résultat.

## Stratégie de l'équipe : `before` / `result`

Chaque transformer d'expression rend `before` (les instructions Go à exécuter avant) et `result`
(l'expression Go finale). Une expression qui choisit devient une variable remplie par des `if`,
et **les préparations de chaque branche restent dans sa branche** :

| TypeScript | Go généré |
|---|---|
| `c ? a : b` | `var r T` puis `if c { r = a } else { r = b }` (`T` donné par le checker TS) |
| `a \|\| b` | `r := a` puis `if !r { r = b }` |
| `a && b` | `r := a` puis `if r { r = b }` |
| `if (x) … else if (y) …` | les préparations de `y` sont placées **dans** le `else` |
| plusieurs `return` | inchangés. Le type de retour est déduit par le checker TS |

Fichiers du transpileur : `expression/conditional.ts`, `expression/logical.ts`, `statement/if.ts`,
`type/ofExpression.ts`.

## Résultat

- `./scripts/compare.sh 01`, `04`, `06`, `07` : sorties identiques.
- `brouillons/variations-01` : branche sans accolades, `else if` avec un appel, `if` dans une
  fonction (24 lignes identiques à TS).
- `brouillons/variations-06/court-circuit.ts` : `isPositive(1) || isPositive(2)` n'appelle pas
  `isPositive(2)`, et `isPositive(-3) && isPositive(4)` n'appelle pas `isPositive(4)` (sortie
  `1 10 -3 -5 6 30`, comme TS).
- `exemples/flux` : la stratégie écrite à la main donne la même sortie que la référence TS
  (11 lignes).

## Limites

- Conditions non booléennes (`if (count)`, `count || 5`, `n ? a : b`) : refusées avec une erreur
  explicite (`if-condition-is-not-boolean`, `logical-operand-is-not-boolean`,
  `conditional-condition-is-not-boolean`).

Voir aussi : [HISTORIQUE.md](HISTORIQUE.md).
