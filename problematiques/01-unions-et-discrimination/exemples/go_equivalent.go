package main

import "fmt"

// Représentation sobre de EitherFail et EitherSuccess
type EitherFail struct{}

type EitherSuccess[T any] struct {
	Value T
}

// Union étiquetée générique à 2 membres allouée sur la pile (Stack)
type Union2[T0 any, T1 any] struct {
	Tag uint8
	V0  T0
	V1  T1
}

// Signature statique équivalente : Union2[EitherFail, EitherSuccess[float64]]
type DivideResult = Union2[EitherFail, EitherSuccess[float64]]

func Divide(numerator float64, denominator float64) DivideResult {
	if denominator == 0 {
		// Tag 0 réservé canoniquement à EitherFail
		return DivideResult{
			Tag: 0,
			V0:  EitherFail{},
		}
	}
	// Tag 1 réservé canoniquement à EitherSuccess[float64]
	return DivideResult{
		Tag: 1,
		V1:  EitherSuccess[float64]{Value: numerator / denominator},
	}
}

func main() {
	calculation := Divide(10, 2)

	// Équivalent Go du garde DEither.isRight(calculation) :
	// Simple test d'égalité entière en 1 cycle d'horloge CPU (zéro réflexion)
	if calculation.Tag == 1 {
		fmt.Printf("Résultat valide : %v\n", calculation.V1.Value)
	} else {
		fmt.Println("Calcul impossible (division par zéro).")
	}
}
