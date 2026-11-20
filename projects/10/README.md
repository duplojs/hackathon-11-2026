# Projet 10

## Problématique

### Composer des résultats asynchrones

Dans `index.ts`, les calculs asynchrones produisent des résultats `Either`. `DEither.rightAsyncPipe` enchaîne les étapes d’un calcul, `DEither.asyncGroup` regroupe plusieurs calculs, puis `DCommon.asyncPipe` compose le traitement final. Comment traduire ces compositions en préservant l’ordre d’exécution asynchrone, la propagation des échecs et le résultat final attendu ?

### Représenter l’asynchronisme TypeScript en Go

TypeScript exprime ici l’asynchronisme avec des fonctions `async`, des valeurs `Promise` et `await`. Go ne possède pas ces constructions ni le même modèle de promesse. Comment traduire ce flux asynchrone en Go sans modifier l’ordre des opérations ni le moment où les résultats deviennent disponibles ?

## Solution

Dans les extraits, `sd` désigne le paquet `shard_dependencies` et `Result` l'union des résultats `calculate`.

### Représenter l’asynchronisme TypeScript en Go

Go ne possède pas de `Promise`, `async` ou `await` intégrés de la même façon que JavaScript/TypeScript. Dans le cadre de ce code séquentiel pur (sans I/O concurrent asynchrone non-bloquant) :
- Le type `Promise<T>` est directement aplati en `T`.
- L'expression `await expr` est aplanie en évaluant directement `expr`.
- Une déclaration de fonction `async` produit une fonction Go synchrone standard dont le type de retour est le type de la valeur résolue sans l'enveloppe `Promise`.

```go
func Sourced_calculate(Sourced_one float64, Sourced_two float64, Sourced_divisor float64) (shard_dependencies.Union2[shard_dependencies.EitherLeft[float64], shard_dependencies.EitherSuccess[float64]]) {
	add1 := Sourced_add
	addResult1 := add1(Sourced_one, Sourced_two)
	callback2 := func(Sourced_value float64) (shard_dependencies.Union2[shard_dependencies.EitherLeft[float64], shard_dependencies.EitherSuccess[float64]]) {
		return Sourced_divide(Sourced_value, Sourced_divisor)
	}
	callback1 := func(Sourced_value float64) (shard_dependencies.EitherSuccess[float64]) {
		return shard_dependencies.EitherSuccessOf[float64](Sourced_value * 2)
	}
	return func() (shard_dependencies.Union2[shard_dependencies.EitherLeft[float64], shard_dependencies.EitherSuccess[float64]]) {
		if addResult1.Tag == 0 {
			return addResult1
		}
		stepResult1 := callback2(addResult1.V1.Value)
		if stepResult1.Tag == 0 {
			return stepResult1
		}
		stepResult2 := callback1(stepResult1.V1.Value)
		return (shard_dependencies.Union2[shard_dependencies.EitherLeft[float64], shard_dependencies.EitherSuccess[float64]]{
			Tag: 1,
			V1: stepResult2,
		})
	}()
}
```

### Composer des résultats asynchrones (`asyncPipe`, `rightAsyncPipe`, `asyncGroup`)

- **`DEither.rightAsyncPipe`** : enchaîne les calculs `Either` en propageant par court-circuit toute variante d'échec (`EitherLeft`).
- **`DEither.asyncGroup`** :
  - Accepte un tableau ou tuple de fonctions (getters) asynchrones.
  - Dans la boucle d'exécution Go générée immédiatement, chaque getter est appelé (`current := element()`).
  - Au premier échec (`Tag == 0`), la fonction retourne immédiatement l'échec.
  - Si tous les calculs réussissent, les valeurs sont accumulées dans un tableau fixe `[3]float64` (car l'entrée était un tuple de 3 éléments) et encapsulées dans `EitherSuccessOf[[3]float64](values)`.
- **`DCommon.asyncPipe` & `DEither.whenIsRightOtherwise`** :
  - Le résultat de `asyncGroup` est vérifié par étiquette (`Tag == 1` pour succès, sinon échec).
  - En cas de succès, `ArrayMap` applique `DString.to`.
  - En cas d'échec, la branche alternative produit `[ "transaction annulée" ]`.


## Résultats

La sortie du programme Go généré est identique, octet par octet, à celle de `tsx projects/10/index.ts` :

```
[ 'transaction annulée' ]
```

Reproduction :

```bash
pnpm build:10
cd projects/10/dist && go run .
```

## Limites

- Les promesses sont évaluées séquentiellement et de manière synchrone en Go ; les accès réseau/IO parallèles asynchrones réels (goroutines / channels) ne sont pas modélisés ici.
- Seules les expressions `await` directes et `Promise<T>` résolubles statiquement sont prises en charge.
