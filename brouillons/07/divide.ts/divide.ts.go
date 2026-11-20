// BROUILLON : Go attendu pour projects/07/divide.ts
package Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b07001bdivide001ats

import "duplojs.local/transpiled/shard_dependencies"

// Left<"division-by-zero", 0> | Success<number> -> Either[float64, float64]
func Sourced_divide(Sourced_value float64, Sourced_divisor float64) (shard_dependencies.Either[float64, float64]) {
	// if (divisor === 0)
	Generated_1 := Sourced_divisor
	Generated_2 := (float64)(0)
	if Generated_1 == Generated_2 {
		// return DEither.left("division-by-zero", divisor);
		Generated_3 := shard_dependencies.EitherLeftOf[float64, float64]
		Generated_4 := "division-by-zero"
		Generated_5 := Sourced_divisor
		return Generated_3(Generated_4, Generated_5)
	}
	// return DEither.success(value / divisor);  (variables : x / 0 = +Inf, comme JS)
	Generated_6 := shard_dependencies.EitherSuccessOf[float64, float64]
	Generated_7 := Sourced_value
	Generated_8 := Sourced_divisor
	Generated_9 := Generated_7 / Generated_8
	return Generated_6(Generated_9)
}
