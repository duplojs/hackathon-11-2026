package aprime_test

import (
	"testing"
	"unsafe"

	"research/either/a"
	"research/either/aprime"
	"research/either/b"
	"research/either/c"
)

// TestSizes affiche la taille en mémoire de chaque représentation
// (go test -v -run TestSizes ./aprime).
func TestSizes(t *testing.T) {
	t.Logf("A  Either[float64]                 : %d octets", unsafe.Sizeof(a.Either[float64]{}))
	t.Logf("A' Either2[float64, []float64]     : %d octets", unsafe.Sizeof(aprime.Either2[float64, []float64]{}))
	t.Logf("A' LimitUnion (2 gauches + droite) : %d octets", unsafe.Sizeof(aprime.LimitUnion{}))
	t.Logf("B  Either (interface)              : %d octets + valeur boxée sur le tas", unsafe.Sizeof(b.Either(nil)))
	t.Logf("B  Right[float64] (boxé)           : %d octets", unsafe.Sizeof(b.Right[float64]{}))
	t.Logf("C  Either (Value any)              : %d octets + valeur boxée sur le tas", unsafe.Sizeof(c.Either{}))
}
