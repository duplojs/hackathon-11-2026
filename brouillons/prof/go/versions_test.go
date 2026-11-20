package profbench

import "testing"

var inputs = []string{"test", "test1", "te@st", "été😀"}

// Les deux versions doivent donner le même résultat.
func TestSameResult(t *testing.T) {
	for _, input := range inputs {
		a := mainA(input).(EitherAny)
		b := mainB(input)
		var bValue any
		if b.IsRight {
			bValue = b.Right
		}
		if a.IsRight != b.IsRight || a.Information != b.Information || a.Kind != b.Kind || a.Value != bValue {
			t.Fatalf("%q : A=%+v B=%+v", input, a, b)
		}
	}
	if got := mainB("été😀").Right; got != 5 {
		t.Fatalf("longueur JS attendue 5, obtenu %v", got)
	}
}

var sinkA any
var sinkB Either[mainLeft, float64]

func BenchmarkA_any(b *testing.B) {
	for i := 0; i < b.N; i++ {
		sinkA = mainA(inputs[i%len(inputs)])
	}
}

func BenchmarkB_type(b *testing.B) {
	for i := 0; i < b.N; i++ {
		sinkB = mainB(inputs[i%len(inputs)])
	}
}

func BenchmarkA2_any_regexUneFois(b *testing.B) {
	for i := 0; i < b.N; i++ {
		sinkA = mainA2(inputs[i%len(inputs)])
	}
}
