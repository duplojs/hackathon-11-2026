package main

import "testing"

// Les résultats sont stockés dans des variables globales pour que le
// compilateur ne supprime pas le calcul ni ne garde la valeur sur la pile
// grâce à l'analyse d'échappement.
var (
	sinkUnion     []AddResult
	sinkInterface []EitherInterface
	sinkValue     float64
)

const batchSize = 1024

// Produire et conserver des résultats : c'est ce que fait DArray.map sur une
// collection de calculs (problématique 07).
func BenchmarkProduceUnionStruct(b *testing.B) {
	results := make([]AddResult, batchSize)
	for b.Loop() {
		for index := range results {
			results[index] = add(float64(index), 2)
		}
	}
	sinkUnion = results
}

func BenchmarkProduceInterface(b *testing.B) {
	results := make([]EitherInterface, batchSize)
	for b.Loop() {
		for index := range results {
			results[index] = addWithInterface(float64(index), 2)
		}
	}
	sinkInterface = results
}

// Lire le membre actif : test d'étiquette contre switch de type.
func BenchmarkReadUnionStruct(b *testing.B) {
	results := make([]AddResult, batchSize)
	for index := range results {
		results[index] = add(float64(index), 2)
	}
	b.ResetTimer()
	for b.Loop() {
		total := 0.0
		for _, result := range results {
			if result.Tag == addResultIsSuccess {
				total += result.V1.Value
			}
		}
		sinkValue = total
	}
}

func BenchmarkReadInterface(b *testing.B) {
	results := make([]EitherInterface, batchSize)
	for index := range results {
		results[index] = addWithInterface(float64(index), 2)
	}
	b.ResetTimer()
	for b.Loop() {
		total := 0.0
		for _, result := range results {
			total += readWithInterface(result)
		}
		sinkValue = total
	}
}
