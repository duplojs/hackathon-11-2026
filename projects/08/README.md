# Projet 08

## Problématique

### Traiter une collection de calculs

Dans `index.ts`, chaque entrée de `inputs` décrit un calcul distinct. `DArray.map` produit un résultat pour chaque entrée, puis un autre `map` transforme ces résultats en valeurs affichables selon leur issue. Comment appliquer une transformation à chaque élément d’une collection tout en conservant le résultat propre à chaque calcul, y compris lorsqu’il s’agit d’un échec ?

### Représenter un tableau de tuples

`inputs` est typé comme un tableau de tuples `[number, number, number]`. Chaque tuple contient un nombre fixe de valeurs dont la position donne le rôle. Comment représenter cette structure en Go sans perdre sa cardinalité ni l’association entre chaque position et sa signification ?

### Déconstruire une entrée structurée dans un paramètre

La fonction passée au premier `DArray.map` reçoit un tuple et le décompose directement dans son paramètre avec `([one, two, divisor])`. Comment traduire cette déconstruction positionnelle en Go, qui ne permet pas cette forme de liaison dans les paramètres d’une fonction, tout en associant chaque valeur à la bonne variable ?

## Solution

Les extraits sont simplifiés (conversions `(float64)(1)` abrégées en `1`). `sd` désigne le paquet `shard_dependencies` et `Result` le type `sd.Union2[sd.EitherLeft[float64], sd.EitherSuccess[float64]]`.

### Traiter une collection de calculs

```go
Sourced_calculations = sd.ArrayMap(Generated_2, Generated_12)

func ArrayMap[T any, U any](array []T, theFunction func(_ T) U) []U {
	output := make([]U, len(array))
	for index, element := range array {
		output[index] = theFunction(element)
	}
	return output
}
```

- **`DArray.map` générique** : un seul runtime Go typé (`ArrayMap[T, U]`), sans `any` ni réflexion. La sortie est allouée une fois à la longueur de l’entrée et remplie dans l’ordre : l’ordre et la longueur du tableau source sont conservés. La forme curryfiée `DArray.map(fn)`, utilisée dans le `pipe`, devient `ArrayMapWith(fn)`, qui renvoie la fonction attendant le tableau.
- **Un résultat par calcul, échecs compris** : chaque élément de la sortie est un `Result`, l’union étiquetée du projet 01. `add` et `divide` retournent `Left<"negative-operand", number> | Success<number>` et `Left<"division-by-zero", 0> | Success<number>`. Les deux `Left` ont la même représentation Go (`EitherLeft[float64]`) : l’information (`"negative-operand"`, `"division-by-zero"`) est une valeur à l’exécution, son type littéral n’existe qu’à la compilation. L’union se réduit donc à deux membres et l’échec garde son information et son contexte.
- **`DEither.left`** : nouveau type `EitherLeft[T]` (`Left`, `Information`, `Value`), construit par `EitherLeftOf[T](information, value)`, sur le modèle de `EitherSuccess`. Le type de la valeur est celui que le checker attribue à l’appel.
- **`DEither.rightPipe`** : une fonction Go appelée immédiatement. Un échec est un `return` anticipé, sans imbrication de branches ; la valeur d’un `Right` est transmise à l’étape suivante.

  ```go
  return func() Result {
  	if Generated_7.Tag == 0 {
  		return Generated_7
  	}
  	Generated_11 := Generated_10(Generated_7.V1.Value)
  	return Generated_11
  }()
  ```

  Le classement d’une variante (échec, réussite, autre) est fait à la compilation à partir de sa représentation Go : à l’exécution il ne reste qu’une comparaison d’étiquette. Comme en JavaScript, l’entrée et les fonctions sont évaluées avant le pipe. Une étape qui retourne une valeur simple est enveloppée dans un `Success`, comme le fait `rightPipe`. Quand la dernière étape a déjà le type du résultat, elle est retournée telle quelle.
- **`DEither.whenIsRightOtherwise`** (forme curryfiée) : une fonction littérale Go qui capture les deux callbacks et choisit la branche selon l’étiquette.

  ```go
  Generated_18 := func(Generated_17 Result) string {
  	if Generated_17.Tag == 1 {
  		return Generated_16(Generated_17.V1.Value)
  	} else {
  		return Generated_14()
  	}
  }
  ```

  Un callback écrit sur place garde son nombre réel de paramètres (`() => "échec"` est appelé sans argument). Une fonction générique passée en valeur, comme `DString.to`, est instanciée selon le type attendu à cet endroit (`getContextualType`) : `func(value float64) string { return sd.NumberToString(value) }`. Sur un nombre, `DString.to` suit `Number::toString`, le même algorithme que `print`.
- **`DCommon.pipe`** : l’entrée et les fonctions sont évaluées dans l’ordre des arguments, puis chaque étape reçoit le résultat de la précédente.
- **Types marqueurs** : `DString.to` est typé `string & Number`. Cette intersection n’existe qu’à la compilation et prend la représentation de sa primitive (`string`). `"échec" | (string & Number)` devient donc `string`, et `display` un `[]string`.

### Représenter un tableau de tuples

```go
var Sourced_inputs [][3]float64

Sourced_inputs = [][3]float64{
	[3]float64{1, 2, 1},
	[3]float64{4, 5, 3},
	[3]float64{2, 3, 0},
}
```

