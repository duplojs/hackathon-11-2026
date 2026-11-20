// Stratégie retenue, écrite à la main : le nombre d'étapes est connu à la traduction,
// donc la chaîne est « déroulée » : une étape après l'autre, sans liste de fonctions.
package main

import "livrable/duplo"

type result = duplo.Either[float64, float64]

func add(one float64, two float64) result {
	if one < 0 || two < 0 {
		var operand float64
		if one < 0 {
			operand = one
		} else {
			operand = two
		}
		return duplo.EitherLeftOf[float64, float64]("negative-operand", operand)
	}
	return duplo.EitherSuccessOf[float64, float64](one + two)
}

func divide(value float64, divisor float64) result {
	duplo.Print("divide est appelée")
	if divisor == 0 {
		return duplo.EitherLeftOf[float64, float64]("division-by-zero", divisor)
	}
	return duplo.EitherSuccessOf[float64, float64](value / divisor)
}

func main() {
	// 1. rightPipe : une variable « accumulateur », puis UN if par étape.
	first := add(1, 2)
	if first.IsRight {
		value := first.Right
		first = divide(value, 0)
	}
	duplo.Print(first)

	// 2. add échoue : le if est sauté, divide n'est pas appelée.
	second := add(-1, 2)
	if second.IsRight {
		value := second.Right
		second = divide(value, 0)
	}
	duplo.Print(second)

	// 3. Deux étapes : deux if à la suite. Si une étape échoue, les if suivants sont sautés.
	third := add(4, 5)
	if third.IsRight {
		value := third.Right
		third = divide(value, 3)
	}
	if third.IsRight {
		value := third.Right
		third = duplo.EitherSuccessOf[float64, float64](value * 2)
	}
	duplo.Print(third)

	// 4. pipe : chaque étape est écrite à la suite, et chaque résultat a son propre type Go.
	input := add(1, 2)

	var asArray []float64 // étape whenIsRightOtherwise(coalescing, () => [-12])
	if input.IsRight {
		asArray = duplo.Coalescing(input.Right)
	} else {
		asArray = []float64{-12}
	}

	asStrings := make([]string, 0, len(asArray)) // étape map(DString.to)
	for _, element := range asArray {
		asStrings = append(asStrings, duplo.StringTo(element))
	}
	duplo.Print(asStrings)
}
