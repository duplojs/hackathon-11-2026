# Projet 03

## Problématique

### Composer des transformations dans un pipe

Dans `index.ts`, `result` est transmis à `DCommon.pipe`, puis à `DEither.whenIsRight` configuré avec `DArray.coalescing`. Comment traduire une composition où chaque étape reçoit le résultat de l’étape précédente, en respectant l’ordre du pipe et le comportement conditionnel de la transformation ?

## Solution

Dans les extraits, `sd` désigne le paquet `shard_dependencies`, `Result` le type `sd.Union2[sd.EitherFail, sd.EitherSuccess[float64]]` (retour de `add`) et `NewResult` le type `sd.Union2[[1]float64, sd.EitherFail]`.

### Composer des transformations dans un pipe

```go
result1 := Sourced_result
coalescing1 := func(value1 float64) [1]float64 {
	return [1]float64{value1}
}
whenIsRightResult1 := func(eitherInput1 Result) NewResult {
	if eitherInput1.Tag == 1 {
		return NewResult{Tag: 0, V0: coalescing1(eitherInput1.V1.Value)}
	} else {
		return NewResult{Tag: 1, V1: eitherInput1.V0}
	}
}
Sourced_newResult = whenIsRightResult1(result1)
```

- **`DCommon.pipe` sans runtime** : l’entrée (`result`) puis chaque étape sont évaluées dans l’ordre des arguments et stockées dans des variables temporaires. Le pipe devient ensuite une suite d’appels directs : chaque étape reçoit le résultat de la précédente. Aucune fonction `Pipe` générique ni `any` n’est nécessaire, puisque le nombre d’étapes et leurs types sont connus à la compilation.
- **`DEither.whenIsRight` curryfié** : appelé avec une seule fonction, il renvoie la fonction qui attend le résultat. Il devient une fonction littérale Go qui capture la transformation (`coalescing1`) et choisit la branche selon l’étiquette de l’union. Seule la valeur d’un `Right` (`V1.Value`) est transmise à la transformation ; l’échec est renvoyé tel quel, sans être modifié.
- **Type du résultat calculé par le checker** : `whenIsRight` renvoie soit la sortie de la transformation, soit l’échec d’origine. Le checker type donc `newResult` comme un tuple d’un nombre ou un `Fail`, ce qui devient l’union étiquetée `Union2[[1]float64, EitherFail]`. Les membres sont triés dans un ordre canonique, d’où le succès transformé en `V0` et l’échec en `V1` : chaque `return` place sa valeur dans le bon membre.
- **`DArray.coalescing` passé en valeur** : la décision « garder un tableau ou envelopper la valeur » est prise à la compilation selon le type reçu. Ici la valeur est un `number`, donc la fonction générée l’enveloppe dans un tuple Go `[1]float64`, sans test à l’exécution.
- **Conditionnel préservé** : la transformation n’est exécutée que si le résultat est un `Right`. Le comportement de la version curryfiée est identique à celui de l’appel direct du projet 02 (`DEither.whenIsRight(result, DArray.coalescing)`).

### Afficher une union

```go
sd.Print(Sourced_newResult, sd.InspectUnion2(
	func(value [1]float64, indentation int) string {
		return sd.InspectSlice(sd.InspectNumber)(value[:], indentation)
	},
	sd.InspectEitherFail,
))
```

L’inspecteur est choisi à la compilation à partir du type statique : `InspectUnion2` affiche le membre actif selon l’étiquette. Le tuple est parcouru comme une slice (`value[:]`), sans copie.

## Résultats

La sortie du programme Go généré est identique, octet par octet, à celle de `tsx projects/03/index.ts` :

```
{
  '@duplojs/lang/kind/@DuplojsLangEither/right': null,
  '@duplojs/lang/kind/@DuplojsLangEither/information': 'success',
  '@duplojs/lang/kind/@DuplojsLangEither/value': 3,
  '@duplojs/lang/kind/@DuplojsLangEither/success': null
}
[ 3 ]
```

Le Go a été validé avec `go vet` et `go run`. Aucune modification du transpileur n’a été nécessaire : le projet 03 réutilise les traductions de `pipe`, `whenIsRight` et `coalescing` mises en place pour les projets 02, 07 et 08.

Reproduction :

```bash
pnpm build:03
cd projects/03/dist && go run .
```

## Limites

- Dans cet exemple, `add` retourne toujours un succès : la branche d’échec de `whenIsRight` est générée et compile, mais elle n’est pas exercée par la sortie ci-dessus. Le projet 04 (`add(-1, 2)` avec `DEither.fail()`) la couvrira.
- `DArray.coalescing` est résolu à la compilation : une valeur dont le type ne permet pas de savoir s’il s’agit d’un tableau (`unknown`, `any`) n’est pas traduite.
