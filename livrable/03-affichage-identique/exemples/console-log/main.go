// Les mêmes valeurs, affichées par duplo.Print (copie de print.go, écrit à la main).
package main

import (
	"math"

	"livrable/duplo"
)

type eitherNumber = duplo.Either[duplo.JSUndefined, float64]

func success(value float64) eitherNumber {
	return duplo.EitherSuccessOf[duplo.JSUndefined, float64](value)
}

func main() {
	// 1. Nombres.
	duplo.Print(1e21)
	duplo.Print(1e-7)
	duplo.Print(math.Copysign(0, -1)) // -0
	duplo.Print(math.Pow(2, 53))

	// 2. Chaînes.
	duplo.Print("texte brut")
	duplo.Print([]string{"simple", "it's", "it's \"x\""})

	// 3. Longueurs UTF-16.
	tenEmojis := "😀😀😀😀😀😀😀😀😀😀"
	duplo.Print([]string{tenEmojis, tenEmojis, tenEmojis, "😀😀😀😀😀😀"})

	// 4. Plus de 6 éléments.
	multiples := make([]float64, 26)
	for index := range multiples {
		multiples[index] = float64(index * 7)
	}
	duplo.Print(multiples)

	// 5. Objet sur plusieurs lignes.
	duplo.Print(success(3))

	// 6. Profondeur maximale.
	duplo.Print([][][]eitherNumber{{{success(1)}}})
}
