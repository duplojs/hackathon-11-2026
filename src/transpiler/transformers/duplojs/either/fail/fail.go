// Runtime écrit à la main, copié tel quel dans shard_dependencies.
package shard_dependencies

// EitherFailOf = DEither.fail(). Left reste vide : JSUndefined{}, affiché « undefined ».
func EitherFailOf[L any, R any]() Either[L, R] {
	return Either[L, R]{
		IsRight:     false,
		Information: "fail",
		Kind:        "fail",
	}
}
