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

type EitherFail struct{}

func (v EitherFail) IsRight() bool          { return false }
func (v EitherFail) GetInformation() string { return "fail" }
func (v EitherFail) GetValue() any          { return nil }

func EitherSuccessOf[T any](value T) EitherSuccess[T] {
	return EitherSuccess[T]{Information: "success", Value: value}
}

func EitherLeftOf[T any](information string, value T) EitherLeft[T] {
	return EitherLeft[T]{Information: information, Value: value}
}

// 5 variantes, 4 types de valeur, et pourtant un seul type de retour : Either.
// Ajouter une sixième variante ne crée aucun nouveau type Go.
func checkUserName(size float64, code float64) Either {
	if size < 3 {
		return EitherLeftOf("too-short", size) // float64
	}
	if code == 1 {
		return EitherLeftOf("forbidden-char", "@") // string
	}
	if code == 2 {
		return EitherFail{} // undefined
	}
	if code == 3 {
		return EitherLeftOf("reserved", code > 2) // bool
	}

	return EitherSuccessOf("valid-username") // string
}

// Le type de chaque valeur est connu grâce au checker TypeScript :
// l'assertion .(float64) ou .(string) ne peut pas échouer.
func describe(size float64, code float64) string {
	result := checkUserName(size, code)

	switch result.GetInformation() {
	case "too-short":
		return strconv.FormatFloat(result.GetValue().(float64), 'f', -1, 64)
	case "forbidden-char":
		return result.GetValue().(string)
	case "fail":
		return "fail"
	case "reserved":
		return "reserved"
	default:
		return result.GetValue().(string)
	}
}

func main() {
	fmt.Println(describe(1, 0))
	fmt.Println(describe(5, 1))
	fmt.Println(describe(5, 2))
	fmt.Println(describe(5, 3))
	fmt.Println(describe(5, 0))
}
