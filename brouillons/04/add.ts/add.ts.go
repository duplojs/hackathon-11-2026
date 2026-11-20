// BROUILLON : Go attendu pour projects/04/add.ts
package Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b04001badd001ats

import "duplojs.local/transpiled/shard_dependencies"

// Pas de type de retour écrit : le checker déduit Fail | Success<number>.
func Sourced_add(Sourced_one float64, Sourced_two float64) (shard_dependencies.Either[shard_dependencies.JSUndefined, float64]) {
	// if (one === -1) : le moins sur une variable, sinon -0 deviendrait 0.
	Generated_7 := Sourced_one
	Generated_9 := (float64)(1)
	Generated_8 := -Generated_9
	if Generated_7 == Generated_8 {
		// return DEither.fail();
		Generated_10 := shard_dependencies.EitherFailOf[shard_dependencies.JSUndefined, float64]
		return Generated_10()
	}
	// return DEither.success(one + two);
	Generated_11 := shard_dependencies.EitherSuccessOf[shard_dependencies.JSUndefined, float64]
	Generated_12 := Sourced_one
	Generated_13 := Sourced_two
	Generated_14 := Generated_12 + Generated_13
	return Generated_11(Generated_14)
}
