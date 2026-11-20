package main

import (
	"errors"
	"fmt"
)

// Piste ÉCARTÉE : l'idiome Go `(T, error)`.
// Naturel pour un développeur Go, mais :
//   - l'information typée devient du texte, ou une variable sentinelle ;
//   - la valeur de contexte (l'opérande) doit être enveloppée dans un type
//     d'erreur dédié puis retrouvée avec errors.As ;
//   - un échec n'est plus une VALEUR comme une autre : on ne peut pas le
//     ranger tel quel dans un tableau de résultats (DArray.map, DEither.group) ;
//   - `error` est une interface : chaque échec est alloué sur le tas.

var errDivisionByZero = errors.New("division-by-zero")

type negativeOperandError struct {
	Value float64
}

func (failure *negativeOperandError) Error() string {
	return fmt.Sprintf("negative-operand: %v", failure.Value)
}

func divideWithError(value float64, divisor float64) (float64, error) {
	if value < 0 {
		return 0, &negativeOperandError{Value: value}
	}
	if divisor == 0 {
		return 0, errDivisionByZero
	}
	return value / divisor, nil
}

func describeWithError(value float64, divisor float64) string {
	quotient, failure := divideWithError(value, divisor)
	var negative *negativeOperandError
	switch {
	case errors.As(failure, &negative):
		return "opérande négatif : " + numberToString(negative.Value)
	case errors.Is(failure, errDivisionByZero):
		return "division par zéro impossible"
	default:
		return "résultat : " + numberToString(quotient)
	}
}
