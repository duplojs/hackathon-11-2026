// Package inspect reproduit le format d'affichage de DCommon.print
// (util.inspect de Node) pour les seules formes utilisées dans l'étude.
// Toutes les représentations Go s'appuient dessus : ajuster le format ici
// suffit à les ajuster toutes (le format exact est étudié par la Personne 3).
package inspect

import (
	"math"
	"strconv"
	"strings"
)

const eitherPrefix = "@duplojs/lang/kind/@DuplojsLangEither/"

// Number formate un float64 comme util.inspect formate un number JS.
func Number(value float64) string {
	switch {
	case math.IsNaN(value):
		return "NaN"
	case math.IsInf(value, 1):
		return "Infinity"
	case math.IsInf(value, -1):
		return "-Infinity"
	case value == 0:
		if math.Signbit(value) {
			return "-0"
		}
		return "0"
	}

	absolute := math.Abs(value)
	if absolute >= 1e-6 && absolute < 1e21 {
		return strconv.FormatFloat(value, 'f', -1, 64)
	}

	// Go écrit "1.5e-07", JS écrit "1.5e-7".
	mantissa, exponent, _ := strings.Cut(strconv.FormatFloat(value, 'e', -1, 64), "e")
	return mantissa + "e" + exponent[:1] + strings.TrimLeft(exponent[1:], "0")
}

// ToString imite String(number) : identique à Number sauf pour -0.
func ToString(value float64) string {
	if value == 0 {
		return "0"
	}
	return Number(value)
}

// Text formate une chaîne contenue dans un objet ('abc').
func Text(value string) string {
	return "'" + value + "'"
}

// Array formate un tableau court sur une ligne : [ 1, 2 ].
func Array(items []string) string {
	if len(items) == 0 {
		return "[]"
	}
	return "[ " + strings.Join(items, ", ") + " ]"
}

// Numbers formate un []float64.
func Numbers(values []float64) string {
	items := make([]string, len(values))
	for index, value := range values {
		items[index] = Number(value)
	}
	return Array(items)
}

// Side vaut "right" ou "left" ; terminal vaut "success", "fail" ou "".
// value est déjà formatée ("undefined" pour fail).
func Either(side string, information string, value string, terminal string) string {
	var builder strings.Builder
	builder.WriteString("{\n")
	builder.WriteString("  '" + eitherPrefix + side + "': null,\n")
	builder.WriteString("  '" + eitherPrefix + "information': " + Text(information) + ",\n")
	builder.WriteString("  '" + eitherPrefix + "value': " + value)
	if terminal != "" {
		builder.WriteString(",\n  '" + eitherPrefix + terminal + "': null")
	}
	builder.WriteString("\n}")
	return builder.String()
}
