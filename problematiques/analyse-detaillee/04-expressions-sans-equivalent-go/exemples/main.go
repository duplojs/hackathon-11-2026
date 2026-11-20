// Problématique 04 : expressions TypeScript sans équivalent direct en Go.
// Exécution : go run ./04-expressions-sans-equivalent-go/exemples
package main

import "fmt"

func isNegative(label string, value float64) bool {
	fmt.Println("teste", label)
	return value < 0
}

//  1. Ternaire -> variable typée + if / else.
//     Le type de la variable est celui que le checker attribue à l'expression
//     entière. Seule la branche choisie est évaluée, comme en JavaScript.
func pickOperand(one float64, two float64) float64 {
	var ternaryResult float64
	if one < 0 {
		ternaryResult = one
	} else {
		ternaryResult = two
	}
	return ternaryResult
}

func main() {
	fmt.Println("ternaire =", pickOperand(-1, 2))

	// 2. Court-circuit.
	//
	// Cas simple : sans préparation, le `||` de Go a le même court-circuit.
	//
	// Cas difficile : si le côté droit a besoin d'instructions de préparation
	// (problématique 01), on ne peut pas les émettre AVANT le `||`, car elles
	// seraient exécutées même quand le côté gauche suffit. Elles sont donc
	// placées dans un `if` qui reproduit le court-circuit.
	hasNegative := isNegative("one", -1)
	if !hasNegative {
		// Préparations du côté droit : exécutées seulement si nécessaire.
		label := "two"
		value := float64(2)
		hasNegative = isNegative(label, value)
	}
	fmt.Println("||  =", hasNegative)

	// Pour `&&`, la condition est inversée : `if hasBoth { … }`.

	// 3. Déstructuration : Go ne lie pas de motif dans les paramètres.
	//    Le tuple est reçu entier, puis chaque nom est lié à sa position.
	//    Le trou `[one, , divisor]` ignore simplement la position 1.
	inputs := [][3]float64{
		{1, 2, 1},
		{4, 5, 3},
	}
	sumOneAndDivisor := func(tuple [3]float64) float64 {
		one := tuple[0]
		divisor := tuple[2]
		return one + divisor
	}
	sums := make([]float64, len(inputs))
	for index, tuple := range inputs {
		sums[index] = sumOneAndDivisor(tuple)
	}
	fmt.Println("déstructuration =", sums)
}
