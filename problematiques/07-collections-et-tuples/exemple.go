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

// [number, number, number] : la taille et le type de chaque case sont conservés.
type Tuple3[T0 any, T1 any, T2 any] struct {
	V0 T0
	V1 T1
	V2 T2
}

func divide(value float64, divisor float64) Either {
	if divisor == 0 {
		return EitherLeftOf("division-by-zero", divisor)
	}

	return EitherSuccessOf(value / divisor)
}

func main() {
	inputs := []Tuple3[float64, float64, float64]{
		{1, 2, 1},
		{4, 5, 3},
		{2, 3, 0},
	}

	// DArray.map : slice alloué une seule fois.
	// La déstructuration ([one, two, divisor]) devient des variables par position.
	calculations := make([]Either, len(inputs))
	for index, input := range inputs {
		one, two, divisor := input.V0, input.V1, input.V2
		calculations[index] = divide(one+two, divisor)
	}

	// DEither.group : arrêt au premier échec.
	values := make([]float64, len(calculations))
	var transaction Either
	allRight := true
	for index, calculation := range calculations {
		if !calculation.IsRight() {
			transaction = calculation
			allRight = false
			break
		}
		values[index] = calculation.GetValue().(float64)
	}
	if allRight {
		transaction = EitherSuccessOf(values)
	}

	states := make([]string, len(calculations))
	for index, calculation := range calculations {
		states[index] = strconv.FormatBool(calculation.IsRight())
	}

	fmt.Println(strings.Join(states, ","))
	fmt.Println(transaction.IsRight())
}
