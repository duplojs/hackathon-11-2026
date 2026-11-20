package main

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"
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

type EitherRight[T any] struct {
	Information string
	Value       T
}

func (v EitherRight[T]) IsRight() bool          { return true }
func (v EitherRight[T]) GetInformation() string { return v.Information }
func (v EitherRight[T]) GetValue() any          { return v.Value }

type EitherError[T any] struct {
	Value T
}

func (v EitherError[T]) IsRight() bool          { return false }
func (v EitherError[T]) GetInformation() string { return "error" }
func (v EitherError[T]) GetValue() any          { return v.Value }

type JSUndefined struct{}

var digits = regexp.MustCompile("[0-9]")

func checkUserName(username string) Either {
	if digits.MatchString(username) {
		return EitherLeftOf("must-be-not-contain-number", JSUndefined{})
	}
	if strings.Contains(username, "@") {
		return EitherError[any]{Value: nil}
	}

	return EitherRight[string]{Information: "valid-username", Value: username}
}

func usernameLength(username string) Either {
	// unwrapRight : la variable reste un Either.
	// Go n'a pas de type "string | Left | Error".
	checked := checkUserName(username)

	// isLeft(checked) devient !checked.IsRight()
	if !checked.IsRight() {
		return checked
	}

	// TypeScript a rétréci checked en string : c'est ici, et seulement ici,
	// que la valeur est lue et convertie.
	value := checked.GetValue().(string)

	return EitherSuccessOf(float64(utf8.RuneCountInString(value)))
}

func main() {
	for _, username := range []string{"test", "abc1", "a@b"} {
		result := usernameLength(username)

		switch result.GetInformation() {
		case "success":
			fmt.Println(strconv.FormatFloat(result.GetValue().(float64), 'f', -1, 64))
		case "must-be-not-contain-number":
			fmt.Println("contient un chiffre")
		case "error":
			fmt.Println("contient un @")
		}
	}
}
