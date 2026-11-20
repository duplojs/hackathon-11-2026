// Stratégie de l'équipe, écrite à la main : `number` -> float64, et chaque opérande
// est rangé dans une variable float64 avant l'opération. Le transpileur produit la
// même forme (avec des noms Generated_N).
package main

import "livrable/duplo"

func main() {
	// 1. 0.1 + 0.2 : les littéraux deviennent des variables float64, l'addition se fait
	//    donc à l'exécution, en IEEE 754 comme JS (avec deux constantes, Go afficherait 0.3).
	tenth := float64(0.1)
	fifth := float64(0.2)
	duplo.Print(tenth + fifth) // 0.30000000000000004

	// 2. -0 : le moins est appliqué à une variable (une constante Go n'a pas de zéro négatif).
	zeroLiteral := float64(0)
	duplo.Print(-zeroLiteral) // -0

	// 3. Division par une variable : calculée à l'exécution, comme JS
	//    (avec deux constantes, `1 / 0` ne compile pas en Go).
	zero := float64(0)
	one := float64(1)
	duplo.Print(one / zero)  // Infinity
	duplo.Print(-one / zero) // -Infinity
	duplo.Print(zero / zero) // NaN
}
