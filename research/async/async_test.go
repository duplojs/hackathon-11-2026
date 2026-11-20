package async

import (
	"reflect"
	"testing"
)

// Entrées de projects/10 : le 3e calcul divise par zéro.
var exercise = []Input{{1, 2, 1}, {4, 5, 3}, {2, 3, 0}}

// Échec au 1er calcul : les fabriques suivantes ne doivent pas être appelées.
var failFirst = []Input{{-1, 2, 1}, {4, 5, 3}, {2, 3, 1}}

var allRight = []Input{{1, 2, 1}, {4, 5, 3}, {2, 3, 1}}

func TestSameOutputAAndB(t *testing.T) {
	for _, inputs := range [][]Input{exercise, failFirst, allRight} {
		a := RunA(inputs, &Counters{})
		b := RunB(inputs, &Counters{})
		if !reflect.DeepEqual(a, b) {
			t.Fatalf("A=%v B=%v", a, b)
		}
	}
	if got := RunA(exercise, &Counters{}); !reflect.DeepEqual(got, []string{"transaction annulée"}) {
		t.Fatalf("sortie de l'ex. 10 : %v", got)
	}
	if got := RunA(allRight, &Counters{}); !reflect.DeepEqual(got, []string{"6", "6", "10"}) {
		t.Fatalf("sortie tout succès : %v", got)
	}
}

// Q1 : la fabrique suivante n'est appelée qu'après la précédente, et pas après un échec.
func TestCallsMatchQ1(t *testing.T) {
	var a, b, parallel Counters
	RunA(failFirst, &a)
	RunB(failFirst, &b)
	RunBParallel(failFirst, &parallel)
	if a.Calls.Load() != 1 || b.Calls.Load() != 1 {
		t.Fatalf("A et B doivent s'arrêter au 1er échec : A=%d B=%d", a.Calls.Load(), b.Calls.Load())
	}
	if parallel.Calls.Load() != 3 {
		t.Fatalf("BParallel appelle toutes les fabriques : %d", parallel.Calls.Load())
	}
	t.Logf("fabriques appelées sur failFirst : A=%d B=%d BParallel=%d (DuploJS : 1)",
		a.Calls.Load(), b.Calls.Load(), parallel.Calls.Load())
}

func benchmark(b *testing.B, run func([]Input, *Counters) []string, inputs []Input) {
	var counters Counters
	b.ReportAllocs()
	for b.Loop() {
		run(inputs, &counters)
	}
	b.ReportMetric(float64(counters.Spawned.Load())/float64(b.N), "goroutines/op")
}

func BenchmarkAExercise(b *testing.B)         { benchmark(b, RunA, exercise) }
func BenchmarkBExercise(b *testing.B)         { benchmark(b, RunB, exercise) }
func BenchmarkBParallelExercise(b *testing.B) { benchmark(b, RunBParallel, exercise) }
func BenchmarkAAllRight(b *testing.B)         { benchmark(b, RunA, allRight) }
func BenchmarkBAllRight(b *testing.B)         { benchmark(b, RunB, allRight) }
func BenchmarkBParallelAllRight(b *testing.B) { benchmark(b, RunBParallel, allRight) }
