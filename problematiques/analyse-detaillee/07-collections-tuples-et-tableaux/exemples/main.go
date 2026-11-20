// Problématique 07 : tableaux, tuples et transformations de collections.
// Exécution : go run ./07-collections-tuples-et-tableaux/exemples
// Benchmark : go test -bench . -benchmem ./07-collections-tuples-et-tableaux/exemples
package main

import (
	"fmt"
	"strconv"
)

// DArray.map : un seul runtime générique typé. La sortie est allouée une seule
// fois à la bonne longueur, puis remplie dans l'ordre.
func ArrayMap[T any, U any](array []T, transform func(T) U) []U {
	output := make([]U, len(array))
	for index, element := range array {
		output[index] = transform(element)
	}
	return output
}

func main() {
	// `[number, number, number][]` -> `[][3]float64`
	//   - tuple  -> tableau Go `[N]T` : la longueur fait partie du type, donc un
	//     tuple de 2 valeurs est refusé par le compilateur Go ;
	//   - tableau -> slice `[]T` : longueur variable.
	//   Les tuples sont stockés côte à côte dans la slice, sans allocation par tuple.
	inputs := [][3]float64{
		{1, 2, 1},
		{4, 5, 3},
		{2, 3, 4},
	}
	// inputs = append(inputs, [3]float64{1, 2}) compile (zéro implicite), mais
	// inputs = append(inputs, [2]float64{1, 2}) est refusé : « cannot use [2]float64 ».

	quotients := ArrayMap(inputs, func(tuple [3]float64) float64 {
		one, two, divisor := tuple[0], tuple[1], tuple[2]
		return (one + two) / divisor
	})
	fmt.Println(quotients)

	// map sur un tuple : un tableau Go `[1]float64` n'est pas une slice. On le
	// découpe avec `[:]`, ce qui crée une vue SANS COPIE sur le même stockage.
	// `readonly` n'est qu'une contrainte TypeScript : aucune trace en Go.
	single := [1]float64{42}
	labels := ArrayMap(single[:], func(value float64) string {
		return strconv.FormatFloat(value, 'f', -1, 64)
	})
	fmt.Printf("%q\n", labels)

	// coalescing : le choix « envelopper ou garder » dépend du TYPE de l'argument,
	// connu à la compilation. Aucun test à l'exécution :
	wrapped := [1]float64{7} // coalescing(7)      : number -> enveloppé
	kept := []float64{7, 8}  // coalescing([7, 8]) : déjà un tableau -> gardé
	fmt.Println(wrapped, kept)
}
