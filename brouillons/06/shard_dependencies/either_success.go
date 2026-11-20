// Runtime écrit à la main, copié tel quel dans shard_dependencies.
package shard_dependencies

// EitherSuccessOf = DEither.success(value). Go ne devine pas L : le transpileur écrit [L, R].
func EitherSuccessOf[L any, R any](value R) Either[L, R] {
	return Either[L, R]{
		IsRight:     true,
		Information: "success",
		Kind:        "success",
		Right:       value,
	}
}
