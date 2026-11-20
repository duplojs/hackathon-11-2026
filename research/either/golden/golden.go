// Package golden fournit la sortie de référence produite par tsx
// (reference/expected.txt) et les données communes aux benchmarks.
package golden

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func Expected(t testing.TB) string {
	t.Helper()
	_, file, _, _ := runtime.Caller(0)
	content, err := os.ReadFile(filepath.Join(filepath.Dir(file), "..", "reference", "expected.txt"))
	if err != nil {
		t.Fatalf("lecture de la référence : %v", err)
	}
	return strings.ReplaceAll(string(content), "\r\n", "\n")
}

// Compare vérifie que les lignes produites par Go donnent exactement la sortie TS.
func Compare(t *testing.T, printed []string) {
	t.Helper()
	got := strings.Join(printed, "\n") + "\n"
	want := Expected(t)
	if got != want {
		t.Fatalf("sortie Go différente de la sortie TS\n--- Go ---\n%s\n--- TS ---\n%s", got, want)
	}
}

// Failing et Passing sont les entrées du scénario group (exercice 09).
var Failing = [][3]float64{{1, 2, 1}, {4, 5, 3}, {2, 3, 0}}
var Passing = [][3]float64{{1, 2, 1}, {4, 5, 3}}

// Inputs1000 : 1000 calculs qui réussissent tous, pour que group parcoure tout.
var Inputs1000 = func() [][3]float64 {
	inputs := make([][3]float64, 1000)
	for index := range inputs {
		inputs[index] = [3]float64{float64(index % 10), 2, float64(index%3 + 1)}
	}
	return inputs
}()

// Operand fait varier le premier opérande sur -1, 0, 1, 2 : 25 % de gauches.
func Operand(iteration int) float64 {
	return float64(iteration%4) - 1
}
