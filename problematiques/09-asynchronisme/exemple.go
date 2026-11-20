package main

import "fmt"

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

// async function → fonction Go ordinaire ; Promise<Either> → Either.
func calculate(label string, value float64) Either {
	fmt.Println("calcul " + label)

	if value == 0 {
		return EitherLeftOf("zero", value)
	}

	return EitherSuccessOf(value)
}

func main() {
	calculations := []func() Either{
		func() Either { return calculate("1", 1) },
		func() Either { return calculate("2", 0) },
		func() Either { return calculate("3", 3) },
	}

	// asyncGroup : un appel après l'autre, arrêt au premier échec.
	// Avec des goroutines, "calcul 3" serait lancé quand même.
	values := make([]float64, len(calculations))
	var result Either
	allRight := true
	for index, calculation := range calculations {
		current := calculation() // await
		if !current.IsRight() {
			result = current
			allRight = false
			break
		}
		values[index] = current.GetValue().(float64)
	}
	if allRight {
		result = EitherSuccessOf(values)
	}

	fmt.Println(result.IsRight())
}
