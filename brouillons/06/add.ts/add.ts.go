// BROUILLON : Go attendu pour projects/06/add.ts
package Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b06001badd001ats

import "duplojs.local/transpiled/shard_dependencies"

// Left<"negative-operand", number> | Success<number> -> Either[float64, float64]
func Sourced_add(Sourced_one float64, Sourced_two float64) (shard_dependencies.Either[float64, float64]) {
	// if (one < 0 || two < 0) : la droite n'est calculée que si la gauche est fausse.
	Generated_1 := Sourced_one
	Generated_2 := (float64)(0)
	Generated_3 := Generated_1 < Generated_2
	if !Generated_3 {
		Generated_4 := Sourced_two
		Generated_5 := (float64)(0)
		Generated_3 = Generated_4 < Generated_5
	}
	if Generated_3 {
		// return DEither.left("negative-operand", one < 0 ? one : two);
		Generated_6 := shard_dependencies.EitherLeftOf[float64, float64]
		Generated_7 := "negative-operand"
		// Ternaire : une variable remplie par un if/else.
		var Generated_8 float64
		Generated_9 := Sourced_one
		Generated_10 := (float64)(0)
		if Generated_9 < Generated_10 {
			Generated_8 = Sourced_one
		} else {
			Generated_8 = Sourced_two
		}
		Generated_11 := Generated_8
		return Generated_6(Generated_7, Generated_11)
	}
	// return DEither.success(one + two);
	Generated_12 := shard_dependencies.EitherSuccessOf[float64, float64]
	Generated_13 := Sourced_one
	Generated_14 := Sourced_two
	Generated_15 := Generated_13 + Generated_14
	return Generated_12(Generated_15)
}
