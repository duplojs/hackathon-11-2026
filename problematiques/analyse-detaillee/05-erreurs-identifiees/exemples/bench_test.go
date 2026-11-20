package main

import "testing"

var sinkMessage string

// Mélange de réussites et des deux échecs.
var benchCases = [][2]float64{{6, 3}, {-4, 2}, {6, 0}, {9, 3}}

func BenchmarkMatchInformationUnion(b *testing.B) {
	for b.Loop() {
		for _, inputs := range benchCases {
			sinkMessage = describe(inputs[0], inputs[1])
		}
	}
}

func BenchmarkGoErrorIdiom(b *testing.B) {
	for b.Loop() {
		for _, inputs := range benchCases {
			sinkMessage = describeWithError(inputs[0], inputs[1])
		}
	}
}
