package main

import "fmt"

type EitherSuccess[T any] struct {
	Information string
	Value       T
}

func (v EitherSuccess[T]) IsRight() bool { return true }

func EitherSuccessOf[T any](value T) EitherSuccess[T] {
	return EitherSuccess[T]{Information: "success", Value: value}
}

func trace(label string, value float64) float64 {
	fmt.Println(label)
	return value
}

// Version du boilerplate (ne compile pas) :
//
//	f := EitherSuccessOf
//	return f(one + two)
//	// cannot use generic function EitherSuccessOf without instantiation
//
// Notre version : la déclaration est appelée directement, Go déduit T = float64.
func add(one float64, two float64) EitherSuccess[float64] {
	return EitherSuccessOf(one + two)
}

func main() {
	// Go évalue aussi les arguments d'un appel de gauche à droite.
	result := add(trace("premier argument", 1), trace("second argument", 2))

	fmt.Println(result.IsRight())
}
