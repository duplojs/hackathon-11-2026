// Problématique 08 : regrouper des résultats en une transaction.
// Exécution : go run ./08-agregation-group/exemples
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

const (
	isLeft    = 0
	isSuccess = 1
)

func divide(value float64, divisor float64) Result {
	fmt.Printf("calcule %v / %v\n", value, divisor)
	if divisor == 0 {
		return Result{Tag: isLeft, V0: Left[float64]{Information: "division-by-zero", Value: divisor}}
	}
	return Result{Tag: isSuccess, V1: Success[float64]{Value: value / divisor}}
}

// Le type de la transaction dépend de la FORME de l'entrée :
//   - tableau -> Success<number[]>                   -> []float64
//   - tuple   -> Success<[number, number, number]>   -> [3]float64
type SliceTransaction = Union2[Left[float64], Success[[]float64]]
type TupleTransaction = Union2[Left[float64], Success[[3]float64]]

func main() {
	// 1. Tableau : longueur inconnue à la compilation.
	//    Slice allouée une fois avec la capacité maximale, remplie par append.
	results := []Result{divide(6, 3), divide(9, 3)}
	sliceTransaction := func() SliceTransaction {
		values := make([]float64, 0, len(results))
		for _, item := range results {
			if item.Tag == isLeft {
				return SliceTransaction{Tag: isLeft, V0: item.V0} // premier échec
			}
			values = append(values, item.V1.Value)
		}
		return SliceTransaction{Tag: isSuccess, V1: Success[[]float64]{Value: values}}
	}()
	fmt.Println(sliceTransaction.V1.Value)

	// 2. Tuple de getters : longueur connue -> tableau fixe sur la pile.
	//    `append` est interdit sur un [3]float64 : on affecte par index.
	//    Les getters sont appelés un par un ; après un échec, les suivants ne
	//    le sont jamais (même paresse que DuploJS).
	getters := [3]func() Result{
		func() Result { return divide(6, 3) },
		func() Result { return divide(1, 0) },
		func() Result { return divide(8, 2) },
	}
	tupleTransaction := func() TupleTransaction {
		var values [3]float64
		for index, getter := range getters {
			item := getter()
			if item.Tag == isLeft {
				return TupleTransaction{Tag: isLeft, V0: item.V0}
			}
			values[index] = item.V1.Value
		}
		return TupleTransaction{Tag: isSuccess, V1: Success[[3]float64]{Value: values}}
	}()

	if tupleTransaction.Tag == isSuccess {
		fmt.Println("validée")
	} else {
		fmt.Println("annulée")
	}
}
