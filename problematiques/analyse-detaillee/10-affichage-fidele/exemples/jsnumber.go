package main

import (
	"math"
	"strconv"
	"strings"
)

// jsNumberToString reproduit Number::toString (ECMAScript §6.1.6.1.20).
//
//  1. On obtient les chiffres significatifs les plus courts qui redonnent
//     exactement le même float64 : c'est ce que fait déjà
//     strconv.FormatFloat(…, 'e', -1, 64), avec le même critère que JavaScript.
//  2. On applique ensuite les règles de mise en forme de JavaScript, qui sont
//     DIFFÉRENTES de celles de Go (%v passe en notation exponentielle dès 1e21
//     comme JS, mais aussi pour 123456789012, et écrit 1e-07 au lieu de 1e-7).
func jsNumberToString(value float64) string {
	switch {
	case math.IsNaN(value):
		return "NaN"
	case value == 0:
		return "0" // -0 aussi : Number::toString(-0) vaut "0"
	case math.IsInf(value, 1):
		return "Infinity"
	case math.IsInf(value, -1):
		return "-Infinity"
	}

	sign := ""
	if value < 0 {
		sign = "-"
		value = -value
	}

	// "1.2345e+02" -> chiffres "12345", exposant décimal n = 3
	formatted := strconv.FormatFloat(value, 'e', -1, 64)
	mantissa, exponentText, _ := strings.Cut(formatted, "e")
	digits := strings.Replace(mantissa, ".", "", 1)
	exponent, _ := strconv.Atoi(exponentText)
	digitCount := len(digits)
	n := exponent + 1 // position de la virgule

	switch {
	case digitCount <= n && n <= 21: // entier : 123456789012
		return sign + digits + strings.Repeat("0", n-digitCount)
	case 0 < n && n <= 21: // décimal : 12.5 (n = 2)
		return sign + digits[:n] + "." + digits[n:]
	case -6 < n && n <= 0: // petit décimal : 0.30000000000000004 (n = 0), 0.000001 (n = -5)
		return sign + "0." + strings.Repeat("0", -n) + digits
	}

	// Notation exponentielle : 1e+21, 1.5e-7
	exponentSign := "+"
	if n-1 < 0 {
		exponentSign = "-"
	}
	exponentValue := strconv.Itoa(int(math.Abs(float64(n - 1))))
	if digitCount == 1 {
		return sign + digits + "e" + exponentSign + exponentValue
	}
	return sign + digits[:1] + "." + digits[1:] + "e" + exponentSign + exponentValue
}

// inspectNumber : comme util.inspect, distingue -0.
func inspectNumber(value float64) string {
	if value == 0 && math.Signbit(value) {
		return "-0"
	}
	return jsNumberToString(value)
}

// Chaîne dans une structure : guillemets simples et échappements de Node.
func inspectQuotedString(value string) string {
	escaped := strings.ReplaceAll(value, `\`, `\\`)
	escaped = strings.ReplaceAll(escaped, "'", `\'`)
	escaped = strings.ReplaceAll(escaped, "\n", `\n`)
	return "'" + escaped + "'"
}

// Inspecteur de tableau, choisi À LA COMPILATION selon le type des éléments :
// inspectSlice(inspectQuotedString) pour []string, inspectSlice(inspectNumber)
// pour []float64. Aucune réflexion.
// (Simplifié : une seule ligne. Le runtime réel applique la règle de Node,
// passage à la ligne au-delà de 80 colonnes.)
func inspectSlice[T any](inspectElement func(T) string) func([]T) string {
	return func(values []T) string {
		if len(values) == 0 {
			return "[]"
		}
		parts := make([]string, len(values))
		for index, value := range values {
			parts[index] = inspectElement(value)
		}
		return "[ " + strings.Join(parts, ", ") + " ]"
	}
}
