package main

import (
	"fmt"
	"strconv"
	"strings"
)

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

func divide(value float64, divisor float64) Either {
	if divisor == 0 {
		return EitherLeftOf("division-by-zero", divisor)
	}

	return EitherSuccessOf(value / divisor)
}

// Le pipe est déplié étape par étape : aucune closure pour la composition.
func compute(divisor float64) []string {
	// rightPipe : on n'exécute l'étape que si le résultat précédent est un Right.
	var result Either = EitherSuccessOf(10.0)
	if result.IsRight() {
		result = divide(result.GetValue().(float64), divisor)
	}

	// whenIsRightOtherwise : un if/else, et un résultat typé.
	var values []float64
	if result.IsRight() {
		values = []float64{result.GetValue().(float64)} // DArray.coalescing
	} else {
		values = []float64{-1}
	}

	// DArray.map : le slice est alloué une seule fois, à la bonne taille.
	texts := make([]string, len(values))
	for index, value := range values {
		texts[index] = strconv.FormatFloat(value, 'f', -1, 64) // DString.to
	}

	return texts
}

func main() {
	fmt.Println(strings.Join(compute(2), ","))
	fmt.Println(strings.Join(compute(0), ","))
}
