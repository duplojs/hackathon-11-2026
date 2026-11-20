// Code Go écrit à la main (runtime), copié tel quel dans shard_dependencies
// par le transpileur. Voir sharedDependency.ts à côté de ce fichier.
//
// Print imite console.log de Node (util.inspect avec ses options par défaut :
// breakLength 80, compact 3, depth 2, maxArrayLength 100) pour les types que le
// transpileur manipule : float64, string, bool, JSNull, JSUndefined, tableaux
// (slices / arrays Go) et Either. Objectif : sortie identique caractère par caractère.
//
// Print reçoit un `any` : c'est la frontière d'affichage, comme console.log qui est
// lui-même dynamique. Le coût (interface + reflect pour les tableaux) ne concerne
// que l'affichage, pas les calculs.
//
// Limites connues (assumées) : pas de maxStringLength (10 000 caractères),
// pas de surrogates isolés (impossible dans une string Go valide).
package shard_dependencies

import (
	"math"
	"os"
	"reflect"
	"strconv"
	"strings"
)

const (
	inspectBreakLength    = 80
	inspectCompact        = 3
	inspectDepth          = 2
	inspectMaxArrayLength = 100
	inspectMinLineWidth   = 16
)

// Print : DCommon.print(value) / console.log(value).
func Print(value any) {
	var text string
	if s, ok := value.(string); ok {
		// console.log affiche une chaîne de premier niveau telle quelle, sans guillemets.
		text = s
	} else {
		text = formatValue(&inspectContext{}, value, 0)
	}
	os.Stdout.WriteString(text + "\n")
}

// jsObject : une valeur Go qui s'affiche comme un objet JS (Either par exemple).
// Elle donne ses clés et ses valeurs dans l'ordre d'affichage.
// Print ne connaît pas Either directement : il fonctionne aussi dans un
// programme qui n'utilise pas Either.
type jsObject interface {
	jsEntries() ([]string, []any)
}

type inspectContext struct {
	indentationLvl int
	currentDepth   int
}

func formatValue(ctx *inspectContext, value any, recurseTimes int) string {
	switch v := value.(type) {
	case JSUndefined:
		return "undefined"
	case JSNull:
		return "null"
	case bool:
		return strconv.FormatBool(v)
	case float64:
		return formatNumber(v)
	case string:
		return formatString(ctx, v)
	case jsObject:
		return formatObject(ctx, v, recurseTimes)
	}
	if value == nil {
		// Jamais de sortie silencieusement fausse : on s'arrête.
		panic("shard_dependencies.Print : valeur nil inattendue")
	}
	reflected := reflect.ValueOf(value)
	if reflected.Kind() == reflect.Slice || reflected.Kind() == reflect.Array {
		return formatArray(ctx, reflected, recurseTimes)
	}
	// Jamais de sortie silencieusement fausse : on s'arrête.
	panic("shard_dependencies.Print : type non géré " + reflected.Type().String())
}

func formatObject(ctx *inspectContext, object jsObject, recurseTimes int) string {
	if recurseTimes > inspectDepth {
		return "[Object]"
	}
	keys, values := object.jsEntries()
	if len(keys) == 0 {
		return "{}"
	}
	recurseTimes++
	ctx.currentDepth = recurseTimes
	output := make([]string, len(keys))
	for i, key := range keys {
		ctx.indentationLvl += 2
		formatted := formatValue(ctx, values[i], recurseTimes)
		ctx.indentationLvl -= 2
		output[i] = formatKey(key) + ": " + formatted
	}
	return reduceToSingleString(ctx, output, "{", "}", false, recurseTimes, false)
}

