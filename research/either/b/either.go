// Package b : représentation B, une interface et une struct par variante.
// Fidèle aux unions TS (n'importe quelle combinaison de types de valeur),
// mais chaque valeur stockée dans l'interface est boxée.
package b

import "research/either/inspect"

type Either interface {
	information() string
}

type Right[V any] struct {
	Information string
	Value       V
	Success     bool
}

type Left[V any] struct {
	Information string
	Value       V
	Fail        bool
}

func (r Right[V]) information() string { return r.Information }
func (l Left[V]) information() string  { return l.Information }

func Success[V any](value V) Either {
	return Right[V]{Information: "success", Value: value, Success: true}
}

func NewLeft[V any](information string, value V) Either {
	return Left[V]{Information: information, Value: value}
}

// Fail n'a pas de valeur : on choisit struct{} pour V.
func Fail() Either {
	return Left[struct{}]{Information: "fail", Fail: true}
}

func IsRight(e Either) bool {
	switch e.(type) {
	case Right[float64], Right[[]float64]:
		return true
	}
	return false
}

// Inspect doit connaître à l'avance les types concrets possibles :
// le type switch est l'équivalent Go de la liste des membres de l'union.
func Inspect(e Either) string {
	switch v := e.(type) {
	case Right[float64]:
		return inspect.Either("right", v.Information, inspect.Number(v.Value), terminal(v.Success, "success"))
	case Right[[]float64]:
		return inspect.Either("right", v.Information, inspect.Numbers(v.Value), terminal(v.Success, "success"))
	case Left[float64]:
		return inspect.Either("left", v.Information, inspect.Number(v.Value), terminal(v.Fail, "fail"))
	case Left[struct{}]:
		return inspect.Either("left", v.Information, "undefined", terminal(v.Fail, "fail"))
	}
	panic("b.Inspect: type non prévu")
}

func terminal(set bool, name string) string {
	if set {
		return name
	}
	return ""
}
