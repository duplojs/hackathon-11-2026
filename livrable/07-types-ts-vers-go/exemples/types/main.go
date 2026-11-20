// Les mêmes valeurs, avec le type Go choisi par le transpileur pour chaque type TS.
package main

import "livrable/duplo"

// TS : Success<number> | Fail  ->  Either[JSUndefined, float64]
func add(one float64, two float64) duplo.Either[duplo.JSUndefined, float64] {
	return duplo.EitherSuccessOf[duplo.JSUndefined, float64](one + two)
}

// TS : Left<"division-by-zero", 0> | Success<number>  ->  Either[float64, float64]
// Go n'a pas de types littéraux : `0` devient float64, comme `number`.
func divide(value float64, divisor float64) duplo.Either[float64, float64] {
	if divisor == 0 {
		return duplo.EitherLeftOf[float64, float64]("division-by-zero", divisor)
	}
	return duplo.EitherSuccessOf[float64, float64](value / divisor)
}

func main() {
	result := add(1, 2)

	// 1. Fail | readonly [number] : aucun type Go ne contient « un Either OU un tableau ».
	//    Seule exception à la règle « jamais de any » (type/mixedEitherUnion.ts).
	var coalesced any
	if result.IsRight {
		coalesced = duplo.Coalescing(result.Right)
	} else {
		coalesced = result
	}
	duplo.Print(coalesced)

	// 2. [-12] | readonly [number] : les deux membres donnent le même type Go -> []float64
	//    (readonly retiré : Go n'en a pas ; tuple dont les éléments ont le même type -> slice).
	var numbers []float64
	if result.IsRight {
		numbers = duplo.Coalescing(result.Right)
	} else {
		numbers = []float64{-12}
	}
	duplo.Print(numbers)

	// 3. readonly (string & Number)[] & LengthEqual<1> : les marques Number et LengthEqual
	//    viennent de @duplojs/lang, elles sont retirées -> []string.
	labels := make([]string, 0, len(numbers))
	for _, element := range numbers {
		labels = append(labels, duplo.StringTo(element))
	}
	duplo.Print(labels)

	// 4. Either[float64, float64].
	duplo.Print(divide(1, 0))
}
