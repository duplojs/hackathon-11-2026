// BROUILLON (version any) : Go attendu si Either garde sa valeur dans un champ « Value any ».
package Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b07001badd001ats

import "duplojs.local/transpiled/shard_dependencies"

func Sourced_add(Sourced_one float64, Sourced_two float64) (shard_dependencies.Either) {
	Generated_28 := Sourced_one
	Generated_29 := (float64)(0)
	Generated_30 := Generated_28 < Generated_29
	if !(Generated_30) {
		Generated_32 := Sourced_two
		Generated_33 := (float64)(0)
		Generated_30 = Generated_32 < Generated_33
	}
	if Generated_30 {
		Generated_37 := shard_dependencies.EitherLeft
		Generated_41 := "negative-operand"
		var Generated_38 float64
		Generated_39 := Sourced_one
		Generated_40 := (float64)(0)
		if Generated_39 < Generated_40 {
			Generated_38 = Sourced_one
		} else {
			Generated_38 = Sourced_two
		}
		Generated_42 := Generated_38
		return Generated_37(Generated_41, Generated_42)
	}
	Generated_31 := shard_dependencies.EitherSuccess
	Generated_34 := Sourced_one
	Generated_35 := Sourced_two
	Generated_36 := Generated_34 + Generated_35
	return Generated_31(Generated_36)
}
