// BROUILLON : Go attendu pour brouillons/variations-04/index.ts
package Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b04001bindex001ats

import (
	"duplojs.local/transpiled/add.ts"
	"duplojs.local/transpiled/shard_dependencies"
)

func init() {
	// const failed = add(-1, 2);
	Generated_1 := Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b04001badd001ats.Sourced_add
	Generated_16 := (float64)(1)
	Generated_2 := -Generated_16
	Generated_3 := (float64)(2)
	Sourced_failed := Generated_1(Generated_2, Generated_3)
	// DCommon.print(failed);
	Generated_4 := shard_dependencies.Print
	Generated_5 := Sourced_failed
	Generated_4(Generated_5)

	// const succeeded = add(1, 2);
	Generated_17 := Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b04001badd001ats.Sourced_add
	Generated_18 := (float64)(1)
	Generated_19 := (float64)(2)
	Sourced_succeeded := Generated_17(Generated_18, Generated_19)
	// if (DEither.isRight(succeeded)) { DCommon.print(succeeded); }
	if Sourced_succeeded.IsRight {
		Generated_20 := shard_dependencies.Print
		Generated_21 := Sourced_succeeded
		Generated_20(Generated_21)
	}

	// DCommon.print(add(-0, -0));
	Generated_22 := shard_dependencies.Print
	Generated_23 := Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b04001badd001ats.Sourced_add
	Generated_24 := (float64)(0)
	Generated_25 := -Generated_24
	Generated_26 := (float64)(0)
	Generated_27 := -Generated_26
	Generated_28 := Generated_23(Generated_25, Generated_27)
	Generated_22(Generated_28)
}
