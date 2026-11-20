package main

import (
	"fmt"
	"strconv"
)

// Helper de bibliothèque générique pour mapper une collection (attend une slice []T)
func ArrayMap[T any, U any](slice []T, mapper func(T) U) []U {
	result := make([]U, len(slice))
	for i, v := range slice {
		result[i] = mapper(v)
	}
	return result
}

func main() {
	// Résultat de l'aiguillage : stocké dans un tableau fixe de taille 1 sur la pile (Stack)
	var container [1]float64 = [1]float64{42}

	// PROBLÉMATIQUE :
	// ArrayMap(container, ...) provoque une erreur de compilation :
	// "cannot use container (type [1]float64) as []float64"

	// SOLUTION V2 : Slicing zéro-copie container[:]
	// Crée instantanément une vue slice pointant sur la mémoire de la pile
	formattedStrings := ArrayMap(container[:], func(val float64) string {
		return strconv.FormatFloat(val, 'f', -1, 64)
	})

	fmt.Println(formattedStrings) // Affiche : [42]
}
