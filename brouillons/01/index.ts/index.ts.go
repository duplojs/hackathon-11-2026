// BROUILLON : Go attendu pour projects/01/index.ts
package Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b01001bindex001ats

import (
	"duplojs.local/transpiled/add.ts"
	"duplojs.local/transpiled/shard_dependencies"
)

func init() {
	// const result = add(1, 2);
	Generated_1 := Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b01001badd001ats.Sourced_add
	Generated_2 := (float64)(1)
	Generated_3 := (float64)(2)
	Sourced_result := Generated_1(Generated_2, Generated_3)
	// if (DEither.isRight(result)) : un simple accès au champ.
	if Sourced_result.IsRight {
		// DCommon.print(result);
		Generated_4 := shard_dependencies.Print
		Generated_5 := Sourced_result
		Generated_4(Generated_5)
	}
}