func formatArray(ctx *inspectContext, array reflect.Value, recurseTimes int) string {
	if recurseTimes > inspectDepth {
		return "[Array]"
	}
	length := array.Len()
	if length == 0 {
		return "[]"
	}
	recurseTimes++
	ctx.currentDepth = recurseTimes
	shown := min(length, inspectMaxArrayLength)
	output := make([]string, 0, shown+1)
	onlyNumbers := true
	for i := 0; i < shown; i++ {
		element := array.Index(i).Interface()
		if _, isNumber := element.(float64); !isNumber {
			onlyNumbers = false
		}
		ctx.indentationLvl += 2
		output = append(output, formatValue(ctx, element, recurseTimes))
		ctx.indentationLvl -= 2
	}
	if remaining := length - shown; remaining > 0 {
		suffix := ""
		if remaining > 1 {
			suffix = "s"
		}
		output = append(output, "... "+strconv.Itoa(remaining)+" more item"+suffix)
	}
	return reduceToSingleString(ctx, output, "[", "]", true, recurseTimes, onlyNumbers)
}

// Équivalent de reduceToSingleString de Node : une ligne si ça tient, sinon une entrée par ligne.
func reduceToSingleString(ctx *inspectContext, output []string, open string, close string, isArray bool, recurseTimes int, onlyNumbers bool) string {
	entries := len(output)
	if isArray && entries > 6 {
		output = groupArrayElements(ctx, output, onlyNumbers)
	}
	if ctx.currentDepth-recurseTimes < inspectCompact && entries == len(output) {
		start := len(output) + ctx.indentationLvl + jsLength(open) + 10
		if isBelowBreakLength(output, start) {
			joined := strings.Join(output, ", ")
			if !strings.Contains(joined, "\n") {
				return open + " " + joined + " " + close
			}
		}
	}
	indentation := "\n" + strings.Repeat(" ", ctx.indentationLvl)
	return open + indentation + "  " + strings.Join(output, ","+indentation+"  ") + indentation + close
}

func isBelowBreakLength(output []string, start int) bool {
	totalLength := len(output) + start
	if totalLength+len(output) > inspectBreakLength {
		return false
	}
	for _, entry := range output {
		totalLength += jsLength(entry)
		if totalLength > inspectBreakLength {
			return false
		}
	}
	return true
}

// Équivalent de groupArrayElements de Node : tableaux de plus de 6 éléments en colonnes.
func groupArrayElements(ctx *inspectContext, output []string, onlyNumbers bool) []string {
	const separatorSpace = 2
	totalLength := 0
	maxLength := 0
	outputLength := len(output)
	if len(output) > inspectMaxArrayLength {
		outputLength-- // ne pas compter « ... n more items »
	}
	dataLength := make([]int, outputLength)
	for i := 0; i < outputLength; i++ {
		length := jsLength(output[i])
		dataLength[i] = length
		totalLength += length + separatorSpace
		if maxLength < length {
			maxLength = length
		}
	}
	actualMax := maxLength + separatorSpace
	if actualMax*3+ctx.indentationLvl < inspectBreakLength &&
		(float64(totalLength)/float64(actualMax) > 5 || maxLength <= 6) {
		averageBias := math.Sqrt(float64(actualMax) - float64(totalLength)/float64(len(output)))
		biasedMax := math.Max(float64(actualMax)-3-averageBias, 1)
		columns := min(
			int(math.Round(math.Sqrt(2.5*biasedMax*float64(outputLength))/biasedMax)),
			(inspectBreakLength-ctx.indentationLvl)/actualMax,
			inspectCompact*4,
			15,
		)
		if columns <= 1 {
			return output
		}
		maxLineLength := make([]int, 0, columns)
		for i := 0; i < columns; i++ {
			lineLength := 0
			for j := i; j < len(output); j += columns {
				if j < outputLength && dataLength[j] > lineLength {
					lineLength = dataLength[j]
				}
			}
			maxLineLength = append(maxLineLength, lineLength+separatorSpace)
		}
		grouped := make([]string, 0, outputLength/columns+2)
		for i := 0; i < outputLength; i += columns {
			last := min(i+columns, outputLength)
			var line strings.Builder
			j := i
			for ; j < last-1; j++ {
				cell := output[j] + ", "
				line.WriteString(pad(cell, maxLineLength[j-i], onlyNumbers))
			}
			if onlyNumbers {
				line.WriteString(pad(output[j], maxLineLength[j-i]-separatorSpace, true))
			} else {
				line.WriteString(output[j])
			}
			grouped = append(grouped, line.String())
		}
		if len(output) > inspectMaxArrayLength {
			grouped = append(grouped, output[outputLength])
		}
		return grouped
	}
	return output
}

