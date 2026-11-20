package main

import "fmt"

type EitherFail struct{}

type EitherLeft[T any] struct {
	Information string
	Value       T
}

type EitherSuccess[T any] struct {
	Value T
}

type TransactionSuccess struct {
	ID      string
	Balance float64
}

// Union canonique à 3 membres allouée sur la pile (Stack)
type Union3[T0 any, T1 any, T2 any] struct {
	Tag uint8
	V0  T0
	V1  T1
	V2  T2
}

// Type de retour global unifié statiquement par le transpileur V2
type ProcessResult = Union3[
	EitherFail,
	EitherLeft[float64],
	EitherSuccess[TransactionSuccess],
]

func ProcessTransaction(amount float64, userActive bool) ProcessResult {
	if amount <= 0 {
		// Chemin 1 : placeValue a injecté le tag canonique 0 (EitherFail)
		return ProcessResult{
			Tag: 0,
			V0:  EitherFail{},
		}
	}

	if !userActive {
		// Chemin 2 : placeValue a injecté le tag canonique 1 (EitherLeft[float64])
		return ProcessResult{
			Tag: 1,
			V1: EitherLeft[float64]{
				Information: "inactive-account",
				Value:       amount,
			},
		}
	}

	// Chemin 3 : placeValue a injecté le tag canonique 2 (EitherSuccess[TransactionSuccess])
	return ProcessResult{
		Tag: 2,
		V2: EitherSuccess[TransactionSuccess]{
			Value: TransactionSuccess{
				ID:      "tx-1234",
				Balance: amount - 5,
			},
		},
	}
}

func main() {
	res := ProcessTransaction(100, true)
	if res.Tag == 2 {
		fmt.Printf("Transaction validée : %s (Solde : %.2f)\n", res.V2.Value.ID, res.V2.Value.Balance)
	}
}
