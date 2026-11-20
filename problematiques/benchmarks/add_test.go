package benchmarks

import "testing"

type Either interface {
	IsRight() bool
	GetInformation() string
	GetValue() any
}

type EitherSuccess[T any] struct {
	Information string
	Value       T
}

func (v EitherSuccess[T]) IsRight() bool          { return true }
func (v EitherSuccess[T]) GetInformation() string { return v.Information }
func (v EitherSuccess[T]) GetValue() any          { return v.Value }

type EitherLeft[T any] struct {
	Information string
	Value       T
}

func (v EitherLeft[T]) IsRight() bool          { return false }
func (v EitherLeft[T]) GetInformation() string { return v.Information }
func (v EitherLeft[T]) GetValue() any          { return v.Value }

func EitherSuccessOf[T any](value T) EitherSuccess[T] {
	return EitherSuccess[T]{Information: "success", Value: value}
}

func EitherLeftOf[T any](information string, value T) EitherLeft[T] {
	return EitherLeft[T]{Information: information, Value: value}
}

// Projet 00 : une seule variante possible, le type concret est conservé.
func addConcrete(one float64, two float64) EitherSuccess[float64] {
	return EitherSuccessOf(one + two)
}

// Projet 06 : deux variantes possibles, le retour passe par l'interface.
func addUnion(one float64, two float64) Either {
	if one < 0 || two < 0 {
		return EitherLeftOf("negative-operand", one)
	}

	return EitherSuccessOf(one + two)
}

var sinkFloat float64
var sinkBool bool

func BenchmarkAddConcrete(b *testing.B) {
	for i := 0; i < b.N; i++ {
		sinkFloat = addConcrete(float64(i&1023), 2).Value
	}
}

func BenchmarkAddUnionSuccess(b *testing.B) {
	for i := 0; i < b.N; i++ {
		sinkBool = addUnion(float64(i&1023), 2).IsRight()
	}
}

func BenchmarkAddUnionLeft(b *testing.B) {
	for i := 0; i < b.N; i++ {
		sinkBool = addUnion(-1, float64(i&1023)).IsRight()
	}
}
