# Projet 01

## Problématique

### Représenter un retour composé de plusieurs variantes

La fonction `add` déclare un retour qui peut être un `DEither.Success<number>` ou un `DEither.Fail`. Comment représenter en Go un retour qui peut prendre plusieurs formes, tout en conservant le type et la valeur associés à chacune d’elles ? Dans cet exemple, l’implémentation retourne actuellement un succès, mais sa signature annonce également la possibilité d’un échec.

### Traduire une instruction conditionnelle

Dans `index.ts`, l’instruction `if` utilise `DEither.isRight(result)` comme condition et contient un bloc d’instructions à exécuter lorsque cette condition est vraie. Comment traduire une instruction conditionnelle en préservant l’évaluation de sa condition et l’exécution de la bonne branche ?

## Solution

### Représenter un retour composé de plusieurs variantes

```go
type Union2[T0 any, T1 any] = struct {
	Tag uint8
	V0  T0
	V1  T1
}

func Sourced_add(Sourced_one float64, Sourced_two float64) shard_dependencies.Union2[shard_dependencies.EitherFail, shard_dependencies.EitherSuccess[float64]] {
	one1 := Sourced_one
	two1 := Sourced_two
	return shard_dependencies.Union2[shard_dependencies.EitherFail, shard_dependencies.EitherSuccess[float64]]{
		Tag: 1,
		V1:  shard_dependencies.EitherSuccessOf[float64](one1 + two1),
	}
}
```

Une union TypeScript devient une **union étiquetée générique** `UnionN` : une struct contenant l’étiquette du membre actif et un champ par membre, chacun gardant son propre type Go (`EitherSuccess[float64]`, `EitherFail`). Le type de chaque variante est donc conservé sans `any`.

- **Choix d’une struct plutôt qu’une interface** : une interface Go (`interface{ isEither() }` + `switch` de type) placerait chaque résultat sur le tas (allocation, ramasse-miettes) et ajouterait un appel indirect. La struct est une valeur : elle reste sur la pile, se copie sans allocation et se teste par une simple comparaison d’entier. En contrepartie, sa taille est la somme de celles de ses membres (48 octets ici) au lieu d’un en-tête d’interface de 16 octets plus l’objet alloué.
- **Ordre canonique** : les membres sont dédoublonnés par représentation Go puis triés. `Success<number> | Fail` et `Fail | Success<number>` donnent donc le même type Go et restent assignables l’un à l’autre ; `true | false` se réduit à `bool`.
- **Une seule source de vérité** : une annotation (`UnionTypeNode`) et un type calculé par le checker (type inféré, rétréci ou attendu) passent par les mêmes transformers de types, ce qui garantit une représentation identique.
- **Conversion au point d’usage** : `return DEither.success(...)` produit un `EitherSuccess[float64]`, alors que la fonction retourne l’union. Le `return` compare le type de la valeur au type de retour de la signature et place la valeur dans le bon membre (`Tag: 1, V1: …`). La même conversion s’applique à l’initialisation d’une variable typée (`const other: Success<number> | Fail = result`).
- **Mémoire des Either** : les champs vides (`JSNull`) de `EitherSuccess` et `EitherFail` sont placés en tête de struct. En dernière position, Go ajoute un remplissage : `EitherSuccess[float64]` passe ainsi de 32 à 24 octets (mesuré avec `unsafe.Sizeof`).
- **Instanciation explicite** : `EitherSuccessOf[float64]` est désormais instancié à partir du type que le checker attribue à l’appel. Le Go du projet 00 ne compilait pas sans cela (`cannot use generic function … without instantiation`).

### Traduire une instruction conditionnelle

```go
var Sourced_result shard_dependencies.Union2[shard_dependencies.EitherFail, shard_dependencies.EitherSuccess[float64]]

func init() {
	add1 := add_ts.Sourced_add
	argument1 := (float64)(1)
	argument2 := (float64)(2)
	Sourced_result = add1(argument1, argument2)
	checkedResult1 := Sourced_result
	if checkedResult1.Tag == 1 {
		shard_dependencies.Print(Sourced_result.V1, shard_dependencies.InspectEitherSuccess(shard_dependencies.InspectNumber))
	}
}
```

