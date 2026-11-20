// Package c : représentation C, struct non générique avec Value any.
// Couvre toutes les unions, mais chaque valeur non pointeur est boxée
// et chaque lecture demande une assertion de type.
package c

import "research/either/inspect"

type Kind uint8

const (
	KindRight Kind = iota
	KindLeft
	KindSuccess
	KindFail
)

type Either struct {
	Kind        Kind
	Information string
	Value       any
}

func Success(value any) Either {
	return Either{Kind: KindSuccess, Information: "success", Value: value}
}

func Left(information string, value any) Either {
	return Either{Kind: KindLeft, Information: information, Value: value}
}

func Fail() Either {
	return Either{Kind: KindFail, Information: "fail"}
}

func (e Either) IsRight() bool {
	return e.Kind == KindRight || e.Kind == KindSuccess
}

func formatValue(value any) string {
	switch v := value.(type) {
	case nil:
		return "undefined"
	case float64:
		return inspect.Number(v)
	case []float64:
		return inspect.Numbers(v)
	}
	panic("c.formatValue: type non prévu")
}

func Inspect(e Either) string {
	switch e.Kind {
	case KindSuccess:
		return inspect.Either("right", e.Information, formatValue(e.Value), "success")
	case KindFail:
		return inspect.Either("left", e.Information, "undefined", "fail")
	case KindRight:
		return inspect.Either("right", e.Information, formatValue(e.Value), "")
	default:
		return inspect.Either("left", e.Information, formatValue(e.Value), "")
	}
}
