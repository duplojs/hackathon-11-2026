package c_test

import (
	"testing"

	"research/either/c"
	"research/either/golden"
)

func TestBehaviourMatchesTypeScript(t *testing.T) {
	golden.Compare(t, []string{
		c.Inspect(c.Add04(-1, 2)),
		c.Inspect(c.Add04(1, 2)),
		c.Inspect(c.Add(1, 2)),
		c.Inspect(c.Add(-1, 2)),
		c.Inspect(c.Add(1, -2)),
		c.Inspect(c.Calculate(1, 2, 1)),
		c.Inspect(c.Calculate(2, 3, 0)),
		c.Inspect(c.Calculate(-1, 2, 1)),
		c.Inspect(c.Calculate(1, 2, 4)),
		c.Message(c.Calculate(1, 2, 1)),
		c.Message(c.Calculate(2, 3, 0)),
		c.Message(c.Calculate(-1, 2, 1)),
		c.Inspect(c.Group(c.MapCalculate(golden.Failing))),
		c.Inspect(c.Group(c.MapCalculate(golden.Passing))),
	})
}

var sinkNumber float64
var sinkEither c.Either
var sinkLength int

func BenchmarkAddMatch(bench *testing.B) {
	total := 0.0
	for iteration := 0; iteration < bench.N; iteration++ {
		total += c.Code(c.Add(golden.Operand(iteration), 2))
	}
	sinkNumber = total
}

func BenchmarkAddMatchNoInline(bench *testing.B) {
	total := 0.0
	for iteration := 0; iteration < bench.N; iteration++ {
		total += c.Code(c.AddNoInline(golden.Operand(iteration), 2))
	}
	sinkNumber = total
}

func BenchmarkMap1000(bench *testing.B) {
	for iteration := 0; iteration < bench.N; iteration++ {
		sinkLength += len(c.MapCalculate(golden.Inputs1000))
	}
}

func BenchmarkMapGroup1000(bench *testing.B) {
	for iteration := 0; iteration < bench.N; iteration++ {
		sinkEither = c.Group(c.MapCalculate(golden.Inputs1000))
	}
}
