// Package a : représentation A, struct générique par valeur.
// Success<T>, Fail, Left<I, T> et leurs unions partagent le même type Go
// Either[V] tant que toutes les variantes portent une valeur du même type V.
package a

import "research/either/inspect"

// Kind encode à la fois le côté (droite/gauche) et la variante terminale
// (success/fail), nécessaire pour reproduire exactement DCommon.print.
type Kind uint8

const (
	KindRight Kind = iota
	KindLeft
	KindSuccess
	KindFail
)

type Either[V any] struct {
	Kind        Kind
	Information string
	Value       V
}

func Success[V any](value V) Either[V] {
	return Either[V]{Kind: KindSuccess, Information: "success", Value: value}
}

func Left[V any](information string, value V) Either[V] {
	return Either[V]{Kind: KindLeft, Information: information, Value: value}
}

// Fail n'a pas de valeur (undefined en JS) : V reste à sa valeur zéro.
func Fail[V any]() Either[V] {
	return Either[V]{Kind: KindFail, Information: "fail"}
}

func (e Either[V]) IsRight() bool {
	return e.Kind == KindRight || e.Kind == KindSuccess
}

// Inspect reproduit DCommon.print. format convertit la valeur portée.
func Inspect[V any](e Either[V], format func(V) string) string {
	switch e.Kind {
	case KindSuccess:
		return inspect.Either("right", e.Information, format(e.Value), "success")
	case KindFail:
		return inspect.Either("left", e.Information, "undefined", "fail")
	case KindRight:
		return inspect.Either("right", e.Information, format(e.Value), "")
	default:
		return inspect.Either("left", e.Information, format(e.Value), "")
	}
}
