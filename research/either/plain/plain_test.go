package plain_test

import (
	"testing"

	"research/either/plain"
)

// Valide le point 4 du sprint (PLAN_HACKATHON.md §8) : un Plain porteur de
// []float64{3} s'affiche comme la valeur nue ("[ 3 ]", pas l'objet Either),
// et un Fail (InspectPlain renvoie ok=false) reste géré par le repli.
func TestPrintPrefersInspectPlainThenFallsBack(t *testing.T) {
	cases := []struct {
		name string
		e    func() string
		want string
	}{
		{"plain", func() string { return plain.Print(plain.Plain([]float64{3})) }, "[ 3 ]"},
		{"fail", func() string { return plain.Print(plain.Fail()) }, "Fail"},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			if got := testCase.e(); got != testCase.want {
				t.Fatalf("got %q, want %q", got, testCase.want)
			}
		})
	}
}
