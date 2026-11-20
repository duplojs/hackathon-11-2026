package aprime_test

import (
	"testing"

	"research/either/a"
	"research/either/aprime"
	"research/either/golden"
)

var sinkLength int

// Même résultat que le package a, avec la représentation uniforme.
func TestUniformMatchesA(t *testing.T) {
	uniform := aprime.MapCalculate2(golden.Failing)
	reference := a.MapCalculate(golden.Failing)
	for index := range reference {
		u, r := uniform[index], reference[index]
		value := u.Right
		if !u.IsRight() {
			value = u.Left
		}
		if u.Kind != r.Kind || u.Information != r.Information || value != r.Value {
			t.Fatalf("index %d : %+v contre %+v", index, u, r)
		}
	}
}

func BenchmarkUniformMap1000(b *testing.B) {
	for iteration := 0; iteration < b.N; iteration++ {
		sinkLength += len(aprime.MapCalculate2(golden.Inputs1000))
	}
}
