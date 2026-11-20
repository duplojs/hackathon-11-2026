// Copie du runtime écrit à la main du transpileur (src/transpiler/transformers/duplojs/…),
// seul le nom du paquet change : shard_dependencies -> duplo. Utilisé par les exemples du livrable.
package duplo

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
