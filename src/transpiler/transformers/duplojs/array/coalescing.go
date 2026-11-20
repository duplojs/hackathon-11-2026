// Code Go écrit à la main (runtime), copié tel quel dans shard_dependencies
// par le transpileur. Voir sharedDependency.ts à côté de ce fichier.
package shard_dependencies

// DArray.coalescing(value) en TS : un tableau est renvoyé tel quel, le reste est
// enveloppé dans un tableau d'un élément (3 -> [3]).
// Go n'a pas de « soit tableau, soit valeur » : le transformer regarde le type TS
// de la valeur reçue et choisit l'une des deux fonctions ci-dessous.

// Coalescing : la valeur n'est pas un tableau, on l'enveloppe (float64 -> []float64).
// Générique : pas de any, le type des éléments est celui de la valeur.
func Coalescing[T any](value T) []T {
	return []T{value}
}

// CoalescingArray : la valeur est déjà un tableau, on la renvoie telle quelle.
func CoalescingArray[T any](value []T) []T {
	return value
}
