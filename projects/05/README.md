# Projet 05

## Problématique

### Transformer les différentes issues d’un résultat

Dans `index.ts`, `DEither.whenIsRightOtherwise` transforme un succès avec `DArray.coalescing` et fournit une autre valeur pour les autres issues. Comment traduire une transformation qui doit traiter différemment les variantes d’un résultat, puis transmettre la valeur obtenue aux étapes suivantes du pipe ?

### Transformer chaque élément d’une collection

Après cette sélection, `DArray.map` convertit chaque élément en chaîne. Comment traduire une transformation appliquée à tous les éléments d’une collection en conservant son ordre et sa structure ?

## Solution

Dans les extraits, `sd` désigne le paquet `shard_dependencies` et `Result` l'union `sd.Union2[sd.EitherFail, sd.EitherSuccess[float64]]`.

### Transformer les différentes issues d’un résultat (`whenIsRightOtherwise`)

```go
coalescing1 := func(value1 float64) [1]float64 {
	return [1]float64{value1}
}
callback1 := func() [1]float64 {
	operand1 := (float64)(12)
	element1 := -(operand1)
	return [1]float64{element1}
}
whenIsRightOtherwiseResult1 := func(eitherInput1 Result) [1]float64 {
	if eitherInput1.Tag == 1 {
		return coalescing1(eitherInput1.V1.Value)
	} else {
		return callback1()
	}
}
```

- **Aiguillage statique sans réflexion** : la forme curryfiée `DEither.whenIsRightOtherwise(theFunction, otherwiseFunction)` génère une closure Go `whenIsRightOtherwiseResult1` qui inspecte l'étiquette (`Tag == 1` pour le membre `Right`).
- **Unification du type de sortie** :
  - La branche succès applique `DArray.coalescing`, qui pour un `number` produit un tuple `[1]float64`.
  - La branche alternative `() => [-12]` produit également un tuple `[1]float64`.
  - Comme les deux branches renvoient le même type `[1]float64`, la sortie n'a pas besoin d'être enveloppée dans une union : elle produit directement un tuple Go `[1]float64`.

### Transformer chaque élément d’une collection (`DArray.map`)

```go
to1 := func(value2 float64) string {
	return sd.NumberToString(value2)
}
mapResult1 := func(array1 [1]float64) ([]string) {
	return sd.ArrayMap(array1[:], to1)
}
pipeStep1 := whenIsRightOtherwiseResult1(result1)
Sourced_newResult = mapResult1(pipeStep1)
sd.Print(Sourced_newResult, sd.InspectSlice(sd.InspectString))
```

- **Parcours du tuple en slice (`[:]`)** : en Go, un tableau de taille fixe `[1]float64` ne peut pas être passé directement à une fonction attendant une slice dynamique `[]float64`. Le transpileur convertit le tableau en slice par découpage `array1[:]`, sans copie mémoire.
- **Conversion de nombre en chaîne (`NumberToString`)** : `DString.to` est traduit par le helper générique `NumberToString` de `shard_dependencies`.
- **Exécution séquentielle dans le pipe** : `DCommon.pipe` enchaîne l'évaluation des arguments puis compose les appels directs `mapResult1(whenIsRightOtherwiseResult1(result1))`.

## Résultats

La sortie du programme Go généré est identique, octet par octet, à celle de `tsx projects/05/index.ts` :

```
{
  '@duplojs/lang/kind/@DuplojsLangEither/right': null,
  '@duplojs/lang/kind/@DuplojsLangEither/information': 'success',
  '@duplojs/lang/kind/@DuplojsLangEither/value': 3,
  '@duplojs/lang/kind/@DuplojsLangEither/success': null
}
[ '3' ]
```

Reproduction :

```bash
pnpm build:05
cd projects/05/dist && go run .
```

## Limites

- `whenIsRightOtherwise` attend ici que les deux branches produisent des types compatibles (soit un type commun direct comme `[1]float64`, soit une union calculée par le checker).
- `DArray.map` opère sur des collections ordonnées homogènes convertibles en slices.
