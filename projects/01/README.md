# Projet 01

## Problématique

### Représenter un retour composé de plusieurs variantes

La fonction `add` déclare un retour qui peut être un `DEither.Success<number>` ou un `DEither.Fail`. Comment représenter en Go un retour qui peut prendre plusieurs formes, tout en conservant le type et la valeur associés à chacune d’elles ? Dans cet exemple, l’implémentation retourne actuellement un succès, mais sa signature annonce également la possibilité d’un échec.

### Traduire une instruction conditionnelle

Dans `index.ts`, l’instruction `if` utilise `DEither.isRight(result)` comme condition et contient un bloc d’instructions à exécuter lorsque cette condition est vraie. Comment traduire une instruction conditionnelle en préservant l’évaluation de sa condition et l’exécution de la bonne branche ?

## Solution

### Représenter un retour composé de plusieurs variantes

```go
// shard_dependencies
type Either interface {
	IsRight() bool
}

type EitherSuccess[T any] struct { Right JSNull; Information string; Value T; Success JSNull }

func (_ EitherSuccess[T]) IsRight() bool { return true }

// add.ts
func Sourced_add(Sourced_one float64, Sourced_two float64) shard_dependencies.Either {
	...
	return shard_dependencies.EitherSuccessOf(Generated_9)
}
```

Une union dont tous les membres sont des types Either (`Success<number> | Fail`) devient l’interface Go `Either`. Chaque variante est un type concret qui implémente `IsRight()`. Comme Go convertit implicitement une variante vers l’interface, `return EitherSuccessOf(x)` compile sans connaître les autres membres de l’union. La variante concrète conserve son type et sa valeur (`EitherSuccess[float64]`).

`EitherSuccess` passe d’un alias (`type X = struct{...}`) à un type défini (`type X struct{...}`), parce qu’une méthode ne peut pas être déclarée sur un alias de struct anonyme.

Alternative écartée : une struct plate générique `Either[R, L]`, plus performante (valeur sur la pile, sans allocation ni assertion de type). Go n’infère pas un paramètre de type à partir du type de retour attendu, donc `return EitherSuccessOf(x)` ne peut pas deviner `L`. Il faudrait calculer `R` et `L` avec le checker TypeScript (type de retour de la fonction, décomposition de l’union) et instancier chaque constructeur. Nous avons choisi la solution la plus simple et gardé celle-ci comme optimisation possible.

Le transformer d’appel n’enregistre plus la fonction appelée dans une variable temporaire lorsqu’il s’agit d’une déclaration de fonction (locale, importée ou membre d’un namespace). Une telle référence est immuable : l’évaluer avant ou après les arguments ne change rien. Cela permet à Go d’inférer les génériques à l’appel (`EitherSuccessOf(x)` au lieu de `f := EitherSuccessOf`, qui ne compilait pas, y compris dans le projet 00).

### Traduire une instruction conditionnelle

```go
Sourced_result := add.Sourced_add(Generated_2, Generated_3)
if Sourced_result.IsRight() {
	Generated_5 := Sourced_result
	shard_dependencies.Print(Generated_5)
}
```

- `const result = ...` devient une déclaration courte `:=` dont Go déduit le type.
- `if` devient un `if` Go. Les préparations (`before`) de la condition sont placées avant le `if`, car la condition est toujours évaluée. Celles d’une branche restent dans son bloc. `else` et `else if` sont pris en charge.
- `DEither.isRight(x)` devient `x.IsRight()` : un appel de méthode, sans helper ni assertion de type.
- `DCommon.print(x)` devient `shard_dependencies.Print(x)`, qui affiche la valeur puis la retourne, comme DuploJS.

## Variations étudiées

- Type de retour annoté avec ou sans parenthèses, ou inféré : le routeur des unions reçoit la même union.
- `isRight` appelé directement est pris en charge. `isRight` passé comme valeur (par exemple à un `filter`) est refusé avec une erreur explicite.
- `if` avec bloc ou instruction seule, avec `else` et `else if`.
- Alias d’import (`import { isRight as ok }`) : le routage passe par la résolution du symbole et ne dépend pas du texte.

## Résultats observés

Reproduction : `pnpm build:01 && cd projects/01/dist && go run .`

| Node (`tsx projects/01/index.ts`) | Go |
|---|---|
| `{ '@duplojs/.../right': null, '.../information': 'success', '.../value': 3, '.../success': null }` | même objet, rendu JSON indenté (`"...": null`, `"success"`, `3`) |

Les clés, les valeurs et l’ordre sont identiques. Seul le format diffère (voir Limites). `go vet` ne signale rien.

## Limites

- **Allocation** : convertir une variante vers l’interface `Either` l’alloue sur le tas, et le test `IsRight()` est un appel dynamique. Non mesuré. À vérifier avec `go build -gcflags=-m` et un benchmark.
- **Format de `print`** : Go affiche du JSON, Node affiche le format `util.inspect` (quotes simples, `undefined`). Reproduire `util.inspect` demanderait un formateur Go complet, écrit avec les factories de l’AST.
- **Variable non utilisée** : une constante TypeScript jamais lue produirait `declared and not used` en Go (non rencontré ici).
- Les déclarations multiples (`const a = 1, b = 2`) et la déstructuration ne sont pas encore prises en charge.
