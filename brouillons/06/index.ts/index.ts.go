// BROUILLON : Go attendu pour brouillons/variations-06/index.ts
package Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b06001bindex001ats

import (
	"duplojs.local/transpiled/add.ts"
	"duplojs.local/transpiled/shard_dependencies"
)

func init() {
	// const failed = add(-1, 2);
	Generated_16 := Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b06001badd001ats.Sourced_add
	Generated_17 := (float64)(1)
	Generated_18 := -(Generated_17)
	Generated_19 := (float64)(2)
	Sourced_failed := Generated_16(Generated_18, Generated_19)
	// DCommon.print(failed);
	Generated_20 := shard_dependencies.Print
	Generated_21 := Sourced_failed
	Generated_20(Generated_21)

	// DCommon.print(add(1, -5));
	Generated_22 := shard_dependencies.Print
	Generated_23 := Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b06001badd001ats.Sourced_add
	Generated_24 := (float64)(1)
	Generated_25 := (float64)(5)
	Generated_26 := -(Generated_25)
	Generated_27 := Generated_23(Generated_24, Generated_26)
	Generated_22(Generated_27)

	// const message = DEither.matchInformation(failed, { … }) : un switch, un case par traitement.
	Generated_28 := Sourced_failed
	var Generated_29 string
	switch Generated_28.Information {
	case "negative-operand":
		Generated_29 = "un opérande est négatif"
	case "success":
		Generated_29 = "calcul réussi"
	}
	Sourced_message := Generated_29
	// DCommon.print(message);
	Generated_30 := shard_dependencies.Print
	Generated_31 := Sourced_message
	Generated_30(Generated_31)

	// const succeeded = add(1, 2);
	Generated_32 := Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b06001badd001ats.Sourced_add
	Generated_33 := (float64)(1)
	Generated_34 := (float64)(2)
	Sourced_succeeded := Generated_32(Generated_33, Generated_34)

	// const doubled = DEither.matchInformation(succeeded, {
	//   "negative-operand": (operand) => operand * 10,
	//   success: (value) => value * 2,
	// });
	// « _ = x » : Go refuse une variable jamais lue.
	Generated_35 := Sourced_succeeded
	var Generated_36 float64
	switch Generated_35.Information {
	case "negative-operand":
		Sourced_operand := Generated_35.Left
		_ = Sourced_operand
		Generated_37 := Sourced_operand
		Generated_38 := (float64)(10)
		Generated_36 = Generated_37 * Generated_38
	case "success":
		Sourced_value := Generated_35.Right
		_ = Sourced_value
		Generated_39 := Sourced_value
		Generated_40 := (float64)(2)
		Generated_36 = Generated_39 * Generated_40
	}
	Sourced_doubled := Generated_36
	// DCommon.print(doubled);
	Generated_41 := shard_dependencies.Print
	Generated_42 := Sourced_doubled
	Generated_41(Generated_42)
}
