package main

import (
	"bufio"
	"fmt"
	"math"
	"math/rand/v2"
	"os"
)

// Test différentiel : génère des float64 aléatoires (bits quelconques, donc
// toutes les magnitudes, y compris sous-normales) et écrit pour chacun ses
// bits et le texte produit par jsNumberToString. Le script compare.ts relit
// le fichier et vérifie, avec le vrai moteur JavaScript, que String(x) donne
// exactement le même texte.
func writeDifferentialSamples(path string) {
	file, err := os.Create(path)
	if err != nil {
		panic(err)
	}
	defer file.Close()
	writer := bufio.NewWriter(file)
	defer writer.Flush()

	random := rand.New(rand.NewPCG(1, 2))
	const count = 200_000
	for range count {
		var value float64
		if random.IntN(2) == 0 {
			value = math.Float64frombits(random.Uint64()) // toutes magnitudes
		} else {
			value = random.Float64() * math.Pow(10, float64(random.IntN(30)-8)) // valeurs « courantes »
		}
		if math.IsNaN(value) {
			continue
		}
		fmt.Fprintf(writer, "%016x %s\n", math.Float64bits(value), jsNumberToString(value))
	}
}
