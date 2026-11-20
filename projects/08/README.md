# Projet 08

## Problématique

### Traiter une collection de calculs

Dans `index.ts`, chaque entrée de `inputs` décrit un calcul distinct. `DArray.map` produit un résultat pour chaque entrée, puis un autre `map` transforme ces résultats en valeurs affichables selon leur issue. Comment appliquer une transformation à chaque élément d’une collection tout en conservant le résultat propre à chaque calcul, y compris lorsqu’il s’agit d’un échec ?

### Représenter un tableau de tuples

`inputs` est typé comme un tableau de tuples `[number, number, number]`. Chaque tuple contient un nombre fixe de valeurs dont la position donne le rôle. Comment représenter cette structure en Go sans perdre sa cardinalité ni l’association entre chaque position et sa signification ?

### Déconstruire une entrée structurée dans un paramètre

La fonction passée au premier `DArray.map` reçoit un tuple et le décompose directement dans son paramètre avec `([one, two, divisor])`. Comment traduire cette déconstruction positionnelle en Go, qui ne permet pas cette forme de liaison dans les paramètres d’une fonction, tout en associant chaque valeur à la bonne variable ?

## Solution

Les extraits viennent de `dist/` (préfixes `Sourced_` et chemins de packages raccourcis pour la lecture).

### Représenter un tableau de tuples

```go
inputs := ([]shard_dependencies.Tuple3[float64, float64, float64]{
	shard_dependencies.Tuple3Of((float64)(1), (float64)(2), (float64)(1)),
	// …
})

type Tuple3[T0 any, T1 any, T2 any] struct {
	V0 T0
	V1 T1
	V2 T2
}
```

`[number, number, number][]` devient un slice de `Tuple3[float64, float64, float64]` (`transformers/type/tuple.ts`, `tupleSharedDependency.ts`). Une struct générique par arité (`Tuple2`, `Tuple3`…) conserve **la cardinalité et le type de chaque position** : un `[]float64` aurait perdu la taille fixe, et un `[]any` le typage. Une méthode `MarshalJSON` rend le tuple comme un tableau JSON, identique à `JSON.stringify`.

### Déconstruire une entrée structurée dans un paramètre

```go
func(Generated_1 shard_dependencies.Tuple3[float64, float64, float64]) (shard_dependencies.Either) {
	one := Generated_1.V0
	two := Generated_1.V1
	divisor := Generated_1.V2
	// …
}
```

Go n’a pas de déstructuration dans les paramètres. La fonction fléchée reçoit donc un seul paramètre, le tuple, et chaque nom est lié à sa position par une déclaration en tête de corps (`transformers/expression/arrowFunction.ts`).

### Traiter une collection de calculs

```go
calculations := shard_dependencies.ArrayMap(inputs, func(…) (shard_dependencies.Either) { … })

Generated_5 := shard_dependencies.ArrayMap(calculations, func(Generated_3 shard_dependencies.Either) (string) {
	var Generated_4 string
	if Generated_3.IsRight() {
		Generated_4 = shard_dependencies.NumberToString(Generated_3.GetValue().(float64))
	} else {
		Generated_4 = func() (string) { return "échec" }()
	}
	return Generated_4
})
```

Le premier `map` produit un `[]Either` : **chaque calcul garde son propre résultat**, succès ou échec, au lieu d’interrompre la collection. Le second `map` reçoit `whenIsRightOtherwise` en forme curryfiée, déplié en `if/else` à l’intérieur de la fonction appliquée à chaque élément.

## Variations étudiées

- Déstructuration d’un tuple (`p.V0`), d’un tableau (`p[0]`) et d’un objet (`({ x }) =>`, paramètre struct) : prises en charge par `arrowFunction.ts`. Seul le tuple est couvert par un projet.
- `map` data-first avec une fonction fléchée (ce projet) et curryfié dans un `pipe` (projet 05).

## Résultats observés

Sortie Go identique octet pour octet à celle de Node (affichée en JSON) : `["3", "3", "échec"]`. Le troisième calcul (division par zéro) échoue seul.

Reproduction :

```sh
pnpm build:08
cd projects/08/dist && go vet ./... && go run .
```

Comparaison avec Node : faire afficher Node en JSON (module préchargé qui remplace `console.info` par `JSON.stringify(v, null, 2)`, voir le README racine), puis `diff` avec la sortie de `go run .`.

## Limites

- Les structs générées vont de `Tuple2` à `Tuple8` : un tuple de plus de 8 positions n’est pas pris en charge.
- La déstructuration d’objet suppose que les noms de champs Go sont ceux du source avec une majuscule ; non couverte par un projet.
