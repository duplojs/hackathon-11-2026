# Projet 06

## Problématique

### Représenter et traiter des erreurs identifiées

Dans `add.ts`, un échec contient une information, `negative-operand`, ainsi que la valeur de l’opérande concerné. Dans `index.ts`, `DEither.matchInformation` choisit ensuite un traitement selon que le résultat porte cette information ou l’information `success`. Comment représenter des erreurs identifiées avec leur contexte, puis distinguer les variantes d’un résultat pour appliquer le traitement associé à chacune ?

### Traduire une expression ternaire

Dans `add.ts`, l’expression `one < 0 ? one : two` choisit une valeur selon une condition. TypeScript permet d’écrire cette sélection directement dans une expression, alors que Go ne possède pas d’opérateur ternaire. Comment traduire cette expression tout en conservant le choix de la branche et en produisant une valeur utilisable dans l’appel à `DEither.left` ?

## Solution

Dans les extraits, `sd` désigne le paquet `shard_dependencies` et `Result` le type `sd.Union2[sd.EitherLeft[float64], sd.EitherSuccess[float64]]`.

### Représenter et traiter des erreurs identifiées

**Représentation.** `DEither.left("negative-operand", value)` devient `sd.EitherLeftOf[float64](information, value)`, qui construit une struct `EitherLeft[float64]` avec trois champs : `Left`, `Information` (la chaîne `"negative-operand"`) et `Value` (l’opérande concerné). L’échec garde donc son identifiant et son contexte, typés, sans `any`.

```go
func Sourced_add(Sourced_one float64, Sourced_two float64) Result {
	// ... condition (voir plus bas)
	if logicalResult1 {
		value3 := "negative-operand"
		// ... ternaire (voir plus bas) → ternaryResult1
		value4 := ternaryResult1
		return Result{Tag: 0, V0: sd.EitherLeftOf[float64](value3, value4)}
	}
	one1 := Sourced_one
	two1 := Sourced_two
	return Result{Tag: 1, V1: sd.EitherSuccessOf[float64](one1 + two1)}
}
```

- **Plusieurs chemins de retour** : `add` n’a pas d’annotation de retour. Le checker infère `Left<"negative-operand", number> | Success<number>`, qui devient l’union étiquetée `Result`. Chaque `return` place sa valeur dans le membre correspondant (`Left` → `Tag: 0`, `Success` → `Tag: 1`).
- **`||` avec court-circuit** : `one < 0 || two < 0` n’évalue le côté droit que si le gauche est faux. Les préparations du côté droit sont placées dans un `if !(…)`, ce qui conserve l’ordre et le court-circuit de JavaScript.

  ```go
  left1 := one2 < right1
  logicalResult1 := left1
  if !(logicalResult1) {
  	two2 := Sourced_two
  	right2 := (float64)(0)
  	logicalResult1 = two2 < right2
  }
  ```

**Traitement selon l’information.** `DEither.matchInformation` devient une sélection sur l’étiquette :

```go
callback2 := func() string {
	return "un opérande est négatif"
}
callback3 := func(Sourced_value float64) string {
	return sd.NumberToString(Sourced_value)
}
var matchResult1 string
if result2.Tag == 0 {
	matchResult1 = callback2()
}
if result2.Tag == 1 {
	matchResult1 = callback3(result2.V1.Value)
}
Sourced_message = matchResult1
```

- **Pas de comparaison de chaîne ici** : le membre `Left` de `Result` n’a qu’une information possible (`"negative-operand"`), connue à la compilation grâce au type littéral. L’étiquette suffit donc à choisir le traitement. Une comparaison sur `Information` n’est générée que lorsque plusieurs informations partagent le même membre, comme dans le projet 07 (`"negative-operand"` et `"division-by-zero"`).
- **Callbacks** : chaque traitement reçoit la valeur du résultat s’il déclare un paramètre (`(value) => DString.to(value)`), sinon il est appelé sans argument (`() => "un opérande est négatif"`).
- **Type du résultat** : les deux traitements renvoient une chaîne, donc `message` est un `string` Go.

### Traduire une expression ternaire

```go
one3 := Sourced_one
right3 := (float64)(0)
var ternaryResult1 float64
if one3 < right3 {
	ternaryResult1 = Sourced_one
} else {
	ternaryResult1 = Sourced_two
}
```

Go n’a pas d’opérateur ternaire. `one < 0 ? one : two` devient une variable du type de l’expression (`float64`, donné par le checker), affectée dans un `if` / `else`. La condition est évaluée une seule fois, et seule la branche choisie est évaluée, comme en JavaScript. La variable est ensuite utilisée comme valeur ordinaire dans l’appel à `EitherLeftOf`. La préparation est placée juste avant le `return` qui l’utilise, dans la branche du `if` : elle n’est exécutée que si l’échec est effectivement retourné.

### Transformer le résultat dans un `pipe`

Le reste de `index.ts` reprend des traductions déjà décrites dans les projets 07 et 08 :

- **`isRight`** devient `Tag == 1`. Ici `add(-1, 2)` renvoie l’échec : le premier `print` n’affiche rien.
- **`whenIsRightOtherwise` curryfié** devient une fonction littérale qui applique `DArray.coalescing` à la valeur d’un succès, ou `() => [-12]` sinon. Les deux branches produisent un tuple `[1]float64`.
- **`DArray.map(DString.to)`** parcourt ce tuple comme une slice (`array[:]`), sans copie, et produit un `[]string`.
- **`DCommon.pipe`** applique chaque étape au résultat de la précédente, dans l’ordre.

## Résultats

La sortie du programme Go généré est identique, octet par octet, à celle de `tsx projects/06/index.ts` :

```
[ '-12' ]
un opérande est négatif
```

Le Go a été validé avec `go vet` et `go run`. Aucune modification du transpileur n’a été nécessaire : `DEither.left`, le ternaire, `||`, `matchInformation`, `whenIsRightOtherwise`, `map` et `DString.to` ont été mis en place pour les projets 07 et 08.

Reproduction :

```bash
pnpm build:06
cd projects/06/dist && go run .
```

## Limites

- L’exemple appelle `add(-1, 2)` : la sortie ci-dessus couvre la branche d’échec. Les branches de réussite (`isRight` vrai, traitement `success` de `matchInformation`) sont générées et compilent, mais ne sont pas exercées par cet exemple ; elles le sont par les projets 03 et 07.
- `DEither.left` sans valeur (un seul argument) n’est pas traduit.
