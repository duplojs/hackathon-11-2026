package a

import "research/either/inspect"

// Ce fichier écrit à la main le Go que le transpileur devrait produire
// pour les exercices 04, 06, 07 et 08 avec la représentation A.

// Add04 : Fail | Success<number>, soit Either[float64].
func Add04(one, two float64) Either[float64] {
	if one == -1 {
		return Fail[float64]()
	}
	return Success(one + two)
}

// Add (exercice 06) : Left<"negative-operand", number> | Success<number>.
// Aucune coercition : les deux branches ont déjà le type Either[float64].
func Add(one, two float64) Either[float64] {
	if one < 0 || two < 0 {
		var operand float64
		if one < 0 {
			operand = one
		} else {
			operand = two
		}
		return Left("negative-operand", operand)
	}
	return Success(one + two)
}

//go:noinline
func AddNoInline(one, two float64) Either[float64] {
	return Add(one, two)
}

func Divide(value, divisor float64) Either[float64] {
	if divisor == 0 {
		return Left("division-by-zero", divisor)
	}
	return Success(value / divisor)
}

// Calculate : rightPipe(add(one, two), (value) => divide(value, divisor)),
// inliné avec un retour anticipé. L'union des gauches reste Either[float64].
func Calculate(one, two, divisor float64) Either[float64] {
	step := Add(one, two)
	if !step.IsRight() {
		return step
	}
	return Divide(step.Value, divisor)
}

// Message : matchInformation(result, {...}) devient un switch sur une string.
func Message(result Either[float64]) string {
	switch result.Information {
	case "negative-operand":
		return "un opérande est négatif"
	case "division-by-zero":
		return "division par zéro impossible"
	default: // "success"
		return inspect.ToString(result.Value)
	}
}

// Code est une variante de Message sans allocation, pour isoler le coût
// de la représentation dans les benchmarks.
func Code(result Either[float64]) float64 {
	switch result.Information {
	case "negative-operand":
		return -1
	case "division-by-zero":
		return -2
	default:
		return result.Value
	}
}

// MapCalculate : DArray.map(inputs, ([one, two, divisor]) => calculate(...)) (exercice 08).
func MapCalculate(inputs [][3]float64) []Either[float64] {
	results := make([]Either[float64], len(inputs))
	for index, input := range inputs {
		results[index] = Calculate(input[0], input[1], input[2])
	}
	return results
}
