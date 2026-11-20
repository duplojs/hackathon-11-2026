// Problématique 06 : composer des résultats Either.
// Exécution : go run ./06-composition-either/exemples
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

// add, divide et calculate ont le même type de retour après fusion des Left.
type Result = Union2[Left[float64], Success[float64]]

const (
	isLeft    = 0
	isSuccess = 1
)

func add(one float64, two float64) Result {
	if one < 0 || two < 0 {
		var operand float64
		if one < 0 {
			operand = one
		} else {
			operand = two
		}
		return Result{Tag: isLeft, V0: Left[float64]{Information: "negative-operand", Value: operand}}
	}
	return Result{Tag: isSuccess, V1: Success[float64]{Value: one + two}}
}

func divide(value float64, divisor float64) Result {
	if divisor == 0 {
		return Result{Tag: isLeft, V0: Left[float64]{Information: "division-by-zero", Value: divisor}}
	}
	return Result{Tag: isSuccess, V1: Success[float64]{Value: value / divisor}}
}

//  1. rightPipe -> fonction anonyme appelée immédiatement.
//     Chaque échec est un `return` anticipé : pas d'imbrication, quelle que soit
//     la longueur du pipe. L'entrée et les étapes sont évaluées AVANT le pipe,
//     dans l'ordre du source (comme les arguments en JavaScript).
func calculate(one float64, two float64, divisor float64) Result {
	input := add(one, two)
	divideStep := func(sum float64) Result { return divide(sum, divisor) }
	scaleStep := func(quotient float64) float64 { return quotient * 10 }

	return func() Result {
		if input.Tag == isLeft {
			return input
		}
		divided := divideStep(input.V1.Value) // l'étape reçoit la VALEUR du Success
		if divided.Tag == isLeft {
			return divided
		}
		scaled := scaleStep(divided.V1.Value)
		// Valeur simple -> enveloppée dans un Success, comme le fait rightPipe.
		return Result{Tag: isSuccess, V1: Success[float64]{Value: scaled}}
	}()
}

//  3. whenIsRightOtherwise avec des branches de types différents
//     (`number` et `string`) : le checker type le résultat `number | string`,
//     qui devient une union, et chaque branche est placée dans son membre.
type Display = Union2[float64, string]

func display(one float64, two float64, divisor float64) Display {
	result := calculate(one, two, divisor)
	var output Display
	if result.Tag == isSuccess {
		output = Display{Tag: 0, V0: result.V1.Value}
	} else {
		output = Display{Tag: 1, V1: "calcul impossible"}
	}
	return output
}

func printDisplay(value Display) {
	if value.Tag == 0 {
		fmt.Println(value.V0)
	} else {
		fmt.Println(value.V1)
	}
}

func main() {
	// 2. whenIsRight : on ne transforme que le Success, l'échec est recopié
	//    tel quel dans son membre.
	calculated := calculate(1, 2, 1)
	var doubled Result
	if calculated.Tag == isSuccess {
		doubled = Result{Tag: isSuccess, V1: Success[float64]{Value: calculated.V1.Value * 2}}
	} else {
		doubled = calculated
	}
	fmt.Println(doubled.V1.Value)

	printDisplay(display(4, 5, 3))
	printDisplay(display(4, 5, 0))
	printDisplay(display(-1, 5, 3))
}
