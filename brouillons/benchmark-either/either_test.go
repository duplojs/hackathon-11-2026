// Benchmark de la représentation de l'Either, à lancer avec :
//
//	cd brouillons/benchmark-either && go test -bench . -benchmem -count 5
//
// Il compare la struct livrée par l'équipe (Either[L, R], champs typés) à la
// variante écartée où la valeur est rangée dans un seul champ `any`.
// Les deux font le même travail : créer l'Either renvoyé par add(1, 2), puis
// lire sa valeur. `add` n'est pas inlinée pour que Go ne calcule pas tout à
// la compilation ; c'est donc un micro-benchmark, pas une mesure du programme.
package benchmark_either

import "testing"

type JSUndefined struct{}

// La struct de l'équipe (shard_dependencies/either.go).
type Either[L any, R any] struct {
	IsRight     bool
	Information string
	Kind        string
	Left        L
	Right       R
}

// La variante écartée : une seule valeur, de type any.
type AnyEither struct {
	IsRight     bool
	Information string
	Kind        string
	Value       any
}

//go:noinline
func addTyped(a, b float64) Either[JSUndefined, float64] {
	if a < 0 || b < 0 {
		return Either[JSUndefined, float64]{Information: "fail", Kind: "fail"}
	}
	return Either[JSUndefined, float64]{IsRight: true, Information: "success", Kind: "success", Right: a + b}
}

//go:noinline
func addAny(a, b float64) AnyEither {
	if a < 0 || b < 0 {
		return AnyEither{Information: "fail", Kind: "fail", Value: JSUndefined{}}
	}
	return AnyEither{IsRight: true, Information: "success", Kind: "success", Value: a + b}
}

var sink float64

func BenchmarkEitherTyped(b *testing.B) {
	for i := 0; i < b.N; i++ {
		result := addTyped(float64(i), 2)
		if result.IsRight {
			sink += result.Right
		}
	}
}

func BenchmarkEitherAny(b *testing.B) {
	for i := 0; i < b.N; i++ {
		result := addAny(float64(i), 2)
		if result.IsRight {
			sink += result.Value.(float64)
		}
	}
}
