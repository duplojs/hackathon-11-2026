# Projet 02

## Problématique

### Transmettre une fonction pour transformer conditionnellement un résultat

Dans `index.ts`, `DEither.whenIsRight` reçoit le résultat de `add` et la fonction `DArray.coalescing`. Comment traduire un appel qui reçoit une fonction en argument et applique cette fonction uniquement à la valeur d’un résultat `Right`, tout en conservant inchangés les autres cas ?

## Solution

Les extraits viennent de `dist/` (préfixes `Sourced_` et chemins de packages raccourcis pour la lecture).

### Transmettre une fonction pour transformer conditionnellement un résultat

```go
result := add.add((float64)(1), (float64)(2))
// …
Generated_1 := result
var Generated_2 any
if Generated_1.IsRight() {
	Generated_2 = shard_dependencies.ArrayCoalescing(Generated_1.GetValue().(float64))
} else {
	Generated_2 = Generated_1
}
newResult := Generated_2
```

`DEither.whenIsRight(result, DArray.coalescing)` n’est pas traduit par un appel à une fonction générique qui recevrait une fonction : l’appel est connu à la compilation, donc il est **déplié** en un `if` sur `IsRight()` (`transformers/duplojs/either/whenIsRight/`).

- Dans le cas `Right`, la valeur est lue avec `GetValue()` puis convertie vers le type attendu par la fonction (`float64`, donné par le checker), et la fonction est appelée directement.
- Dans les autres cas, le résultat est transmis inchangé, comme le fait le runtime DuploJS (`whenIsRight` renvoie son entrée si elle n’est pas `Right`).
- `DArray.coalescing` passé comme valeur devient l’appel du helper générique `ArrayCoalescing[T](v T) []T` (shared dependency), qui place la valeur dans un slice. Go infère `T` à l’appel.

Ce dépliage évite une closure et un appel indirect. Le résultat de `whenIsRight` est l’union « valeur transformée ou Either d’origine » : il est déclaré `any` (voir Limites).

## Variations étudiées

- Forme data-first `whenIsRight(either, fn)` (ce projet) et forme curryfiée `whenIsRight(fn)` dans un `pipe` (projet 03) : les deux sont reconnues.
- Fonction passée par référence (`DArray.coalescing`, ce projet), fonction fléchée (projets 05, 08) ou helper DuploJS : traitées par `transformers/duplojs/callable.ts`.
- Fonction reconnue par son symbole résolu par le checker, pas par son nom : un import renommé fonctionne.

## Résultats observés

La sortie Go est identique octet pour octet à celle de Node (affichée en JSON) : l’Either `success` de valeur `3`, puis `[3]`.

Reproduction :

```sh
pnpm build:02
cd projects/02/dist && go vet ./... && go run .
```

Comparaison avec Node : faire afficher Node en JSON (module préchargé qui remplace `console.info` par `JSON.stringify(v, null, 2)`, voir le README racine), puis `diff` avec la sortie de `go run .`.

## Limites

- Le résultat de `whenIsRight` est typé `any` : le type précis (`[]float64 | Either`) est perdu, et toute lecture ultérieure demande une assertion à l’exécution. Piste : calculer l’union avec le checker.
- Lire la valeur passe par `GetValue() any` : la valeur est boxée puis convertie (`.(float64)`) à l’exécution.
