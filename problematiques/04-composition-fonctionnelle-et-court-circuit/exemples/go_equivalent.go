package main

import (
	"fmt"
	"strconv"
)

type EitherFail struct{}

type EitherLeft[T any] struct {
	Information string
	Value       T
}

type EitherSuccess[T any] struct {
	Value T
}

// Union canonique couvrant toutes les issues possibles du pipeline
type PipelineResult = struct {
	Tag uint8
	V0  EitherFail
	V1  EitherLeft[string]
	V2  EitherSuccess[string]
}

func main() {
	rawInput := "42"

	// Équivalent Go V2 de rightPipe :
	// IIFE auto-invoquée avec déroulement statique et court-circuit anticipé (zéro runtime)
	result := func() PipelineResult {
		// Étape 1 : parseNumber
		val, err := strconv.ParseFloat(rawInput, 64)
		if err != nil {
			return PipelineResult{
				Tag: 1,
				V1:  EitherLeft[string]{Information: "not-a-number", Value: rawInput},
			}
		}

		// Étape 2 : divideByTwo
		if val == 0 {
			return PipelineResult{
				Tag: 0,
				V0:  EitherFail{},
			}
		}
		divided := val / 2

		// Étape 3 : formatResult (Succès nominal)
		return PipelineResult{
			Tag: 2,
			V2:  EitherSuccess[string]{Value: fmt.Sprintf("Résultat : %.1f", divided)},
		}
	}()

	if result.Tag == 2 {
		fmt.Println(result.V2.Value) // Affiche : Résultat : 21.0
	}
}
