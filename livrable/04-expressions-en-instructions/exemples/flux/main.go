// Stratégie retenue, écrite à la main : chaque expression « qui choisit » devient
// une variable, remplie par des instructions if (le mécanisme before / result).
package main

import "livrable/duplo"

func isPositive(value float64) bool {
	duplo.Print(value)
	return value > 0
}

func pick(value float64) float64 {
	duplo.Print(value)
	return value
}

func sign(value float64) string {
	if value < 0 {
		return "négatif"
	}
	// Ternaire dans un return : la variable est déclarée avec le type donné par le checker TS.
	var label string
	if value == 0 {
		label = "nul"
	} else {
		label = "positif"
	}
	return label
}

func main() {
	// 1. a || b  ->  r := a ; if !r { r = b }
	// (le `||` de Go court-circuite aussi, mais il ne peut pas contenir les instructions de
	// préparation d'une partie droite complexe : la forme en if marche dans tous les cas.)
	either := isPositive(1)
	if !either {
		either = isPositive(2)
	}
	if either {
		duplo.Print("ou : vrai")
	}

	// 2. a && b  ->  r := a ; if r { r = b }
	both := isPositive(-3)
	if both {
		both = isPositive(4)
	}
	if both {
		duplo.Print("et : vrai")
	} else {
		// 3. else if : les préparations de la 2e condition restent DANS le else.
		second := isPositive(5)
		if second {
			duplo.Print("else if : vrai")
		}
	}

	// 4. c ? a : b  ->  var r T ; if c { r = a } else { r = b }
	var chosen float64
	if isPositive(7) {
		chosen = pick(10)
	} else {
		chosen = pick(20)
	}
	duplo.Print(chosen)

	// 5. Plusieurs chemins de retour.
	duplo.Print(sign(-2))
	duplo.Print(sign(0))
	duplo.Print(sign(9))
}
