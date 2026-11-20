# Historique — nombres et types primitifs

## 1. `number` : `int` ou `float64` ?

- **Piste écartée : `int`.** Plus rapide et naturel en Go, mais `3 / 2` vaudrait `1` entre entiers, alors que JS donne `1.5`. Le comportement change.
- **Piste retenue : `float64`.** En JS, tous les nombres sont des doubles IEEE 754. `float64` est exactement ce format : mêmes résultats, mêmes erreurs d’arrondi (`0.1 + 0.2` donne `0.30000000000000004`).

## 2. Un piège découvert : les constantes Go

En vérifiant, nous avons constaté qu’en Go, `0.1 + 0.2` **écrit sans conversion** affiche `0.3`. Go calcule les constantes non typées en précision exacte, puis arrondit le résultat. JS, lui, arrondit chaque nombre avant l’addition.

```go
fmt.Println(0.1 + 0.2)                   // 0.3  (différent de JS)
fmt.Println(float64(0.1) + float64(0.2)) // 0.30000000000000004 (comme JS)
```

Le transpileur convertit donc chaque littéral numérique en `(float64)(…)`. Nous avons vérifié que le Go généré pour `0.1 + 0.2` affiche bien `0.30000000000000004`.

## 3. Les types brandés

Le build a planté sur le type de retour de `DString.to(nombre)` : `string & Number`, une intersection. DuploJS utilise ces « marques » (`number & DNumber.Positive`, `string & DPath.Absolute`) pour encoder des contraintes **uniquement dans les types** : à l’exécution, la valeur est un simple nombre ou une simple chaîne.

- **Règle retenue** : une intersection qui contient un type primitif devient ce primitif. Même chose pour un littéral (`3`, `"negative-operand"`) et une union de littéraux (`1 | 2 | 3`).
- La contrainte n’est pas perdue : TypeScript l’a déjà vérifiée avant la transpilation.

## 4. `null` et `undefined`

Le boilerplate fournissait deux structs vides, `JSNull` et `JSUndefined`. Elles ne coûtent aucun octet et s’affichent `null` en JSON. Pour qu’un champ `undefined` soit omis comme avec `JSON.stringify`, il porte le tag `omitzero` (projet 04, `fail()`).

## 5. Limites

- `boolean` en **type de retour** de fonction n’est pas encore traduit (pas de transformer de type `bool`). Les expressions booléennes, elles, fonctionnent.
- `-0` : le JSON de Go affiche `-0`, alors que `JSON.stringify(-0)` affiche `0`.
