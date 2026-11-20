// Problématique 09 : traduire async / await et Promise.
// Exécution : go run ./09-asynchronisme/exemples
package main

import "fmt"

type Union2[T0 any, T1 any] struct {
	Tag uint8
	V0  T0
	V1  T1
}

type Left[T any] struct {
	Information string
	Value       T
}

type Success[T any] struct {
	Value T
}

type Result = Union2[Left[float64], Success[float64]]
type Transaction = Union2[Left[float64], Success[[3]float64]]

const (
	isLeft    = 0
	isSuccess = 1
)

func divide(value float64, divisor float64) Result {
	if divisor == 0 {
		return Result{Tag: isLeft, V0: Left[float64]{Information: "division-by-zero", Value: divisor}}
	}
	return Result{Tag: isSuccess, V1: Success[float64]{Value: value / divisor}}
}

// STRATÉGIE RETENUE : aplatissement.
//   - `async function f(): Promise<T>` -> `func f() T`
//   - `await expr` -> `expr`
//
// Valide ici, car chaque promesse est attendue avant que quoi que ce soit
// d'autre ne s'exécute : l'ordre observable est le même qu'en JavaScript.
func calculate(value float64, divisor float64) Result {
	fmt.Printf("calcule %v / %v\n", value, divisor)
	divided := divide(value, divisor)
	return func() Result { // rightAsyncPipe : même schéma que rightPipe
		if divided.Tag == isLeft {
			return divided
		}
		return Result{Tag: isSuccess, V1: Success[float64]{Value: divided.V1.Value * 2}}
	}()
}

func main() {
	// 1. asyncGroup : getters appelés un par un, arrêt au premier échec.
	getters := [3]func() Result{
		func() Result { return calculate(6, 3) },
		func() Result { return calculate(1, 0) },
		func() Result { return calculate(8, 2) },
	}
	transaction := func() Transaction {
		var values [3]float64
		for index, getter := range getters {
			item := getter()
			if item.Tag == isLeft {
				return Transaction{Tag: isLeft, V0: item.V0}
			}
			values[index] = item.V1.Value
		}
		return Transaction{Tag: isSuccess, V1: Success[[3]float64]{Value: values}}
	}()
	if transaction.Tag == isSuccess {
		fmt.Println("validée")
	} else {
		fmt.Println("annulée")
	}

	// 2. LIMITE : la même traduction aplatie pour deux tâches lancées sans
	//    être attendues tout de suite donne A 1, A 2, B 1, B 2 : l'entrelacement
	//    de JavaScript (A 1, B 1, A 2, B 2) est perdu. Voir alternatives.go
	//    pour la version qui le reproduit.
	task := func(name string) {
		for _, step := range []int{1, 2} {
			fmt.Println(name, step)
		}
	}
	fmt.Println("-- aplati (diffère de JS) --")
	task("A")
	task("B")

	fmt.Println("-- boucle d'événements (identique à JS) --")
	runInterleavedTasks()

	fmt.Println("-- goroutines (parallèle, sémantique différente) --")
	runParallelGroup()
}
