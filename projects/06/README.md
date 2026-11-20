# Projet 06

## Problématique

### Représenter et traiter des erreurs identifiées

Dans `add.ts`, un échec contient une information, `negative-operand`, ainsi que la valeur de l’opérande concerné. Dans `index.ts`, `DEither.matchInformation` choisit ensuite un traitement selon que le résultat porte cette information ou l’information `success`. Comment représenter des erreurs identifiées avec leur contexte, puis distinguer les variantes d’un résultat pour appliquer le traitement associé à chacune ?

### Traduire une expression ternaire

Dans `add.ts`, l’expression `one < 0 ? one : two` choisit une valeur selon une condition. TypeScript permet d’écrire cette sélection directement dans une expression, alors que Go ne possède pas d’opérateur ternaire. Comment traduire cette expression tout en conservant le choix de la branche et en produisant une valeur utilisable dans l’appel à `DEither.left` ?

## Solution

### Représenter des erreurs identifiées

```go
type EitherLeft[T any] struct {
	Left        JSNull `json:".../left"`
	Information string `json:".../information"`
	Value       T      `json:".../value"`
}

type Either interface {
	IsRight() bool
	GetInformation() string
	GetValue() any
}
```

`DEither.left("negative-operand", v)` devient `EitherLeftOf("negative-operand", v)`. C’est une troisième variante, construite sur le même modèle que `EitherSuccess[T]` et `EitherFail` : une struct de même forme que l’objet JS, dont l’information (`"negative-operand"`) et la valeur typée (`float64`) sont conservées. Go infère `T` à partir de la valeur.

L’interface `Either` gagne deux méthodes, `GetInformation()` et `GetValue()`, implémentées de la même façon par toutes les variantes (`createEitherMethods`). Le code qui traite une union n’a donc pas besoin de savoir quelle variante porte quelle information.

### Distinguer les variantes avec `matchInformation`

```go
Generated_6 := Sourced_result
Generated_8 := func() string { return "un opérande est négatif" }
Generated_11 := func(Sourced_value float64) string {
	Generated_10 := Sourced_value
	return shard_dependencies.NumberToString(Generated_10)
}
var Generated_7 string
switch Generated_6.GetInformation() {
case "negative-operand":
	Generated_7 = Generated_8()
case "success":
	Generated_7 = Generated_11(Generated_6.GetValue().(float64))
}
Sourced_message := Generated_7
```

- Chaque clé du matcher devient un `case` d’un `switch` sur l’information. C’est la traduction la plus directe d’un choix entre des chaînes.
- L’entrée puis chaque callback sont évalués **avant** le `switch`, dans l’ordre du source, comme en JS où l’objet matcher est construit avant l’appel.
- Un callback qui déclare un paramètre reçoit `GetValue()`, converti vers le type de ce paramètre (`.(float64)`). Ce type est donné par le checker, puisque le source ne l’écrit pas : `(value) => …`.
- Le type du résultat (`string`) vient aussi du checker. Le résultat de `DString.to(nombre)` est typé `string & Number` (un string « brandé » par une contrainte DuploJS) : la marque n’existe que dans les types, donc ce résultat est traduit par `string`.

Pièces génériques ajoutées pour ce traitement :

- **Fonction fléchée** (`expression/arrowFunction.ts`) : `(value) => expr` devient `func(value T) R { return expr }`, avec les types lus dans le checker.
- **Littéral de chaîne** (`expression/stringLiteral.ts`), et **types textuels** (`type/string.ts`) : `string`, littéraux, templates, strings brandés et leurs unions deviennent `string`.
- **`DString.to(nombre)`** devient `NumberToString`, c’est-à-dire `strconv.FormatFloat(v, 'f', -1, 64)` : le plus petit nombre de chiffres qui redonne le même `float64`, comme JS (`3` donne `"3"`, `0.1` donne `"0.1"`).
- **`print` d’une chaîne** : affichée brute (`fmt.Println`), comme `console.info("texte")`, au lieu d’être entourée de guillemets JSON.

### Traduire une expression ternaire

