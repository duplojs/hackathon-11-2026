// Stratégie retenue (décision n°5), écrite à la main : le corps de chaque fonction passée
// en argument est recopié à l'endroit de l'appel. Pas de fonction anonyme, pas d'appel indirect.
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

func double(value float64) float64 {
	return value * 2
}

func main() {
	succeeded := add(1, 2)
	failed := add(-1, 2)

	// 1. whenIsRightOtherwise(succeeded, (value) => [value, value * 10], () => [-12])
	var fromSuccess []float64
	if succeeded.IsRight {
		value := succeeded.Right // le paramètre `value` de la fonction fléchée
		fromSuccess = []float64{value, value * 10}
	} else {
		fromSuccess = []float64{-12}
	}

	var fromFailure []float64
	if failed.IsRight {
		value := failed.Right
		fromFailure = []float64{value, value * 10}
	} else {
		fromFailure = []float64{-12}
	}
	duplo.Print(fromSuccess)
	duplo.Print(fromFailure)

	// 2. DArray.map(fromSuccess, DString.to) : une boucle, la fonction nommée est appelée directement.
	labels := make([]string, 0, len(fromSuccess))
	for _, element := range fromSuccess {
		labels = append(labels, duplo.StringTo(element))
	}
	duplo.Print(labels)

	// 3. matchInformation : un switch sur Information. Le type TS dit de quel côté
	//    est chaque information, donc si le paramètre lit .Left ou .Right.
	var fromFailed float64
	switch failed.Information {
	case "negative-operand":
		operand := failed.Left
		fromFailed = operand * 100
	case "success":
		fromFailed = double(failed.Right) // fonction passée par son nom : simple appel
	}
	duplo.Print(fromFailed)

	var fromSucceeded float64
	switch succeeded.Information {
	case "negative-operand":
		operand := succeeded.Left
		fromSucceeded = operand * 100
	case "success":
		fromSucceeded = double(succeeded.Right)
	}
	duplo.Print(fromSucceeded)
}
