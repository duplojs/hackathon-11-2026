package main

import "fmt"

func check(value float64) float64 {
	fmt.Println("check appelé")
	return value * 2
}

// Go n'a pas d'opérateur ternaire : une variable typée, puis un if/else.
// Un helper ternary(c, a, b) évaluerait les deux branches avant l'appel.
func pick(one float64, two float64) float64 {
	var result float64
	if one < 0 {
		result = one
	} else {
		result = two
	}
	return result
}

func main() {
	ready := float64(3)

	// Le || de Go court-circuite déjà : check n'est pas appelé.
	// Si le côté droit avait des préparations, elles iraient dans un
	// "if !ok { ... }" au lieu d'être exécutées avant le ||.
	ok := ready > 1 || check(2) > 0

	fmt.Println(ok)
	fmt.Println(pick(-1, 2))
	fmt.Println(pick(1, 2))
}
