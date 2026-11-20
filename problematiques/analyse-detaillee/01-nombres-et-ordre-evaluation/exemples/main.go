// Problématique 01 : nombres et ordre d'évaluation.
// Exécution : go run ./01-nombres-et-ordre-evaluation/exemples
package main

import (
	"fmt"
	"math"
)

var counter float64 = 1

func bump() float64 {
	counter += 10
	return counter
}

func trace(label string, value float64) float64 {
	fmt.Println("évalue", label)
	return value
}

func add(one float64, two float64) float64 {
	return one + two
}

func main() {
	// 1. number -> float64 : même format IEEE 754 double précision.
	//
	// Piège : en Go, l'arithmétique sur des CONSTANTES est exacte (précision
	// arbitraire). Une traduction naïve qui recopie les littéraux change le
	// résultat.
	fmt.Println("naïf     0.1 + 0.2 =", 0.1+0.2) // 0.3 : calcul exact à la compilation

	// Stratégie retenue : chaque opérande passe par une variable typée float64,
	// ce qui force le calcul à l'exécution, comme en JavaScript.
	tenth := float64(0.1)
	fifth := float64(0.2)
	fmt.Println("retenu   0.1 + 0.2 =", tenth+fifth) // 0.30000000000000004

	// Même problème pour le zéro négatif : la constante -0.0 vaut 0
	// (staticcheck le signale d'ailleurs : SA4026).
	zero := float64(0)
	negativeZero := -zero
	fmt.Println("naïf     -0 signé ?", math.Signbit(-0.0))         // false
	fmt.Println("retenu   -0 signé ?", math.Signbit(negativeZero)) // true

	// 2. Ordre d'évaluation.
	//
	// La spécification Go ne fixe pas l'ordre entre la lecture d'une variable
	// et un appel de fonction dans la même expression : `counter + bump()` peut
	// valoir 12 ou 22 selon le compilateur. JavaScript, lui, impose 1 + 11 = 12.
	//
	// Avec Go 1.27 (gc), la version naïve donne 22 : bump() est appelé avant
	// la lecture de counter.
	fmt.Println("naïf     counter + bump() =", counter+bump()) // 22
	counter = 1

	// Stratégie retenue : chaque opérande est d'abord stocké dans une variable
	// temporaire, dans l'ordre du source. L'ordre devient explicite.
	left := counter
	right := bump()
	total := left + right
	fmt.Println("retenu   counter + bump() =", total) // 12, comme en JavaScript

	// 3. Préparer un appel : la fonction, puis chaque argument, dans l'ordre.
	// Un argument complexe peut ainsi émettre ses propres instructions avant
	// l'appel sans changer l'ordre des effets.
	callable := add
	firstArgument := trace("premier", 1)
	secondArgument := trace("second", 2)
	fmt.Println("add =", callable(firstArgument, secondArgument))
}
