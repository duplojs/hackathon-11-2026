// Stratégie retenue, écrite à la main : un seul struct générique Either[L, R],
// passé par valeur (voir duplo/either.go). L = type des valeurs Left, R = type des valeurs Right.
package main

import "livrable/duplo"

// TS : Left<"negative-operand", number> | Success<number>  ->  Either[float64, float64]
func add(one float64, two float64) duplo.Either[float64, float64] {
	if one < 0 || two < 0 {
		var operand float64 // le ternaire `one < 0 ? one : two` (voir problématique 04)
		if one < 0 {
			operand = one
		} else {
			operand = two
		}
		return duplo.EitherLeftOf[float64, float64]("negative-operand", operand)
	}
	return duplo.EitherSuccessOf[float64, float64](one + two)
}

// TS : Fail | Success<number>  ->  Either[JSUndefined, float64]
// Fail n'a pas de valeur : JSUndefined est un struct vide (0 octet), affiché « undefined ».
func check(value float64) duplo.Either[duplo.JSUndefined, float64] {
	if value == 0 {
		return duplo.EitherFailOf[duplo.JSUndefined, float64]()
	}
	return duplo.EitherSuccessOf[duplo.JSUndefined, float64](value)
}

func main() {
	sum := add(1, 2)

	// DEither.isRight(sum) : la lecture d'un champ, pas d'appel ni de test de type.
	if sum.IsRight {
		duplo.Print(sum)
	}

	duplo.Print(add(-4, 2))
	duplo.Print(check(0))

	// DEither.right("success", 3) : Kind reste vide, donc pas de 4e clé à l'affichage.
	duplo.Print(duplo.Either[duplo.JSUndefined, float64]{
		IsRight:     true,
		Information: "success",
		Right:       3,
	})
}
