package main

import "fmt"

// number & DNumber.Positive : la marque disparaît, il reste un float64.
func double(value float64) float64 {
	return value * 2
}

func main() {
	// Chaque littéral est converti en float64 avant le calcul, comme en JS.
	// Sans conversion, Go calculerait 0.1 + 0.2 exactement et afficherait 0.3.
	sum := float64(0.1) + float64(0.2)

	// float64 et non int : entre entiers, 3 / 2 vaudrait 1.
	half := float64(3) / float64(2)

	fmt.Println(sum)
	fmt.Println(half)
	fmt.Println(double(4))
}
