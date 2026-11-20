// Problématique 05 : erreurs identifiées et traitement selon l'information.
// Exécution : go run ./05-erreurs-identifiees/exemples
// Benchmark : go test -bench . -benchmem ./05-erreurs-identifiees/exemples
package main

import (
	"fmt"
	"strconv"
)

type Union2[T0 any, T1 any] struct {
	Tag uint8
	V0  T0
	V1  T1
}

// Un échec garde son identifiant ET son contexte, typés.
type Left[T any] struct {
	Information string
	Value       T
}

type Success[T any] struct {
	Value T
}

// Les deux Left du type TypeScript (`"negative-operand"` avec un number et
// `"division-by-zero"` avec le littéral 0) ont la MÊME représentation Go :
// `Left[float64]`. Le littéral de chaîne n'existe qu'à la compilation ; à
// l'exécution c'est une valeur. L'union se réduit donc à deux membres.
type DivideResult = Union2[Left[float64], Success[float64]]

const (
	divideResultIsLeft    = 0
	divideResultIsSuccess = 1
)

func divide(value float64, divisor float64) DivideResult {
	if value < 0 {
		return DivideResult{Tag: divideResultIsLeft, V0: Left[float64]{Information: "negative-operand", Value: value}}
	}
	if divisor == 0 {
		return DivideResult{Tag: divideResultIsLeft, V0: Left[float64]{Information: "division-by-zero", Value: divisor}}
	}
	return DivideResult{Tag: divideResultIsSuccess, V1: Success[float64]{Value: value / divisor}}
}

func numberToString(value float64) string {
	return strconv.FormatFloat(value, 'f', -1, 64) // simplifié, voir la problématique 10
}

// `DEither.matchInformation` -> sélection en deux niveaux :
//  1. l'étiquette choisit le membre de l'union (comparaison d'entier) ;
//  2. une comparaison de chaîne n'est générée QUE si plusieurs informations
//     partagent ce membre. Le membre Success n'a qu'une information possible
//     ("success"), connue à la compilation : aucun test.
func describe(value float64, divisor float64) string {
	result := divide(value, divisor)

	var message string
	if result.Tag == divideResultIsLeft {
		switch result.V0.Information {
		case "negative-operand":
			// Le traitement déclare un paramètre : il reçoit la valeur de l'échec.
			message = "opérande négatif : " + numberToString(result.V0.Value)
		case "division-by-zero":
			// Le traitement ne déclare pas de paramètre : appelé sans argument.
			message = "division par zéro impossible"
		}
	}
	if result.Tag == divideResultIsSuccess {
		message = "résultat : " + numberToString(result.V1.Value)
	}
	return message
}

func main() {
	fmt.Println(describe(6, 3))
	fmt.Println(describe(-4, 2))
	fmt.Println(describe(6, 0))
}
