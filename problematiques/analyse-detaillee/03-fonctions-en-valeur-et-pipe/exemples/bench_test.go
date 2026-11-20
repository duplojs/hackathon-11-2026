package main

import "testing"

var sinkNumbers []float64

func double(value float64) float64    { return value * 2 }
func increment(value float64) float64 { return value + 1 }

func doubleSlice(values []float64) []float64 {
	return ArrayMap(values, double)
}

func incrementSlice(values []float64) []float64 {
	return ArrayMap(values, increment)
}

var benchInput = []float64{1, 2, 3, 4, 5, 6, 7, 8}

// Stratégie retenue : pipe résolu à la compilation, appels directs typés.
func BenchmarkPipeStatic(b *testing.B) {
	for b.Loop() {
		sinkNumbers = incrementSlice(doubleSlice(benchInput))
	}
}

// Piste écartée : pipe dynamique, étapes en `any`, appel par réflexion.
func BenchmarkPipeReflect(b *testing.B) {
	for b.Loop() {
		sinkNumbers = reflectPipe(benchInput, doubleSlice, incrementSlice).([]float64)
	}
}
