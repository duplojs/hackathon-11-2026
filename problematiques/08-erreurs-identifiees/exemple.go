package main

import (
	"fmt"
	"strconv"
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

func add(one float64, two float64) Either {
	if one < 0 || two < 0 {
		var operand float64
		if one < 0 {
			operand = one
		} else {
			operand = two
		}
		return EitherLeftOf("negative-operand", operand)
	}

	return EitherSuccessOf(one + two)
}

func divide(value float64, divisor float64) Either {
	if divisor == 0 {
		return EitherLeftOf("division-by-zero", divisor)
	}

	return EitherSuccessOf(value / divisor)
}

func message(one float64, two float64, divisor float64) string {
	result := add(one, two)
	if result.IsRight() {
		result = divide(result.GetValue().(float64), divisor)
	}

	// Un switch sur l'information : deux erreurs du même type Go
	// (EitherLeft[float64]) restent distinguées.
	switch result.GetInformation() {
	case "negative-operand":
		return "un opérande est négatif"
	case "division-by-zero":
		return "division par zéro impossible"
	default:
		// (value) => DString.to(value) : le checker sait que value est un number.
		return strconv.FormatFloat(result.GetValue().(float64), 'f', -1, 64)
	}
}

func main() {
	fmt.Println(message(1, 2, 1))
	fmt.Println(message(-1, 2, 1))
	fmt.Println(message(1, 2, 0))
}
