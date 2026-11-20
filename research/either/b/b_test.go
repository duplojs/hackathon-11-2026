package b_test

import (
	"testing"

	"research/either/b"
	"research/either/golden"
)

func TestBehaviourMatchesTypeScript(t *testing.T) {
	golden.Compare(t, []string{
		b.Inspect(b.Add04(-1, 2)),
		b.Inspect(b.Add04(1, 2)),
		b.Inspect(b.Add(1, 2)),
		b.Inspect(b.Add(-1, 2)),
		b.Inspect(b.Add(1, -2)),
		b.Inspect(b.Calculate(1, 2, 1)),
		b.Inspect(b.Calculate(2, 3, 0)),
		b.Inspect(b.Calculate(-1, 2, 1)),
		b.Inspect(b.Calculate(1, 2, 4)),
		b.Message(b.Calculate(1, 2, 1)),
		b.Message(b.Calculate(2, 3, 0)),
		b.Message(b.Calculate(-1, 2, 1)),
		b.Inspect(b.Group(b.MapCalculate(golden.Failing))),
		b.Inspect(b.Group(b.MapCalculate(golden.Passing))),
	})
}

var sinkNumber float64
var sinkAny b.Either
var sinkLength int

func BenchmarkAddMatch(bench *testing.B) {
	total := 0.0
	for iteration := 0; iteration < bench.N; iteration++ {
		total += b.Code(b.Add(golden.Operand(iteration), 2))
	}
	sinkNumber = total
}

func BenchmarkAddMatchNoInline(bench *testing.B) {
	total := 0.0
	for iteration := 0; iteration < bench.N; iteration++ {
		total += b.Code(b.AddNoInline(golden.Operand(iteration), 2))
	}
	sinkNumber = total
}

func BenchmarkMap1000(bench *testing.B) {
	for iteration := 0; iteration < bench.N; iteration++ {
		sinkLength += len(b.MapCalculate(golden.Inputs1000))
	}
}

func BenchmarkMapGroup1000(bench *testing.B) {
	for iteration := 0; iteration < bench.N; iteration++ {
		sinkAny = b.Group(b.MapCalculate(golden.Inputs1000))
	}
}
