// Copie du runtime écrit à la main du transpileur (src/transpiler/transformers/duplojs/…),
// seul le nom du paquet change : shard_dependencies -> duplo. Utilisé par les exemples du livrable.
package duplo

// EitherSuccessOf = DEither.success(value). Go ne devine pas L : le transpileur écrit [L, R].
func EitherSuccessOf[L any, R any](value R) Either[L, R] {
	return Either[L, R]{
		IsRight:     true,
		Information: "success",
		Kind:        "success",
		Right:       value,
	}
}
