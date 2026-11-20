// Copie du runtime écrit à la main du transpileur (src/transpiler/transformers/duplojs/…),
// seul le nom du paquet change : shard_dependencies -> duplo. Utilisé par les exemples du livrable.
package duplo

// EitherLeftOf = DEither.left(information, value). Kind vide : pas de clé en plus à l'affichage.
func EitherLeftOf[L any, R any](information string, value L) Either[L, R] {
	return Either[L, R]{
		IsRight:     false,
		Information: information,
		Left:        value,
	}
}
