package main

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf16"
)

// Compilée une seule fois, au chargement du package.
var digits = regexp.MustCompile("[0-9]")

// DString.to(n) : le moins de chiffres possible, comme JS.
func numberToString(value float64) string {
	return strconv.FormatFloat(value, 'f', -1, 64)
}

// DString.length(s) : JS compte des unités UTF-16.
// Correction proposée : le transpileur compte aujourd'hui les runes
// (utf8.RuneCountInString), ce qui donne 1 au lieu de 2 pour un emoji.
func jsLength(value string) float64 {
	return float64(len(utf16.Encode([]rune(value))))
}

func main() {
	fmt.Println(numberToString(3))
	fmt.Println(numberToString(0.5))
	fmt.Println(digits.MatchString("abc1"))
	fmt.Println(strings.Contains("a@b", "@"))
	fmt.Println(jsLength("été"))
	fmt.Println(jsLength("😀"))
}
