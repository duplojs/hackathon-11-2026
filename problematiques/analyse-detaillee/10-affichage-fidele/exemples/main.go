// Problématique 10 : reproduire exactement l'affichage de Node.
// Exécution : go run ./10-affichage-fidele/exemples
// Test différentiel : voir README.md
package main

import (
	"fmt"
	"math"
	"os"
	"strings"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "differential" {
		writeDifferentialSamples(os.Args[2])
		return
	}

	tenth, fifth := 0.1, 0.2
	zero := 0.0
	samples := []float64{3, tenth + fifth, 123456789012, 1e21, 1.5e-7, 0.000001, -zero, math.Pow(2, 53)}

	// Version naïve : le formatage par défaut de Go.
	naive := make([]string, len(samples))
	for index, value := range samples {
		naive[index] = fmt.Sprint(value)
	}
	fmt.Println("naïf   :", strings.Join(naive, " | "))

	// Version retenue : Number::toString.
	retained := make([]string, len(samples))
	for index, value := range samples {
		retained[index] = jsNumberToString(value)
	}
	fmt.Println("retenu :", strings.Join(retained, " | "))

	// print : l'inspecteur est choisi selon le type statique de l'argument.
	fmt.Println(inspectNumber(-zero))                                           // number
	fmt.Println("échec")                                                        // string seule : telle quelle
	fmt.Println(inspectSlice(inspectQuotedString)([]string{"3", "3", "échec"})) // string[]
	fmt.Println(inspectSlice(inspectNumber)([]float64{3, tenth + fifth}))       // number[]
	fmt.Println(inspectSlice(inspectNumber)([]float64{}))                       // tableau vide
}
