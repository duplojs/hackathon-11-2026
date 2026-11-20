// Test de Print : mêmes valeurs que reference.ts.
package main

import (
	"math"

	sd "duplojs.local/transpiled/shard_dependencies"
)

func success[R any](v R) sd.Either[sd.JSUndefined, R] {
	return sd.EitherSuccessOf[sd.JSUndefined, R](v)
}

func main() {
	p := sd.Print
	one, two := 0.1, 0.2 // variables : calcul en float64 à l'exécution, comme JS
	p(3.0); p(math.Copysign(0, -1)); p(1.5); p(1e21); p(1e-7); p(0.000001); p(one + two); p(math.NaN()); p(math.Inf(-1))
	p(123456789012.0); p(1e300); p(5e-324); p(-123.456); p(math.Pow(2, 53)); p(1.0 / 3)
	p("abc"); p([]string{"abc"}); p([]string{"it's"}); p([]string{"it's \"x\""}); p([]string{"it's \"x\" `y`"}); p([]string{"a\\b\tc"})
	p([]string{"é", "日本", "😀"}); p([]float64{}); p([]float64{1, 2, 3}); p([]bool{true, false})
	p([]float64{1.5, math.Copysign(0, -1), 1e21, 1e-7, one + two, math.NaN(), math.Inf(-1), 123456789012})
	a26 := make([]float64, 26)
	for i := range a26 { a26[i] = float64(i * 7) }
	p(a26)
	a30 := make([]string, 30)
	for i := range a30 { a30[i] = "item" + itoa(i) }
	p(a30)
	a120 := make([]float64, 120)
	for i := range a120 { a120[i] = float64(i) }
	p(a120)
	p([]any{[]any{1.0, []any{2.0, []any{3.0, []float64{4}}}}})
	p([]string{"ligne un qui est assez longue\nligne deux qui est aussi assez longue\nligne trois qui termine"})
	p(success(3.0)); p(sd.Either[sd.JSUndefined, float64]{Information: "fail", Kind: "fail"})
	p(sd.Either[float64, float64]{Information: "division-by-zero", Left: 0})
	p(sd.Either[sd.JSUndefined, float64]{IsRight: true, Information: "success", Right: 3})
	p([]sd.Either[sd.JSUndefined, float64]{success(1.0), {Information: "fail", Kind: "fail"}})
	p(success([]float64{1, 2, 3})); p(success("txt")); p(success([]string{"a", "b"}))
	p([][]sd.Either[sd.JSUndefined, float64]{{success(1.0)}}); p([][][]sd.Either[sd.JSUndefined, float64]{{{success(1.0)}}})
}

func itoa(i int) string {
	if i < 10 { return string(rune('0' + i)) }
	return itoa(i/10) + string(rune('0'+i%10))
}
