// Runtime écrit à la main, copié tel quel dans shard_dependencies.
package shard_dependencies

// EitherLeftOf = DEither.left(information, value). Kind vide : pas de clé en plus à l'affichage.
func EitherLeftOf[L any, R any](information string, value L) Either[L, R] {
	return Either[L, R]{
		IsRight:     false,
		Information: information,
		Left:        value,
	}
}
