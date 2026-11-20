// Package async compare deux traductions de l'exercice 10 (ADR-5) :
//
//   - A : exécution synchrone séquentielle (ce que produit le transpileur) ;
//   - B : chaque appel asynchrone est un « future » (goroutine + channel), attendu
//     dans l'ordre, la fabrique suivante ne démarrant qu'après la précédente
//     (fidèle à la sémantique Q1 : asyncGroup est séquentiel) ;
//   - BParallel : toutes les fabriques démarrent d'emblée (ce que ferait un
//     Promise.all) ; la sémantique DuploJS l'INTERDIT, elle n'est là que pour
//     montrer la différence observable (fabriques appelées après un échec).
//
// Les types reprennent la représentation du transpileur (ADR-1, ADR-12) :
// Either[float64] par valeur, Either2[float64, []float64] pour le résultat de group.
package async

import (
	"strconv"
	"sync/atomic"
)

type Kind uint8

const (
	KindSuccess Kind = iota
	KindLeft
)

type Either struct {
	Kind        Kind
	Information string
	Value       float64
}

type Either2 struct {
	Kind        Kind
	Information string
	Left        float64
	Right       []float64
}

func add(one, two float64) Either {
	if one < 0 || two < 0 {
		value := two
		if one < 0 {
			value = one
		}
		return Either{Kind: KindLeft, Information: "negative-operand", Value: value}
	}
	return Either{Kind: KindSuccess, Information: "success", Value: one + two}
}

func divide(value, divisor float64) Either {
	if divisor == 0 {
		return Either{Kind: KindLeft, Information: "division-by-zero", Value: divisor}
	}
	return Either{Kind: KindSuccess, Information: "success", Value: value / divisor}
}

// calculate : rightAsyncPipe(add, divide, ×2), arrêt au premier gauche.
func calculate(one, two, divisor float64) Either {
	a := add(one, two)
	if a.Kind == KindLeft {
		return a
	}
	b := divide(a.Value, divisor)
	if b.Kind == KindLeft {
		return b
	}
	return Either{Kind: KindSuccess, Information: "success", Value: b.Value * 2}
}

type Input [3]float64

// Calls compte les fabriques réellement appelées (effet observable).
// Spawned compte les goroutines lancées.
type Counters struct {
	Calls   atomic.Int64
	Spawned atomic.Int64
}

func display(transaction Either2) []string {
	if transaction.Kind != KindSuccess {
		return []string{"transaction annulée"}
	}
	out := make([]string, len(transaction.Right))
	for i, v := range transaction.Right {
		out[i] = strconv.FormatFloat(v, 'f', -1, 64)
	}
	return out
}

// RunA : traduction de l'option A (synchrone séquentielle).
func RunA(inputs []Input, counters *Counters) []string {
	out := make([]float64, 0, len(inputs))
	for _, input := range inputs {
		counters.Calls.Add(1)
		e := calculate(input[0], input[1], input[2])
		if e.Kind == KindLeft {
			return display(Either2{Kind: e.Kind, Information: e.Information, Left: e.Value})
		}
		out = append(out, e.Value)
	}
	return display(Either2{Kind: KindSuccess, Information: "success", Right: out})
}

func future(input Input, counters *Counters) <-chan Either {
	counters.Calls.Add(1)
	counters.Spawned.Add(1)
	channel := make(chan Either, 1)
	go func() {
		channel <- calculate(input[0], input[1], input[2])
	}()
	return channel
}

// RunB : option B séquentielle (fidèle à Q1) : un future par calcul, attendu
// avant de démarrer le suivant.
func RunB(inputs []Input, counters *Counters) []string {
	out := make([]float64, 0, len(inputs))
	for _, input := range inputs {
		e := <-future(input, counters)
		if e.Kind == KindLeft {
			return display(Either2{Kind: e.Kind, Information: e.Information, Left: e.Value})
		}
		out = append(out, e.Value)
	}
	return display(Either2{Kind: KindSuccess, Information: "success", Right: out})
}

// RunBParallel : toutes les fabriques démarrent d'emblée (INTERDIT par Q1).
func RunBParallel(inputs []Input, counters *Counters) []string {
	futures := make([]<-chan Either, len(inputs))
	for i, input := range inputs {
		futures[i] = future(input, counters)
	}
	out := make([]float64, 0, len(inputs))
	for _, f := range futures {
		e := <-f
		if e.Kind == KindLeft {
			return display(Either2{Kind: e.Kind, Information: e.Information, Left: e.Value})
		}
		out = append(out, e.Value)
	}
	return display(Either2{Kind: KindSuccess, Information: "success", Right: out})
}
