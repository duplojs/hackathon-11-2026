// BROUILLON : futur contenu de shard_dependencies pour l'exercice 01.
package shard_dependencies

type JSNull struct{}

type JSUndefined struct{}

// Either : un seul struct, passé par valeur. Kind sert à l'affichage :
// success(3) affiche une clé « success: null » que right("success", 3) n'a pas.
type Either[L any, R any] struct {
	IsRight     bool
	Information string
	Kind        string
	Left        L
	Right       R
}

// DEither.success(value). Go ne devine pas L : le transpileur écrit [L, R].
func EitherSuccessOf[L any, R any](value R) Either[L, R] {
	return Either[L, R]{
		IsRight:     true,
		Information: "success",
		Kind:        "success",
		Right:       value,
	}
}
