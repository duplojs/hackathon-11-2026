# Projet 04

## Problématique

### Représenter plusieurs chemins de retour

Dans `add.ts`, la fonction peut retourner un échec lorsque `one` vaut `-1`, ou poursuivre le calcul et retourner un succès. Comment traduire une fonction dont le résultat dépend d’une condition et qui peut se terminer par plusieurs chemins de retour ?

## Solution

Dans les extraits, `sd` désigne le paquet `shard_dependencies`.

### Représenter plusieurs chemins de retour

```go
func Sourced_add(Sourced_one float64, Sourced_two float64) (shard_dependencies.Union2[shard_dependencies.EitherFail, shard_dependencies.EitherSuccess[float64]]) {
	one1 := Sourced_one
	operand2 := (float64)(1)
	right1 := -(operand2)
	if one1 == right1 {
		return (shard_dependencies.Union2[shard_dependencies.EitherFail, shard_dependencies.EitherSuccess[float64]]{
			Tag: 0,
			V0: shard_dependencies.EitherFailOf(),
		})
	}
	one2 := Sourced_one
	two1 := Sourced_two
	return (shard_dependencies.Union2[shard_dependencies.EitherFail, shard_dependencies.EitherSuccess[float64]]{
		Tag: 1,
		V1: shard_dependencies.EitherSuccessOf[float64](one2 + two1),
	})
}
```

- **Inférence du type de retour composé** : `add` n'a pas d'annotation explicite de type de retour. Le type checker infère le type `EitherFail | EitherSuccess<number>`, traduit en Go par l'union étiquetée `Union2[EitherFail, EitherSuccess[float64]]`.
- **Emballage de la valeur dans la bonne branche (`placeValue`)** :
  - Dans la branche conditionnelle `if`, `return DEither.fail()` instancie `EitherFailOf()` et le place dans le membre 0 de l'union (`Tag: 0, V0: ...`).
  - En sortie normale de fonction, `return DEither.success(one + two)` instancie `EitherSuccessOf[float64](...)` et le place dans le membre 1 (`Tag: 1, V1: ...`).
- **Égalité stricte et unaire négatif** : la condition `one === -1` traduit l'opérateur unaire `-` en `-(1)` et la comparaison stricte en `==` entre scalaires `float64`.
- **Propagation dans `index.ts`** :
  - `result` vaut `add(-1, 2)`, ce qui active la branche d'échec (`Tag: 0`).
  - L'instruction `if (DEither.isRight(result))` est compilée en test d'étiquette `Tag == 1` : comme le tag vaut 0, le premier print est ignoré.
  - Dans le pipe, `DEither.whenIsRight(DArray.coalescing)` teste également `Tag == 1` ; comme il s'agit d'un `Fail`, la valeur d'échec est propagée sans modification dans `newResult`.
  - Le résultat final `newResult` est affiché avec `sd.Print` via l'inspecteur d'union, restituant fidèlement l'objet d'échec `fail`.

## Résultats

La sortie du programme Go généré est identique, octet par octet, à celle de `tsx projects/04/index.ts` :

```
{
  '@duplojs/lang/kind/@DuplojsLangEither/left': null,
  '@duplojs/lang/kind/@DuplojsLangEither/information': 'fail',
  '@duplojs/lang/kind/@DuplojsLangEither/value': undefined,
  '@duplojs/lang/kind/@DuplojsLangEither/fail': null
}
```

Reproduction :

```bash
pnpm build:04
cd projects/04/dist && go run .
```

## Limites

- Seuls les retours de type `fail()` sans information spécifique et `success(T)` sont couverts ici.
- L'inférence repose sur le tri canonique des membres de l'union au niveau du `TypeChecker` pour garantir que les index de tags coïncident entre déclarations et retours.
