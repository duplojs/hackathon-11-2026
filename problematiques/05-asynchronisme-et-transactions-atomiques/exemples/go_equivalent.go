package main

import (
	"fmt"
)

type EitherLeft[T any] struct {
	Information string
	Value       T
}

type EitherSuccess[T any] struct {
	Value T
}

// Union pour l'opération élémentaire
type DivResult = struct {
	Tag uint8
	V0  EitherLeft[float64]
	V1  EitherSuccess[float64]
}

// Fonction synchrone pure (aplatissement de Promise<T> en T)
func SafeDivision(numerator float64, denominator float64) DivResult {
	if denominator == 0 {
		return DivResult{
			Tag: 0,
			V0:  EitherLeft[float64]{Information: "divide-by-zero", Value: denominator},
		}
	}
	return DivResult{
		Tag: 1,
		V1:  EitherSuccess[float64]{Value: numerator / denominator},
	}
}

// Union pour la transaction de groupe : produit un tuple fixe [3]float64
type GroupResult = struct {
	Tag uint8
	V0  EitherLeft[float64]
	V1  EitherSuccess[[3]float64]
}

func main() {
	// Tableau de 3 getters paresseux
	getters := [3]func() DivResult{
		func() DivResult { return SafeDivision(10, 2) }, // Étape 1 : 5
		func() DivResult { return SafeDivision(20, 4) }, // Étape 2 : 5
		func() DivResult { return SafeDivision(15, 0) }, // Étape 3 : Échec
	}

	// Équivalent Go V2 de DEither.asyncGroup :
	// Allocation sur la pile var values [3]float64 et court-circuit O(1)
	group := func() GroupResult {
		var values [3]float64 // Zéro allocation dynamique sur le tas

		for i, getter := range getters {
			res := getter()
			if res.Tag == 0 {
				// Court-circuit immédiat dès le premier échec (atomicité)
				return GroupResult{Tag: 0, V0: res.V0}
			}
			values[i] = res.V1.Value
		}

		return GroupResult{
			Tag: 1,
			V1:  EitherSuccess[[3]float64]{Value: values},
		}
	}()

	// whenIsRightOtherwise
	if group.Tag == 1 {
		fmt.Printf("Succès : %v\n", group.V1.Value)
	} else {
		// Affiche l'annulation transactionnelle
		fmt.Println("[ transaction annulée ]")
	}
}
