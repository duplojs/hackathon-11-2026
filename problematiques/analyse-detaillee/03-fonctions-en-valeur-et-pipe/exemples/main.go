// Problématique 03 : fonctions passées en valeur, curryfication et pipe.
// Exécution : go run ./03-fonctions-en-valeur-et-pipe/exemples
// Benchmark : go test -bench . -benchmem ./03-fonctions-en-valeur-et-pipe/exemples
package main

import (
	"fmt"
	"strconv"
)

// Runtime partagé : un seul `map` générique et typé, sans réflexion.
func ArrayMap[T any, U any](array []T, transform func(T) U) []U {
	output := make([]U, len(array))
	for index, element := range array {
		output[index] = transform(element)
	}
	return output
}

// Forme curryfiée de `DArray.map(fn)` : renvoie la fonction qui attend le tableau.
func ArrayMapWith[T any, U any](transform func(T) U) func([]T) []U {
	return func(array []T) []U {
		return ArrayMap(array, transform)
	}
}

func main() {
	// --- pipe(3, DArray.coalescing, DArray.map(DString.to)) ---

	// 1. Go ne sait pas manipuler une fonction générique sans l'instancier.
	//    Le transpileur demande au checker le type ATTENDU à cet endroit
	//    (`getContextualType`), ici `(value: number) => readonly [number]`, et
	//    génère une fonction littérale de ce type précis.
	//    `coalescing` sur un number enveloppe toujours : décidé à la compilation.
	coalescing := func(value float64) [1]float64 {
		return [1]float64{value}
	}

	// 2. Même principe pour `DString.to` attendu en `(value: number) => string`.
	toText := func(value float64) string {
		return strconv.FormatFloat(value, 'f', -1, 64) // simplifié, voir la problématique 10
	}

	// 3. Les étapes sont évaluées dans l'ordre des arguments (problématique 01).
	input := float64(3)
	mapToText := ArrayMapWith(toText)

	// 4. Le pipe disparaît : le nombre d'étapes et leurs types sont connus à la
	//    compilation, il devient une suite d'appels directs.
	//    Le tuple `[1]float64` est vu comme une slice (`[:]`), sans copie.
	firstStep := coalescing(input)
	labels := mapToText(firstStep[:])
	fmt.Printf("%q\n", labels)

	// --- pipe([1, 2, 3], DArray.map((value) => value + offset)) ---

	// La variable extérieure est capturée par la fermeture Go, comme en JS.
	offset := float64(10)
	addOffset := func(value float64) float64 {
		return value + offset
	}
	shifted := ArrayMapWith(addOffset)([]float64{1, 2, 3})
	fmt.Println(shifted)

	// Version V1, écartée : même résultat, mais tout passe par `any` et `reflect`.
	fmt.Printf("%q\n", reflectPipe(float64(3), coalescingAny, mapToTextAny))
}
