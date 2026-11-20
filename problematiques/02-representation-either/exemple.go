package main

import "fmt"

// Le contrat commun à toutes les variantes.
type Either interface {
	IsRight() bool
	GetInformation() string
	GetValue() any
}

// Une struct par constructeur DuploJS (champs marqueurs omis pour la lecture).
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

// Le type de retour est l'interface : Go convertit chaque variante,
// aucune règle spéciale pour les deux return.
func add(one float64, two float64) Either {
	if one < 0 {
		return EitherLeftOf("negative-operand", one)
	}

	return EitherSuccessOf(one + two)
}

func main() {
	ok := add(1, 2)
	ko := add(-1, 2)

	// DEither.isRight(x) devient un simple appel de méthode.
	fmt.Println(ok.IsRight())
	fmt.Println(ko.IsRight())
}
