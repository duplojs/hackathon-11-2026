# Projet 05

## Problématique

### Transformer les différentes issues d’un résultat

Dans `index.ts`, `DEither.whenIsRightOtherwise` transforme un succès avec `DArray.coalescing` et fournit une autre valeur pour les autres issues. Comment traduire une transformation qui doit traiter différemment les variantes d’un résultat, puis transmettre la valeur obtenue aux étapes suivantes du pipe ?

### Transformer chaque élément d’une collection

Après cette sélection, `DArray.map` convertit chaque élément en chaîne. Comment traduire une transformation appliquée à tous les éléments d’une collection en conservant son ordre et sa structure ?

## Solution

Les extraits viennent de `dist/` (préfixes `Sourced_` et chemins de packages raccourcis pour la lecture).

### Transformer les différentes issues d’un résultat

```go
var Generated_1 []float64
if result.IsRight() {
	Generated_1 = shard_dependencies.ArrayCoalescing(result.GetValue().(float64))
} else {
	Generated_1 = func() ([]float64) {
		return ([]float64{
			-((float64)(12)),
		})
	}()
}
```

`DEither.whenIsRightOtherwise(DArray.coalescing, () => [-12])` est déplié en `if/else` (`transformers/duplojs/either/whenIsRightOtherwise/`) : la branche `Right` applique la première fonction à la valeur, l’autre branche appelle la seconde. Contrairement à `whenIsRight`, les deux branches produisent une valeur du même type : le résultat est typé `[]float64` (lu dans la signature de la fonction de repli), et non `any`.

La fonction de repli `() => [-12]` devient une fonction anonyme Go appelée sur place.

### Transformer chaque élément d’une collection

```go
Generated_2 := shard_dependencies.ArrayMap(Generated_1, shard_dependencies.NumberToString)

func ArrayMap[T any, R any](items []T, fn func(_ T) R) []R {
	result := make([]R, len(items))
	for i, item := range items {
		result[i] = fn(item)
	}
	return result
}
```

`DArray.map(DString.to)` devient le helper générique `ArrayMap` (shared dependency). Le slice résultat est **alloué une seule fois** à la bonne taille (`make`), puis rempli dans l’ordre : pas de `append`, donc pas de réallocation. L’ordre et la taille de la collection sont conservés. `DString.to` passé comme valeur devient `NumberToString` (`strconv.FormatFloat(v, 'f', -1, 64)`, même rendu que `${n}` en JS pour les nombres usuels).

## Variations étudiées

- `whenIsRightOtherwise` en forme curryfiée dans un `pipe` (ce projet) et en forme data-first (projet 09).
- `DArray.map` curryfié dans un `pipe` (ce projet) et data-first (projet 08), avec une fonction par référence (`DString.to`) ou une fonction fléchée (projet 08).

## Résultats observés

Sortie Go identique octet pour octet à celle de Node (affichée en JSON) : l’Either `success` de valeur `3`, puis `["3"]`.

Reproduction :

```sh
pnpm build:05
cd projects/05/dist && go vet ./... && go run .
```

Comparaison avec Node : faire afficher Node en JSON (module préchargé qui remplace `console.info` par `JSON.stringify(v, null, 2)`, voir le README racine), puis `diff` avec la sortie de `go run .`.

## Limites

- La fonction de repli est une fonction anonyme appelée sur place ; que le compilateur Go l’inline n’a pas été vérifié (`go build -gcflags=-m`).
- `NumberToString` diffère de JS pour |x| ≥ 1e21 ou < 1e-6 (JS passe en notation exponentielle) et pour `Infinity`.
