// Package aprime : variante A', unions dont les variantes portent des types
// de valeur DIFFÉRENTS. Elle montre précisément où A cesse de suffire.
//
// Cas réel : exercice 09. DEither.group renvoie le premier left tel quel
// (vérifié en exécution, reference/expected.txt), son type TS est donc
//
//	Left<"negative-operand", number> | Left<"division-by-zero", number> | Success<number[]>
//
// Côté gauche la valeur est un float64, côté droit un []float64 :
// Either[V] (un seul V) ne peut pas l'exprimer.
package aprime

import (
	"research/either/a"
	"research/either/inspect"
)

// Either2 garde la représentation par valeur avec un type par côté.
// Ça suffit tant que toutes les variantes d'un même côté partagent un type.
type Either2[L any, R any] struct {
	Kind        a.Kind
	Information string
	Left        L
	Right       R
}

func (e Either2[L, R]) IsRight() bool {
	return e.Kind == a.KindRight || e.Kind == a.KindSuccess
}

// FromLeft est la coercition Either[L] (gauche) vers Either2[L, R].
func FromLeft[L any, R any](e a.Either[L]) Either2[L, R] {
	return Either2[L, R]{Kind: e.Kind, Information: e.Information, Left: e.Value}
}

func Success2[L any, R any](value R) Either2[L, R] {
	return Either2[L, R]{Kind: a.KindSuccess, Information: "success", Right: value}
}

// Group : DEither.group(items), tout ou rien, premier left renvoyé tel quel.
func Group(items []a.Either[float64]) Either2[float64, []float64] {
	values := make([]float64, len(items))
	for index, item := range items {
		if !item.IsRight() {
			return FromLeft[float64, []float64](item)
		}
		values[index] = item.Value
	}
	return Success2[float64](values)
}

func Inspect(e Either2[float64, []float64]) string {
	switch e.Kind {
	case a.KindSuccess:
		return inspect.Either("right", e.Information, inspect.Numbers(e.Right), "success")
	case a.KindRight:
		return inspect.Either("right", e.Information, inspect.Numbers(e.Right), "")
	case a.KindFail:
		return inspect.Either("left", e.Information, "undefined", "fail")
	default:
		return inspect.Either("left", e.Information, inspect.Number(e.Left), "")
	}
}

// LimitUnion illustre la limite suivante : deux gauches de types différents
// (Left<"parse-error", string> | Left<"negative-operand", number> | Success<number[]>).
// Il faut alors une « union fermée générée » avec un champ par type distinct
// (ADR-2). Elle reste sans boxing mais grossit à chaque type ajouté (voir sizes_test.go).
type LimitUnion struct {
	Kind        a.Kind
	Information string
	LeftString  string
	LeftNumber  float64
	Right       []float64
}
