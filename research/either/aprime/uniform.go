package aprime

import "research/either/a"

// Variante « un seul type partout » : même le cas homogène (exercices 06/07)
// utilise Either2[L, R]. Sert à mesurer le surcoût de cette règle plus simple
// par rapport à Either[V] (package a).

func Left2[L any, R any](information string, value L) Either2[L, R] {
	return Either2[L, R]{Kind: a.KindLeft, Information: information, Left: value}
}

func Add2(one, two float64) Either2[float64, float64] {
	if one < 0 || two < 0 {
		var operand float64
		if one < 0 {
			operand = one
		} else {
			operand = two
		}
		return Left2[float64, float64]("negative-operand", operand)
	}
	return Success2[float64](one + two)
}

func Divide2(value, divisor float64) Either2[float64, float64] {
	if divisor == 0 {
		return Left2[float64, float64]("division-by-zero", divisor)
	}
	return Success2[float64](value / divisor)
}

func Calculate2(one, two, divisor float64) Either2[float64, float64] {
	step := Add2(one, two)
	if !step.IsRight() {
		return step
	}
	return Divide2(step.Right, divisor)
}

func MapCalculate2(inputs [][3]float64) []Either2[float64, float64] {
	results := make([]Either2[float64, float64], len(inputs))
	for index, input := range inputs {
		results[index] = Calculate2(input[0], input[1], input[2])
	}
	return results
}
