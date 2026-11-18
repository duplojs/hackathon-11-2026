# Projet 02

## Problématique

### Transmettre une fonction pour transformer conditionnellement un résultat

Dans `index.ts`, `DEither.whenIsRight` reçoit le résultat de `add` et la fonction `DArray.coalescing`. Comment traduire un appel qui reçoit une fonction en argument et applique cette fonction uniquement à la valeur d’un résultat `Right`, tout en conservant inchangés les autres cas ?

## Solution

### Transmettre une fonction pour transformer conditionnellement un résultat

```go
callable := shard_dependencies.EitherWhenIsRight
input := result
mapper := shard_dependencies.ArrayCoalescing
newResult := callable(input, mapper)
```

La fonction appelée et chacun de ses arguments sont d’abord évalués dans leur ordre d’apparition, puis stockés dans des variables temporaires. `DEither.whenIsRight` devient `EitherWhenIsRight`. `DArray.coalescing` devient la fonction `ArrayCoalescing`, transmise comme valeur et non appelée tout de suite. L’appel n’a lieu qu’après ces évaluations.

```go
func EitherWhenIsRight(input any, theFunction func(value any) any) any {
	switch value := input.(type) {
	case eitherRight:
		return theFunction(value.eitherRightValue())
	default:
		return input
	}
}
```

Un résultat `Right` expose sa valeur par `eitherRightValue`. `EitherSuccess` implémente cette méthode, donc un succès entre dans la première branche et la fonction reçue est appliquée uniquement à cette valeur. `EitherFail` ne l’implémente pas : il est renvoyé tel quel. `ArrayCoalescing` conserve une valeur qui est déjà un tableau et enveloppe les autres dans une tranche d’un seul élément. Le résultat de l’appel est donc soit cette tranche, soit le cas d’origine lorsqu’il ne s’agit pas d’un `Right`.
