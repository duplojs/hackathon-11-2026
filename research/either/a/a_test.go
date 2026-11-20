package a_test

import (
	"testing"

	"research/either/a"
	"research/either/aprime"
	"research/either/golden"
	"research/either/inspect"
)

func show(e a.Either[float64]) string {
	return a.Inspect(e, inspect.Number)
}

// Le scénario group (exercice 09) passe par aprime : A seul ne peut pas
// représenter Left<_, number> | Success<number[]>.
func TestBehaviourMatchesTypeScript(t *testing.T) {
	golden.Compare(t, []string{
		show(a.Add04(-1, 2)),
		show(a.Add04(1, 2)),
		show(a.Add(1, 2)),
		show(a.Add(-1, 2)),
		show(a.Add(1, -2)),
		show(a.Calculate(1, 2, 1)),
		show(a.Calculate(2, 3, 0)),
		show(a.Calculate(-1, 2, 1)),
		show(a.Calculate(1, 2, 4)),
		a.Message(a.Calculate(1, 2, 1)),
		a.Message(a.Calculate(2, 3, 0)),
		a.Message(a.Calculate(-1, 2, 1)),
		aprime.Inspect(aprime.Group(a.MapCalculate(golden.Failing))),
		aprime.Inspect(aprime.Group(a.MapCalculate(golden.Passing))),
	})
}

var sinkNumber float64
var sinkLength int

func BenchmarkAddMatch(b *testing.B) {
	total := 0.0
	for iteration := 0; iteration < b.N; iteration++ {
		total += a.Code(a.Add(golden.Operand(iteration), 2))
	}
	sinkNumber = total
}

func BenchmarkAddMatchNoInline(b *testing.B) {
	total := 0.0
	for iteration := 0; iteration < b.N; iteration++ {
		total += a.Code(a.AddNoInline(golden.Operand(iteration), 2))
	}
	sinkNumber = total
}

func BenchmarkMap1000(b *testing.B) {
	for iteration := 0; iteration < b.N; iteration++ {
		sinkLength += len(a.MapCalculate(golden.Inputs1000))
	}
}

func BenchmarkMapGroup1000(b *testing.B) {
	for iteration := 0; iteration < b.N; iteration++ {
		sinkLength += len(aprime.Group(a.MapCalculate(golden.Inputs1000)).Right)
	}
}