- **`isRight` résolu à la compilation** : `isRight` est un garde de type (`input is Extract<Input, Right>`). Le checker fournit le type retenu par ce prédicat ; chaque membre de l’union est classé une fois pour toutes (`isTypeAssignableTo`), et le test à l’exécution se réduit à `Tag == 1`, sans inspecter la valeur. Si aucun ou tous les membres sont retenus, la condition devient `false` ou `true` ; l’argument reste évalué (`_ = …`) pour conserver ses effets. La méthode ne dépend pas du nom de la fonction : elle s’appliquera à tout autre garde de type.
- **Rétrécissement** : dans la branche, TypeScript considère `result` comme un `Success<number>`. La variable Go garde son type union : le transformer d’identifiant compare le type déclaré au type rétréci à cet endroit et lit directement le champ du membre (`Sourced_result.V1`).
- **Branches** : la condition est évaluée une fois, ses préparations (`checkedResult1 := …`) sont placées avant le `if`. Chaque branche est rendue comme un bloc Go, de sorte que les préparations d’une instruction restent dans sa branche et ne s’exécutent que si elle est choisie. `else` et `else if` sont pris en charge.
- **Variables de module** : `const result` au niveau du fichier devient une variable de package affectée dans `init`. Elle reste accessible depuis les autres fichiers et n’est pas soumise à l’erreur Go « declared and not used ». Dans une fonction, une variable devient une déclaration typée locale.

### Afficher le résultat (`DCommon.print`)

`DCommon.print` appelle `console.info`, qui formate les valeurs avec `util.inspect`. Pour conserver la sortie, un runtime Go partagé reproduit ce format pour les types pris en charge : objets sur une ou plusieurs lignes selon la largeur (règle `reduceToSingleString`, largeur 80), clés et chaînes entre guillemets avec les échappements de Node, nombres au format JavaScript (`Number::toString` : `0.30000000000000004`, `1e+21`, `1e-7`, `-0` affiché `-0`), chaîne de premier niveau affichée telle quelle. La fonction d’affichage est **choisie à la compilation** selon le type statique (`InspectEitherSuccess(InspectNumber)`) : aucun recours à la réflexion. Seuls les inspecteurs effectivement utilisés sont émis.

### Pièges Go relevés

L’arithmétique sur des **constantes** Go est exacte : `0.1 + 0.2` y vaut `0.3` et `-0.0` vaut `0`, alors que JavaScript calcule en `float64` (`0.30000000000000004`, `-0`). Les opérandes des opérateurs binaires et unaires passent donc par des variables temporaires, ce qui force un calcul `float64` à l’exécution.

## Résultats

La sortie du programme Go généré est identique, octet par octet, à celle de `tsx projects/01/index.ts`. Le Go a été validé avec `go vet` et `go run`. Des variantes absentes de l’exemple ont été vérifiées de la même manière : union déclarée dans l’autre ordre, variable typée initialisée depuis une autre variable, `else`, `isRight` sur un type non-union (condition `true`), déclarations multiples (`const a = 1, b = a + 2`), affichage de `0.1 + 0.2`, `1e21`, `-0` et d’une chaîne.

Reproduction (Linux, macOS ou Windows) :

```bash
pnpm build --tsconfig projects/01/tsconfig.json --input projects/01/index.ts --output projects/01/dist
cd projects/01/dist && go run .
```

## Limites

- La conversion entre deux unions différentes (sous-union vers union plus large) et le rétrécissement vers une sous-union de plusieurs membres ne sont pas encore traduits : ils produisent une erreur explicite.
- Une condition non booléenne (`if (nombre)`, `if (objet)`) n’est pas traduite : la vérité JavaScript n’a pas d’équivalent direct en Go.
- `print` ne gère qu’un argument, et les types number, string, null, undefined, `Success`, `Fail` et les unions de ceux-ci. Le regroupement en colonnes des tableaux de plus de six éléments et la limite de profondeur de Node (`[Object]`) ne sont pas reproduits.
- Les variables locales inutilisées d’une fonction déclenchent l’erreur Go « declared and not used ».
- Non mesuré : le coût réel de l’union étiquetée face à une interface (allocations, temps) reste à confirmer par un benchmark Go.