- **Tuple → tableau Go `[N]T`** : la longueur fait partie du type Go. La cardinalité est donc vérifiée par le compilateur Go : un tuple de deux valeurs ne peut pas être affecté. La position garde son rôle (`tuple[0]`, `tuple[1]`, `tuple[2]`), comme en TypeScript. Un tableau Go est une valeur, stockée directement dans la slice, sans allocation par tuple.
- **Tableau → slice `[]T`** : `T[]` et `readonly T[]` ont une longueur variable. `readonly` n’est qu’une contrainte de compilation, sans effet sur la représentation.
- **Littéral de tableau** : son type Go est celui calculé par le checker (annotation ou contexte), ce qui distingue `[1, 2, 1]` (tuple) d’un tableau. Si un élément demande des préparations, chaque élément passe par une variable pour préserver l’ordre d’évaluation. Un littéral vide, typé `never[]` par le checker, prend le type attendu par le contexte.

### Déconstruire une entrée structurée dans un paramètre

```go
func(Generated_1 [3]float64) Result {
	Sourced_one := Generated_1[0]
	Sourced_two := Generated_1[1]
	Sourced_divisor := Generated_1[2]
	// ...
}
```

- **Fonction fléchée → fonction littérale Go** : les types viennent du checker. Un paramètre non annoté prend le type déduit du contexte (l’élément du tableau passé à `map`). Un corps expression est retourné dans la représentation du type de retour. Les variables extérieures (`divisor` dans `(value) => divide(value, divisor)`) sont capturées par la fermeture Go, comme en JavaScript.
- **Déconstruction** : Go n’a pas de liaison dans les paramètres. Le tuple est reçu entier sous un nom généré, puis chaque nom est lié à sa position au début du corps. L’association position → nom est celle du motif TypeScript ; un trou (`[one, , divisor]`) ignore simplement sa position.

### Autres traductions nécessaires à `add.ts` et `divide.ts`

- **Ternaire** : Go n’a pas d’opérateur ternaire. `one < 0 ? one : two` devient une variable du type de l’expression, affectée dans un `if` / `else`. Seule la branche choisie est évaluée.

  ```go
  var Generated_31 float64
  if Generated_29 < Generated_30 {
  	Generated_31 = Sourced_one
  } else {
  	Generated_31 = Sourced_two
  }
  ```

- **`||` et `&&`** : l’opérande droit n’est évalué que si le gauche ne suffit pas. Sans préparation, l’opérateur Go a le même court-circuit. Sinon, les préparations du côté droit sont placées dans un `if` qui ne s’exécute que lorsque ce côté est nécessaire. Auparavant, les deux côtés étaient toujours évalués.
- **Plusieurs chemins de retour** : chaque `return` place sa valeur dans le membre correspondant de l’union de retour inférée par le checker (`Left` → `Tag: 0`, `Success` → `Tag: 1`).
- **Types** : ajout de `string`, `boolean`, des tableaux, des tuples, des intersections et de `Left`.

### Afficher le résultat

`print` affiche désormais les tableaux comme Node : `[ '3', '3', 'échec' ]` sur une ligne si les entrées tiennent dans 80 colonnes, sinon une entrée par ligne (même règle `reduceToSingleString` que pour les objets). L’inspecteur `InspectSlice(InspectString)` est choisi à la compilation selon le type des éléments. Un `Left` s’affiche avec ses clés `left`, `information` et `value`.

## Résultats

La sortie du programme Go généré est identique, octet par octet, à celle de `tsx projects/08/index.ts` :

```
[ '3', '3', 'échec' ]
```

Le Go a été validé avec `go vet` et `go run`. Des variantes absentes de l’exemple ont été vérifiées de la même manière :

- opérande négatif (`negative-operand`) et division par zéro (`division-by-zero`) ;
- `rightPipe` à deux étapes ;
- trou dans la déconstruction (`[one, , divisor]`) ;
- résultats `0.55` et `1e21` ;
- affichage du tableau des résultats (succès et échecs, sur plusieurs lignes), d’un `Left` seul et d’un tableau vide.

Les projets 00 et 01 donnent toujours une sortie identique. `tsc -p tsconfig.app.json` et le lint passent.

Reproduction (Linux, macOS ou Windows) :

```bash
pnpm build --tsconfig projects/08/tsconfig.json --input projects/08/index.ts --output projects/08/dist
cd projects/08/dist && go run .
```

## Limites

- Les tuples hétérogènes (`[string, number]`), à longueur variable (`[number, ...number[]]`) ou à éléments optionnels ne sont pas traduits : un tableau Go n’a qu’un type d’élément. Une struct générique par arité serait la suite naturelle.
- Le second paramètre du callback de `map` (`{ index, self }`) et `map` sur un tuple ne sont pas traduits.
- Déconstruction : seuls les motifs de tableau à noms simples sont traduits (pas d’objet, de valeur par défaut, de reste ni d’imbrication). Un nom déconstruit inutilisé déclenche l’erreur Go « declared and not used ».
- `whenIsRightOtherwise` : `otherwiseFunction` ne reçoit la valeur que si les variantes qui ne sont pas des `Right` ont une seule représentation Go. `rightPipe`, `whenIsRightOtherwise` et `group` demandent une seule représentation de `Right`.
- `DEither.left` sans valeur (un seul argument) n’est pas traduit.
- `DString.to` ne traduit que les nombres et les chaînes.
- Affichage : le regroupement en colonnes des tableaux de plus de six éléments et la limite de 100 éléments de Node ne sont pas reproduits.
