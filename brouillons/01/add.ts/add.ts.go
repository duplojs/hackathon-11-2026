// BROUILLON : Go attendu pour projects/01/add.ts
package Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b01001badd001ats

import "duplojs.local/transpiled/shard_dependencies"

// Success<number> | Fail -> Either[JSUndefined, float64]
func Sourced_add(Sourced_one float64, Sourced_two float64) (shard_dependencies.Either[shard_dependencies.JSUndefined, float64]) {
	// [L, R] obligatoire pour ranger la fonction dans une variable.
	Generated_6 := shard_dependencies.EitherSuccessOf[shard_dependencies.JSUndefined, float64]
	Generated_7 := Sourced_one
	Generated_8 := Sourced_two
	Generated_9 := Generated_7 + Generated_8
	return Generated_6(Generated_9)
}
