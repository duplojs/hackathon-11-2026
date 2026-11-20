package benchmarkany

import (
	"testing"
	"unsafe"
)

// Une entrée sur quatre est négative : les deux chemins (échec et succès) sont exercés.
func operand(index int) float64 {
	if index%4 == 0 {
		return -1
	}
	return float64(index % 100)
}

var sink float64

// Les quatre représentations doivent calculer exactement la même somme.
func TestSameResult(t *testing.T) {
	var a, b, c, d float64
	for index := 0; index < 1000; index++ {
		one := operand(index)

		if r := addUnion(one, 2); r.Tag == 1 {
			a += r.V1.Value
		}
		if r, ok := addInterface(one, 2).(eitherRight); ok {
			b += r.eitherRightValue()
		}
		if r, ok := addAny(one, 2).(EitherSuccess[float64]); ok {
			c += r.Value
		}
		if r, ok := addAnyPointer(one, 2).(*EitherSuccess[float64]); ok {
			d += r.Value
		}
	}
	if a != b || a != c || a != d {
		t.Fatalf("résultats différents : %v %v %v %v", a, b, c, d)
	}
}

func TestSizes(t *testing.T) {
	t.Logf("Union2[EitherLeft, EitherSuccess] : %d octets", unsafe.Sizeof(Result{}))
	t.Logf("EitherLeft[float64]               : %d octets", unsafe.Sizeof(EitherLeft[float64]{}))
	t.Logf("EitherSuccess[float64]            : %d octets", unsafe.Sizeof(EitherSuccess[float64]{}))
	var anyValue any
	t.Logf("en-tête d'interface / any         : %d octets", unsafe.Sizeof(anyValue))
}

func BenchmarkUnionEtiquetee(b *testing.B) {
	b.ReportAllocs()
	total := 0.0
	for index := 0; index < b.N; index++ {
		if r := addUnion(operand(index), 2); r.Tag == 1 {
			total += r.V1.Value
		}
	}
	sink = total
}

func BenchmarkInterface(b *testing.B) {
	b.ReportAllocs()
	total := 0.0
	for index := 0; index < b.N; index++ {
		if r, ok := addInterface(operand(index), 2).(eitherRight); ok {
			total += r.eitherRightValue()
		}
	}
	sink = total
}

func BenchmarkAny(b *testing.B) {
	b.ReportAllocs()
	total := 0.0
	for index := 0; index < b.N; index++ {
		if r, ok := addAny(operand(index), 2).(EitherSuccess[float64]); ok {
			total += r.Value
		}
	}
	sink = total
}

func BenchmarkAnyPointeur(b *testing.B) {
	b.ReportAllocs()
	total := 0.0
	for index := 0; index < b.N; index++ {
		if r, ok := addAnyPointer(operand(index), 2).(*EitherSuccess[float64]); ok {
			total += r.Value
		}
	}
	sink = total
}

func BenchmarkUnionEtiqueteeEnLigne(b *testing.B) {
	b.ReportAllocs()
	total := 0.0
	for index := 0; index < b.N; index++ {
		if r := addUnionInline(operand(index), 2); r.Tag == 1 {
			total += r.V1.Value
		}
	}
	sink = total
}

func BenchmarkAnyEnLigne(b *testing.B) {
	b.ReportAllocs()
	total := 0.0
	for index := 0; index < b.N; index++ {
		if r, ok := addAnyInline(operand(index), 2).(EitherSuccess[float64]); ok {
			total += r.Value
		}
	}
	sink = total
}

// Comme dans le code généré : la fonction est d'abord rangée dans une variable,
// puis appelée (Generated_1 := Sourced_add ; Generated_1(...)).
var addAnyVariable = addAnyInline
var addUnionVariable = addUnionInline

func BenchmarkUnionEtiqueteeParVariable(b *testing.B) {
	b.ReportAllocs()
	total := 0.0
	for index := 0; index < b.N; index++ {
		if r := addUnionVariable(operand(index), 2); r.Tag == 1 {
			total += r.V1.Value
		}
	}
	sink = total
}

func BenchmarkAnyParVariable(b *testing.B) {
	b.ReportAllocs()
	total := 0.0
	for index := 0; index < b.N; index++ {
		if r, ok := addAnyVariable(operand(index), 2).(EitherSuccess[float64]); ok {
			total += r.Value
		}
	}
	sink = total
}
