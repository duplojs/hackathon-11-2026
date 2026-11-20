# Projet 04

## Problématique

### Représenter plusieurs chemins de retour

Dans `add.ts`, la fonction peut retourner un échec lorsque `one` vaut `-1`, ou poursuivre le calcul et retourner un succès. Comment traduire une fonction dont le résultat dépend d’une condition et qui peut se terminer par plusieurs chemins de retour ?

## Solution

### Représenter plusieurs chemins de retour

```go
func Sourced_add(Sourced_one float64, Sourced_two float64) shard_dependencies.Either {
	Generated_14 := Sourced_one
	Generated_15 := -((float64)(1))
	if Generated_14 == Generated_15 {
		return shard_dependencies.EitherFailOf()
	}
	Generated_17 := Sourced_one
	Generated_18 := Sourced_two
	Generated_19 := Generated_17 + Generated_18
	return shard_dependencies.EitherSuccessOf(Generated_19)
}
```

La fonction n’a pas de type de retour annoté. Le checker TypeScript l’infère : `Fail | Success<number>`. Comme au projet 01, cette union de types Either devient l’interface Go `Either`. Chaque `return` renvoie sa propre variante (`EitherFail` ou `EitherSuccess[float64]`), et Go la convertit implicitement vers l’interface. **Aucune règle propre aux `return` multiples n’a été nécessaire** : c’est la conséquence directe du choix d’une interface au projet 01.

Le `if` et ses deux chemins réutilisent le transformer `if` du projet 01. Le `return` placé dans la branche reste dans son bloc : le second chemin n’est atteint que si la condition est fausse, comme en TypeScript.

Trois éléments ont été ajoutés :

1. **La variante `EitherFail`** (`either/fail/`). C’est un type Go concret de même forme que l’objet de `DEither.fail()` : marques `left` et `fail`, information `"fail"`, valeur `undefined`. Elle implémente `IsRight()`, qui retourne `false`. `DEither.fail()` devient `shard_dependencies.EitherFailOf()`, et le type `DEither.Fail` seul devient `shard_dependencies.EitherFail`.
2. **La valeur `undefined`**. Le champ `Value` est de type `JSUndefined` avec le tag `omitzero`. Comme `JSUndefined.IsZero()` retourne `true`, le champ est omis du JSON, exactement comme `JSON.stringify` omet une propriété `undefined`.
3. **L’opérateur unaire** (`expression/prefixUnary.ts`). En TypeScript, `-1` n’est pas un littéral négatif : c’est l’opérateur `-` appliqué à `1`. Il est traduit par `-((float64)(1))`. `+x` et `!x` sont pris en charge de la même façon, car leur sens est identique en Go sur `float64` et `bool`.

`one === -1` réutilise le transformer binaire existant (`===` devient `==`). La comparaison de deux `float64` en Go suit IEEE 754, comme en JS (`NaN != NaN`).

## Variations étudiées

- Type de retour inféré (cas du projet) ou annoté (`Success<number> | Fail`, cas du projet 01) : même traduction.
- Plus de deux `return`, ou un `return` dans un `else` / `else if` : même mécanisme, puisque chaque `return` est converti vers l’interface.
- Un seul chemin de retour qui ne renvoie que `fail()` : le type est `Fail` seul, traduit par `EitherFail`, sans interface.
- `~x`, `++x` et `--x` ne sont pas pris en charge : `~` agit sur des entiers 32 bits en JS, et `++`/`--` sont des affectations.

## Résultats observés

Le `index.ts` du projet est celui du projet 03 avec `add(-1, 2)`. Il utilise `DCommon.pipe`, `DEither.whenIsRight` et `DArray.coalescing`, traités dans les projets 02 et 03. Depuis l’intégration de ces projets, `pnpm build:04` transpile le projet complet : le Go compile, passe `go vet`, et sa sortie est identique à celle de Node (affichée en JSON).

`add.ts` a été vérifié avec un `index.ts` réduit (`print(add(-1, 2))`, `print(add(1, 2))`). Le Go compile, `go vet` ne signale rien, et la sortie Go est **identique octet pour octet** à `JSON.stringify(valeur, null, 2)` côté Node :

```json
{
  "@duplojs/lang/kind/@DuplojsLangEither/left": null,
  "@duplojs/lang/kind/@DuplojsLangEither/information": "fail",
  "@duplojs/lang/kind/@DuplojsLangEither/fail": null
}
```

Node (`util.inspect`) affiche en plus `value: undefined`. Le format JSON n’a pas d’`undefined`, comme `JSON.stringify`.

## Limites

- Allocation : chaque `return` convertit une variante vers l’interface, ce qui peut l’allouer sur le tas. `EitherFail` ne contient que des champs de taille nulle et un `string` constant ; le coût n’est pas mesuré.
- `-0` : le JSON de Go affiche `-0`, comme `console.log` de Node, alors que `JSON.stringify(-0)` affiche `0` (vérifié). La comparaison avec `JSON.stringify` n’est donc pas exacte pour `-0` (non rencontré ici).
