package main

import "testing"

var (
	sinkTuples [][3]float64
	sinkSlices [][]float64
	sinkTotal  float64
)

const tupleCount = 1000

// Stratégie retenue : tuple -> tableau Go `[3]float64`, stocké par valeur.
func BenchmarkTuplesAsArrays(b *testing.B) {
	for b.Loop() {
		tuples := make([][3]float64, tupleCount)
		for index := range tuples {
			tuples[index] = [3]float64{float64(index), 2, 1}
		}
		total := 0.0
		for _, tuple := range tuples {
			total += (tuple[0] + tuple[1]) / tuple[2]
		}
		sinkTuples, sinkTotal = tuples, total
	}
}

// Piste écartée : tuple -> slice `[]float64` (perd la longueur, une allocation par tuple).
func BenchmarkTuplesAsSlices(b *testing.B) {
	for b.Loop() {
		tuples := make([][]float64, tupleCount)
		for index := range tuples {
			tuples[index] = []float64{float64(index), 2, 1}
		}
		total := 0.0
		for _, tuple := range tuples {
			total += (tuple[0] + tuple[1]) / tuple[2]
		}
		sinkSlices, sinkTotal = tuples, total
	}
}

// map : allocation unique à la bonne longueur contre croissance par append.
func mapWithAppend[T any, U any](array []T, transform func(T) U) []U {
	var output []U
	for _, element := range array {
		output = append(output, transform(element))
	}
	return output
}

var mapInput = make([]float64, tupleCount)

func BenchmarkMapPreallocated(b *testing.B) {
	for b.Loop() {
		sinkSlices = [][]float64{ArrayMap(mapInput, func(value float64) float64 { return value * 2 })}
	}
}

func BenchmarkMapAppend(b *testing.B) {
	for b.Loop() {
		sinkSlices = [][]float64{mapWithAppend(mapInput, func(value float64) float64 { return value * 2 })}
	}
}