```go
Generated_24 := Sourced_one
Generated_25 := (float64)(0)
var Generated_26 float64
if Generated_24 < Generated_25 {
	Generated_26 = Sourced_one
} else {
	Generated_26 = Sourced_two
}
return shard_dependencies.EitherLeftOf(Generated_27, Generated_26)
```

Go n’a pas d’opérateur ternaire. On déclare la variable résultat, typée par le checker (le type de l’expression entière), puis un `if/else` affecte la branche choisie. Les préparations de chaque branche restent **dans** son bloc, donc seule la branche choisie est évaluée, comme en JS. Un helper `ternary(c, a, b)` aurait évalué les deux branches.

### Correction : court-circuit de `||` et `&&`

La condition `one < 0 || two < 0` a mis en évidence un défaut du transformer binaire existant : il évalue les deux opérandes avant d’appliquer l’opérateur. Pour `&&` et `||`, les préparations de l’opérande droit (appels de fonction, ternaires…) seraient donc exécutées même quand l’opérande gauche suffit. Un transformer dédié (`expression/logical.ts`) produit :

```go
Generated_20 := Generated_15 < Generated_16
if !(Generated_20) {
	Generated_18 := Sourced_two
	Generated_19 := (float64)(0)
	Generated_20 = Generated_18 < Generated_19
}
```

L’opérande droit n’est évalué que si l’opérande gauche est faux (`||`) ou vrai (`&&`).

## Variations étudiées

Vérifiées en Go (compilation, `go vet`, sortie comparée à Node) :

- Les trois chemins de `add` : succès (`describe(1, 2)` donne `"3"`), premier opérande négatif (`-5`), second opérande négatif (`-2`, la branche `else` du ternaire).
- Un callback qui ignore la valeur (`() => "…"`) ou qui l’utilise (`(value) => …`), pour une variante Left comme pour Success.
- `&&` dont l’opérande droit appelle une fonction ; ternaire dont les branches appellent des fonctions ; ternaire dans un `print`.
- `0.1 + 0.2` donne `0.30000000000000004` des deux côtés : `float64` reproduit exactement le `number` de JS.

Non pris en charge (erreur explicite) : `left(information)` sans valeur ; `matchInformation(matcher)(input)` (forme data-last) ; un matcher qui n’est pas un objet littéral ; `DString.to` sur autre chose qu’un nombre ; `a || b` utilisé comme valeur par défaut sur des non-booléens.

## Résultats observés

Le `index.ts` du projet calcule aussi `newResult` avec `DCommon.pipe`, `whenIsRightOtherwise`, `DArray.map` et `DString.to` passé comme valeur. Ces éléments relèvent des projets 03 et 05. Depuis l’intégration de ces projets, `pnpm build:06` transpile le projet complet : le Go compile, passe `go vet`, et sa sortie est identique à celle de Node (affichée en JSON).

La partie propre au projet 06 a été vérifiée avec un `index.ts` réduit (même `add.ts`, même `matchInformation`, `print(message)`). Le Go compile, `go vet` ne signale rien, et la sortie est `un opérande est négatif`, comme la seconde ligne de Node. Les 7 sorties du jeu de variations sont **identiques octet pour octet** à celles de Node (`JSON.stringify` pour les objets, texte brut pour les chaînes).

## Limites

- `GetValue()` retourne `any` : la valeur est boxée (allocation possible pour un `float64`), puis l’assertion `.(float64)` est vérifiée à l’exécution. C’est le prix de la simplicité de l’interface (voir projet 01). Non mesuré.
- Les callbacks deviennent des fonctions Go (closures) appelées dans le `switch`. Le compilateur Go peut les inliner, ce qui n’a pas été vérifié (`go build -gcflags=-m`).
- `NumberToString` diffère de JS pour |x| ≥ 1e21 ou < 1e-6 (JS passe en notation exponentielle) et pour `Infinity` (Go écrit `+Inf`).
- Si le paramètre d’un callback a pour type une union de types différents (par exemple `number | string`, quand deux variantes portent la même information avec des valeurs de types différents), aucun type Go n’est produit et la traduction s’arrête sur une erreur. Il faudrait alors passer par `any`.
