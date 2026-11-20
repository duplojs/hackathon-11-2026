# Projet 10

## Problématique

### Composer des résultats asynchrones

Dans `index.ts`, les calculs asynchrones produisent des résultats `Either`. `DEither.rightAsyncPipe` enchaîne les étapes d’un calcul, `DEither.asyncGroup` regroupe plusieurs calculs, puis `DCommon.asyncPipe` compose le traitement final. Comment traduire ces compositions en préservant l’ordre d’exécution asynchrone, la propagation des échecs et le résultat final attendu ?

### Représenter l’asynchronisme TypeScript en Go

TypeScript exprime ici l’asynchronisme avec des fonctions `async`, des valeurs `Promise` et `await`. Go ne possède pas ces constructions ni le même modèle de promesse. Comment traduire ce flux asynchrone en Go sans modifier l’ordre des opérations ni le moment où les résultats deviennent disponibles ?

## Solution

Les extraits viennent de `dist/` (préfixes `Sourced_` et chemins de packages raccourcis pour la lecture).

### Représenter l’asynchronisme TypeScript en Go

`async`, `await` et `Promise<T>` n’ont pas d’équivalent direct en Go. Nous avons lu le runtime de `@duplojs/lang` avant de choisir :

- `rightAsyncPipe` attend chaque étape **dans l’ordre** ;
- `asyncGroup` appelle les fonctions **l’une après l’autre** et s’arrête au premier échec, sans appeler les suivantes ;
- `asyncPipe` attend chaque étape.

Traduire chaque promesse par une goroutine lancerait les calculs suivants même après un échec : **le comportement changerait**. Nous traduisons donc l’asynchronisme en exécution synchrone : une fonction `async` qui renvoie `Promise<T>` devient une fonction Go qui renvoie `T` (`transformers/type/promise.ts`), et `await e` devient `e` (`transformers/expression/await.ts`). L’ordre des opérations et l’arrêt au premier échec sont conservés exactement.

### Composer des résultats asynchrones

```go
func calculate(one float64, two float64, divisor float64) (shard_dependencies.Either) {
	var Generated_1 shard_dependencies.Either
	Generated_1 = add.add(one, two)
	if Generated_1.IsRight() {
		Generated_1 = func(value float64) (shard_dependencies.Either) {
			return divide.divide(value, divisor)
		}(Generated_1.GetValue().(float64))
		if Generated_1.IsRight() {
			Generated_1 = func(value float64) (shard_dependencies.EitherSuccess[float64]) {
				return shard_dependencies.EitherSuccessOf(value * (float64)(2))
			}(Generated_1.GetValue().(float64))
		}
	}
	return Generated_1
}
```

`rightAsyncPipe` suit la traduction de `rightPipe` (projet 07) : des `if` imbriqués, arrêt au premier `Left`.

`DEither.asyncGroup([() => calculate(…), …])` est déroulé élément par élément : un slice de valeurs alloué une fois, puis chaque fonction appelée seulement si toutes les précédentes ont réussi, et arrêt au premier échec (même sémantique que `group`, projet 09). Les valeurs regroupées sont typées comme un tuple (`Tuple3[float64, float64, float64]`).

`DCommon.asyncPipe(calculations, DEither.whenIsRightOtherwise(…))` puis `await` suivent la traduction synchrone de `pipe` (projet 03) et de `whenIsRightOtherwise` (projet 05).

## Variations étudiées

- `await` au niveau du module (`DCommon.print(await completedCalculations)`) : traduit dans la fonction `init` du package.
- `rightAsyncPipe` à deux étapes, `asyncGroup` sur un tableau littéral de fonctions.

## Résultats observés

Sortie Go identique octet pour octet à celle de Node (affichée en JSON) : `["transaction annulée"]`, car le troisième calcul (division par zéro) échoue. Les deux premiers calculs sont exécutés, comme en Node.

Reproduction :

```sh
pnpm build:10
cd projects/10/dist && go vet ./... && go run .
```

Comparaison avec Node : faire afficher Node en JSON (module préchargé qui remplace `console.info` par `JSON.stringify(v, null, 2)`, voir le README racine), puis `diff` avec la sortie de `go run .`.

## Limites

- Une vraie concurrence (requêtes réseau en parallèle, `Promise.all` sur des opérations indépendantes) n’est pas couverte : elle serait exécutée séquentiellement. Piste : des goroutines là où l’ordre des effets ne compte pas.
- `Promise` est reconnu par son nom textuel dans le type, et non par son symbole.