// Nombres alignés à droite (padStart), le reste à gauche (padEnd), comme Node.
func pad(text string, width int, left bool) string {
	missing := width - jsLength(text)
	if missing <= 0 {
		return text
	}
	if left {
		return strings.Repeat(" ", missing) + text
	}
	return text + strings.Repeat(" ", missing)
}

// Number.prototype.toString de JS, avec -0 affiché « -0 » comme util.inspect.
func formatNumber(number float64) string {
	switch {
	case math.IsNaN(number):
		return "NaN"
	case math.IsInf(number, 1):
		return "Infinity"
	case math.IsInf(number, -1):
		return "-Infinity"
	case number == 0:
		if math.Signbit(number) {
			return "-0"
		}
		return "0"
	}
	absolute := math.Abs(number)
	if absolute >= 1e-6 && absolute < 1e21 {
		return strconv.FormatFloat(number, 'f', -1, 64)
	}
	// Go écrit « 1.5e-07 », JS écrit « 1.5e-7 ».
	mantissa, exponent, _ := strings.Cut(strconv.FormatFloat(number, 'e', -1, 64), "e")
	return mantissa + "e" + exponent[:1] + strings.TrimLeft(exponent[1:], "0")
}

func formatString(ctx *inspectContext, text string) string {
	// Node coupe les longues chaînes multi-lignes après chaque « \n ».
	if jsLength(text) > inspectMinLineWidth &&
		jsLength(text) > inspectBreakLength-ctx.indentationLvl-4 &&
		strings.Contains(strings.TrimSuffix(text, "\n"), "\n") {
		lines := strings.SplitAfter(text, "\n")
		if lines[len(lines)-1] == "" {
			lines = lines[:len(lines)-1]
		}
		for i, line := range lines {
			lines[i] = quoteString(line)
		}
		return strings.Join(lines, " +\n"+strings.Repeat(" ", ctx.indentationLvl+2))
	}
	return quoteString(text)
}

// Équivalent de strEscape de Node : guillemets simples par défaut.
func quoteString(text string) string {
	quote := '\''
	if strings.ContainsRune(text, '\'') {
		if !strings.ContainsRune(text, '"') {
			quote = '"'
		} else if !strings.ContainsRune(text, '`') && !strings.Contains(text, "${") {
			quote = '`'
		}
	}
	var builder strings.Builder
	builder.WriteRune(quote)
	for _, character := range text {
		switch {
		case character == '\'' && quote == '\'':
			builder.WriteString(`\'`)
		case character == '\\':
			builder.WriteString(`\\`)
		case character == '\b':
			builder.WriteString(`\b`)
		case character == '\t':
			builder.WriteString(`\t`)
		case character == '\n':
			builder.WriteString(`\n`)
		case character == '\f':
			builder.WriteString(`\f`)
		case character == '\r':
			builder.WriteString(`\r`)
		case character < 0x20 || (character >= 0x7f && character <= 0x9f):
			hex := strings.ToUpper(strconv.FormatInt(int64(character), 16))
			if len(hex) < 2 {
				hex = "0" + hex
			}
			builder.WriteString(`\x` + hex)
		default:
			builder.WriteRune(character)
		}
	}
	builder.WriteRune(quote)
	return builder.String()
}

// Clé d'objet : sans guillemets si c'est un identifiant simple, sinon entre guillemets.
func formatKey(key string) string {
	for i, character := range key {
		isLetter := character == '_' || (character >= 'a' && character <= 'z') || (character >= 'A' && character <= 'Z')
		isDigit := character >= '0' && character <= '9'
		if !isLetter && !(i > 0 && isDigit) {
			return quoteString(key)
		}
	}
	if key == "" {
		return "''"
	}
	return key
}

// Longueur d'une chaîne au sens JS (unités UTF-16), et non en octets comme len() en Go.
func jsLength(text string) int {
	length := 0
	for _, character := range text {
		if character >= 0x10000 {
			length += 2
		} else {
			length++
		}
	}
	return length
}
