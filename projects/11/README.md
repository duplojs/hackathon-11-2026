# Projet 11

Exemple ajouté par le professeur pendant le hackathon pour illustrer un point d’attention : une représentation des Either qui fonctionne avec deux variantes doit aussi tenir avec des unions plus larges, aux valeurs de types différents.

## Problématique

### Une union de plusieurs variantes de types différents

`checkUserName` peut renvoyer trois variantes : `left("must-be-not-contain-number")` (sans valeur), `error(null)` et `right("valid-username", username)`. Leurs valeurs ont des types différents (`undefined`, `null`, `string`). Comment représenter ce retour en Go sans créer un type par combinaison de variantes ?

### Désenvelopper un résultat puis rétrécir son type

`DEither.unwrapRight` renvoie la valeur d’un `Right`, ou l’Either lui-même sinon : son type est l’union `string | Left<…> | Error<null>`. Après `if (DEither.isLeft(checkedUsername)) return checkedUsername;`, TypeScript sait que `checkedUsername` est un `string`. Comment traduire ce rétrécissement, alors qu’une variable Go garde son type statique ?

### Fonctions de chaînes

`DString.test` (expression régulière), `DString.includes` et `DString.length` doivent être traduits en Go sans changer leur résultat.

## Solution

Les extraits viennent de `dist/` (préfixes `Sourced_` et chemins de packages raccourcis pour la lecture).

### Une union de plusieurs variantes de types différents

```go
func checkUserName(username string) (shard_dependencies.Either) {
	if Generated_1.MatchString(username) {
		return shard_dependencies.EitherLeftOf("must-be-not-contain-number", (shard_dependencies.JSUndefined{}))
	}
	if strings.Contains(username, "@") {
		return shard_dependencies.EitherErrorOf((shard_dependencies.JSNull{}))
	}
	return shard_dependencies.EitherRightOf("valid-username", username)
}
```

Les trois variantes sont des types Go concrets (`EitherLeft[T]`, `EitherError[T]`, `EitherRight[T]`) qui implémentent la même interface `Either`. Le type de retour est cette interface, quel que soit le nombre de variantes : **un type par constructeur DuploJS, jamais un type par union**. C’est ce qui permet de passer à l’échelle sur un projet réel.

### Désenvelopper un résultat puis rétrécir son type

```go
func main() (shard_dependencies.Either) {
	Generated_3 := checkUserName("test")
	checkedUsername := Generated_3
	if !(checkedUsername.IsRight()) {
		return checkedUsername
	}
	Generated_2 := float64(utf8.RuneCountInString(checkedUsername.GetValue().(string)))
	Generated_4 := shard_dependencies.EitherSuccessOf(Generated_2)
	return Generated_4
}
```

- `unwrapRight` est traduit comme un passthrough : la variable reste un `Either`.
- `isLeft(x)` devient `!x.IsRight()`.
- La variable est enregistrée (par son **symbole** TypeScript) comme « désenveloppée ». À chaque lecture où le checker a rétréci son type à autre chose qu’un Either, le transpileur émet `checkedUsername.GetValue().(string)` (`transformers/common/identifier.ts`). Le rétrécissement de TypeScript devient une assertion Go, au seul endroit où elle est nécessaire.

### Fonctions de chaînes

```go
var Generated_1 = regexp.MustCompile("[0-9]")
```

- `DString.test(s, /[0-9]/)` : l’expression régulière est compilée **une seule fois, au niveau du package**, puis `Generated_1.MatchString(s)`.
- `DString.includes(s, "@")` : `strings.Contains(s, "@")`.
- `DString.length(s)` : `float64(utf8.RuneCountInString(s))`.

## Variations étudiées

Vérifié en affichant les trois variantes (`check("abc1")`, `check("a@b")`, `check("été")`) et en comparant avec Node : `error(null)` et `right(…)` donnent une sortie identique ; `left(…)` sans valeur diffère (voir Limites).

## Résultats observés

Le projet compile et passe `go vet`. Il n’affiche rien, ni en Go ni en Node (il ne contient que des fonctions et une vérification de type `ExpectType`) : les deux sorties sont donc identiques. Le comportement des variantes a été vérifié séparément (ci-dessus).

Reproduction :

```sh
pnpm build:11
cd projects/11/dist && go vet ./... && go run .
```

Comparaison avec Node : faire afficher Node en JSON (module préchargé qui remplace `console.info` par `JSON.stringify(v, null, 2)`, voir le README racine), puis `diff` avec la sortie de `go run .`.

## Limites

- `left("…")` sans valeur : Go affiche `"value": null`, alors que `JSON.stringify` omet la propriété `undefined`. Piste : omettre le champ quand sa valeur est `JSUndefined` (méthode `MarshalJSON` sur `EitherLeft`).
- `DString.length` compte les runes, alors que JS compte les unités UTF-16 : un emoji vaut 1 en Go et 2 en JS. Piste : compter en UTF-16 (`utf16.Encode`).
- La variable désenveloppée garde le type `Either` : chaque lecture rétrécie fait une assertion à l’exécution.
