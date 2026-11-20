// Problématique 02 : proposition de l'encadrant, renvoyer any aux frontières de fonction.
// Benchmark : go test -bench . -benchmem ./02-unions-etiquetees/benchmark-any
//
// Quatre représentations Go d'un même résultat TypeScript :
//
//	Left<"negative-operand", number> | Success<number>
//
// Les structs reprennent la forme des Either générés par le transpileur.
package benchmarkany

type JSNull struct{}

type EitherLeft[T any] struct {
	Left        JSNull
	Information string
	Value       T
}

type EitherSuccess[T any] struct {
	Right       JSNull
	Success     JSNull
	Information string
	Value       T
}

// ---------------------------------------------------------------------------
// A. Union étiquetée (choix actuel du transpileur)
// ---------------------------------------------------------------------------

type Union2[T0 any, T1 any] struct {
	Tag uint8
	V0  T0
	V1  T1
}

type Result = Union2[EitherLeft[float64], EitherSuccess[float64]]

//go:noinline
func addUnion(one float64, two float64) Result {
	if one < 0 || two < 0 {
		value := two
		if one < 0 {
			value = one
		}
		return Result{Tag: 0, V0: EitherLeft[float64]{Information: "negative-operand", Value: value}}
	}
	return Result{Tag: 1, V1: EitherSuccess[float64]{Information: "success", Value: one + two}}
}

// ---------------------------------------------------------------------------
// B. Interface Go avec méthodes (première version du dépôt)
// ---------------------------------------------------------------------------

type eitherRight interface {
	eitherRightValue() float64
}

func (value EitherSuccess[T]) eitherRightValue() float64 {
	return any(value.Value).(float64)
}

type ResultInterface interface {
	isEither()
}

func (EitherLeft[T]) isEither()    {}
func (EitherSuccess[T]) isEither() {}

//go:noinline
func addInterface(one float64, two float64) ResultInterface {
	if one < 0 || two < 0 {
		value := two
		if one < 0 {
			value = one
		}
		return EitherLeft[float64]{Information: "negative-operand", Value: value}
	}
	return EitherSuccess[float64]{Information: "success", Value: one + two}
}

// ---------------------------------------------------------------------------
// C. any aux retours, assertion de type à l'utilisation (proposition de l'encadrant)
// ---------------------------------------------------------------------------

//go:noinline
func addAny(one float64, two float64) any {
	if one < 0 || two < 0 {
		value := two
		if one < 0 {
			value = one
		}
		return EitherLeft[float64]{Information: "negative-operand", Value: value}
	}
	return EitherSuccess[float64]{Information: "success", Value: one + two}
}

// ---------------------------------------------------------------------------
// D. any aux retours, mais avec des pointeurs vers les structs
// ---------------------------------------------------------------------------

//go:noinline
func addAnyPointer(one float64, two float64) any {
	if one < 0 || two < 0 {
		value := two
		if one < 0 {
			value = one
		}
		return &EitherLeft[float64]{Information: "negative-operand", Value: value}
	}
	return &EitherSuccess[float64]{Information: "success", Value: one + two}
}

// ---------------------------------------------------------------------------
// Variantes sans //go:noinline : le compilateur peut les mettre en ligne.
// Elles montrent ce qui se passe quand la fonction est assez petite pour cela.
// ---------------------------------------------------------------------------

func addUnionInline(one float64, two float64) Result {
	if one < 0 || two < 0 {
		return Result{Tag: 0, V0: EitherLeft[float64]{Information: "negative-operand", Value: one}}
	}
	return Result{Tag: 1, V1: EitherSuccess[float64]{Information: "success", Value: one + two}}
}

func addAnyInline(one float64, two float64) any {
	if one < 0 || two < 0 {
		return EitherLeft[float64]{Information: "negative-operand", Value: one}
	}
	return EitherSuccess[float64]{Information: "success", Value: one + two}
}
