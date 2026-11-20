// Copie du runtime écrit à la main du transpileur (src/transpiler/transformers/duplojs/…),
// seul le nom du paquet change : shard_dependencies -> duplo. Utilisé par les exemples du livrable.
package duplo

// EitherFailOf = DEither.fail(). Left reste vide : JSUndefined{}, affiché « undefined ».
func EitherFailOf[L any, R any]() Either[L, R] {
	return Either[L, R]{
		IsRight:     false,
		Information: "fail",
		Kind:        "fail",
	}
}
