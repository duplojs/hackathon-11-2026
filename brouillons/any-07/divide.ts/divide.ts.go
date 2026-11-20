// BROUILLON (version any) : Go attendu si Either garde sa valeur dans un champ « Value any ».
package Sourced_001bhome001bdoual001bDesktop001bhackaton001bprojects001b07001bdivide001ats

import "duplojs.local/transpiled/shard_dependencies"

// Type déduit par TS : Left<"division-by-zero", 0> | Success<number>.
// Après `divisor === 0`, TS sait que divisor vaut 0 : le type de la valeur
// est le type LITTÉRAL 0. Go n'a pas de types littéraux : 0 -> float64.
func Sourced_divide(Sourced_value float64, Sourced_divisor float64) (shard_dependencies.Either) {
	// if (divisor === 0)
	Generated_1 := Sourced_divisor
	Generated_2 := (float64)(0)
	if Generated_1 == Generated_2 {
		// return DEither.left("division-by-zero", divisor);
		Generated_3 := shard_dependencies.EitherLeft
		Generated_4 := "division-by-zero"
		Generated_5 := Sourced_divisor
		return Generated_3(Generated_4, Generated_5)
	}
	// return DEither.success(value / divisor);
	// Division sur des VARIABLES : Go calcule à l'exécution, comme JS (x / 0 = +Inf).
	// Avec deux constantes, « 1 / 0 » ne compilerait même pas.
	Generated_6 := shard_dependencies.EitherSuccess
	Generated_7 := Sourced_value
	Generated_8 := Sourced_divisor
	Generated_9 := Generated_7 / Generated_8
	return Generated_6(Generated_9)
}
