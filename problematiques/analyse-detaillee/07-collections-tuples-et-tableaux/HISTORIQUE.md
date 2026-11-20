# Historique des réflexions · 07 Collections

## 1. Représenter un tuple

| Piste | Problèmes | Décision |
|---|---|---|
| **Slice `[]T`** pour tous les tableaux | Perd la cardinalité : un tuple de 2 éléments passe la compilation. Une allocation par tuple (mesuré : 1 001 allocations contre 1, ≈ 6× plus lent) | ❌ |
| **Struct anonyme** `struct{ V0, V1, V2 float64 }` | Gère les tuples hétérogènes, mais on ne peut pas le parcourir : `map` sur un tuple devient impossible sans code spécifique | ❌ Pour les tuples homogènes |
| **Tableau Go `[N]T`** | Uniquement pour les tuples **homogènes** (un tableau Go n'a qu'un type d'élément) | ✅ **Retenu** |

**Ce que `[N]T` apporte** :

- **Cardinalité vérifiée** par le compilateur Go (`cannot use [2]float64 as [3]float64`).
- **Position conservée** : `tuple[2]` est le diviseur, comme en TypeScript.
- **Stockage par valeur** : `[][3]float64` est un seul bloc mémoire contigu, ce qui favorise le cache CPU.
- **Interopérabilité gratuite** : `tuple[:]` donne une slice qui partage le même stockage, sans copie, pour réutiliser `ArrayMap`.

## 2. Différencier `[1, 2, 1]` (tuple) de `[1, 2, 1]` (tableau)

Un littéral `[1, 2, 1]` n'a pas de forme propre : c'est le **contexte** qui décide (annotation `[number, number, number][]`, paramètre attendu…). Le type Go d'un littéral est donc celui que le **checker** lui attribue. Un littéral vide est typé `never[]` par le checker : il prend alors le type attendu par le contexte.

## 3. `DArray.map`

| Piste | Problème | Décision |
|---|---|---|
| `Map(array any, fn any) any` par réflexion (première version) | Voir la problématique 03 | ❌ |
| Boucle `for` émise en ligne à chaque usage | Duplique le code. La forme curryfiée (`map(fn)` dans un `pipe`) devient plus difficile | ❌ |
| **`ArrayMap[T, U]` générique partagé** + `ArrayMapWith` pour la forme curryfiée | — | ✅ |

**Allocation unique** : la sortie a toujours la longueur de l'entrée, d'où `make([]U, len(array))` plutôt que des `append` successifs (mesuré ≈ 2,5× plus rapide, 2 allocations contre 13).

**Types DuploJS de longueur** : `map` sur un `readonly [number]` est typé `readonly (string & Number)[] & LengthEqual<1>`. `Number` et `LengthEqual<1>` sont des marqueurs qui n'existent qu'à la compilation, donc le résultat Go est `[]string`. On perd volontairement l'information de longueur, parce que la garder demanderait un `ArrayMap` par taille.

**Dépendances émises à la demande** : le runtime partagé (`shard_dependencies`) ne contient que les fonctions réellement utilisées par le programme.

## 4. `DArray.coalescing`

`coalescing(x)` renvoie `x` si c'est un tableau, sinon `[x]`. En JavaScript, c'est un test à l'exécution. Ici, le type de `x` est connu à la compilation : on génère directement l'une ou l'autre forme. Quand le type ne permet pas de décider (`unknown`, `any`, ou une union mêlant tableau et non-tableau), on émet une **erreur explicite**.

## 5. Vision à long terme

- **Tuples hétérogènes** (`[string, number]`) : struct générique par arité, `Tuple2[A, B]{V0 A; V1 B}`. Le schéma « recevoir puis lier » de la déstructuration (problématique 04) s'y applique sans changement.
- **Tuples à reste** (`[number, ...number[]]`) : struct `{ Head [1]T; Rest []T }`.
- **Fusion de `map` successifs** : `pipe(xs, map(f), map(g))` → une seule boucle qui applique `g(f(x))`, ce qui évite un tableau intermédiaire.
- **Garder `LengthEqual<N>`** : produire `[N]U` en sortie quand la longueur est connue, grâce à une variante `ArrayMapFixed` par taille utilisée.
