// BROUILLON (version any) : Go attendu si Either garde sa valeur dans un champ « Value any ».
// (le vrai projects/07/index.ts a aussi besoin de pipe, whenIsRightOtherwise,
// DArray.map et DString.to : exercices 02 à 05, autres chantiers).
package Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b07001bindex001ats

import (
	"duplojs.local/transpiled/add.ts"
	"duplojs.local/transpiled/divide.ts"
	"duplojs.local/transpiled/shard_dependencies"
)

// function double(value: number) { return value * 2; }
func Sourced_double(Sourced_value float64) (float64) {
	Generated_50 := Sourced_value
	Generated_51 := (float64)(2)
	return Generated_50 * Generated_51
}

func init() {
	// const result = DEither.rightPipe(add(1, 2), (value) => divide(value, 0));
	//
	// Pas de fonction anonyme (décision n°5). L'Either d'entrée est rangé dans
	// une variable (l'« accumulateur ») ; chaque étape devient UN if :
	// « si c'est encore un succès, calcule l'étape suivante avec sa valeur ».
	// Dès qu'une étape renvoie un échec, les if suivants sont sautés et l'échec
	// est gardé, comme en TS.
	Generated_1 := Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b07001badd001ats.Sourced_add
	Generated_2 := (float64)(1)
	Generated_3 := (float64)(2)
	Generated_4 := Generated_1(Generated_2, Generated_3)
	if Generated_4.IsRight {
		// étape (value) => divide(value, 0)
		Sourced_value := Generated_4.Value.(float64)
		_ = Sourced_value
		Generated_5 := Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b07001bdivide001ats.Sourced_divide
		Generated_6 := Sourced_value
		Generated_7 := (float64)(0)
		Generated_4 = Generated_5(Generated_6, Generated_7)
	}
	Sourced_result := Generated_4
	// DCommon.print(result);
	Generated_8 := shard_dependencies.Print
	Generated_9 := Sourced_result
	Generated_8(Generated_9)

	// DCommon.print(DEither.rightPipe(add(-1, 2), (value) => divide(value, 0)));
	Generated_10 := shard_dependencies.Print
	Generated_11 := Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b07001badd001ats.Sourced_add
	Generated_12 := (float64)(1)
	Generated_13 := -(Generated_12)
	Generated_14 := (float64)(2)
	Generated_15 := Generated_11(Generated_13, Generated_14)
	if Generated_15.IsRight {
		Sourced_value := Generated_15.Value.(float64)
		_ = Sourced_value
		Generated_16 := Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b07001bdivide001ats.Sourced_divide
		Generated_17 := Sourced_value
		Generated_18 := (float64)(0)
		Generated_15 = Generated_16(Generated_17, Generated_18)
	}
	Generated_19 := Generated_15
	Generated_10(Generated_19)

	// const divided = DEither.rightPipe(add(4, 5), (value) => divide(value, 3));
	Generated_20 := Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b07001badd001ats.Sourced_add
	Generated_21 := (float64)(4)
	Generated_22 := (float64)(5)
	Generated_23 := Generated_20(Generated_21, Generated_22)
	if Generated_23.IsRight {
		Sourced_value := Generated_23.Value.(float64)
		_ = Sourced_value
		Generated_24 := Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b07001bdivide001ats.Sourced_divide
		Generated_25 := Sourced_value
		Generated_26 := (float64)(3)
		Generated_23 = Generated_24(Generated_25, Generated_26)
	}
	Sourced_divided := Generated_23
	Generated_27 := shard_dependencies.Print
	Generated_28 := Sourced_divided
	Generated_27(Generated_28)

	// const code = DEither.matchInformation(result, {
	//   "negative-operand": (operand) => operand,
	//   "division-by-zero": () => -1,
	//   success: double,
	// });
	Generated_29 := Sourced_result
	var Generated_30 float64
	switch Generated_29.Information {
	case "negative-operand":
		Sourced_operand := Generated_29.Value.(float64)
		_ = Sourced_operand
		Generated_30 = Sourced_operand
	case "division-by-zero":
		Generated_31 := (float64)(1)
		Generated_30 = -(Generated_31)
	case "success":
		// Traitement passé par son nom : un simple appel avec la valeur.
		Generated_30 = Sourced_double(Generated_29.Value.(float64))
	}
	Sourced_code := Generated_30
	Generated_32 := shard_dependencies.Print
	Generated_33 := Sourced_code
	Generated_32(Generated_33)

	// const doubled = DEither.matchInformation(divided, { …mêmes traitements… });
	Generated_34 := Sourced_divided
	var Generated_35 float64
	switch Generated_34.Information {
	case "negative-operand":
		Sourced_operand := Generated_34.Value.(float64)
		_ = Sourced_operand
		Generated_35 = Sourced_operand
	case "division-by-zero":
		Generated_36 := (float64)(1)
		Generated_35 = -(Generated_36)
	case "success":
		Generated_35 = Sourced_double(Generated_34.Value.(float64))
	}
	Sourced_doubled := Generated_35
	Generated_37 := shard_dependencies.Print
	Generated_38 := Sourced_doubled
	Generated_37(Generated_38)
}
