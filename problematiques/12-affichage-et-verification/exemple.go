package main

import (
	"encoding/json"
	"fmt"
)

// null en JSON.
type JSNull struct{}

func (JSNull) MarshalJSON() ([]byte, error) { return []byte("null"), nil }

// undefined : IsZero permet au tag omitzero d'omettre le champ,
// comme JSON.stringify omet une propriété undefined.
type JSUndefined struct{}

func (JSUndefined) MarshalJSON() ([]byte, error) { return []byte("null"), nil }
func (JSUndefined) IsZero() bool                 { return true }

// Les tags json reprennent les clés de l'objet JS, dans le même ordre.
type EitherSuccess[T any] struct {
	Right       JSNull `json:"@duplojs/lang/kind/@DuplojsLangEither/right"`
	Information string `json:"@duplojs/lang/kind/@DuplojsLangEither/information"`
	Value       T      `json:"@duplojs/lang/kind/@DuplojsLangEither/value"`
	Success     JSNull `json:"@duplojs/lang/kind/@DuplojsLangEither/success"`
}

type EitherFail struct {
	Left        JSNull      `json:"@duplojs/lang/kind/@DuplojsLangEither/left"`
	Information string      `json:"@duplojs/lang/kind/@DuplojsLangEither/information"`
	Value       JSUndefined `json:"@duplojs/lang/kind/@DuplojsLangEither/value,omitzero"`
	Fail        JSNull      `json:"@duplojs/lang/kind/@DuplojsLangEither/fail"`
}

func print(value any) {
	// Une chaîne seule est affichée brute, comme console.info("texte").
	if text, isString := value.(string); isString {
		fmt.Println(text)
		return
	}

	output, _ := json.MarshalIndent(value, "", "  ")
	fmt.Println(string(output))
}

func main() {
	print(EitherSuccess[float64]{Information: "success", Value: 3})
	print(EitherFail{Information: "fail"})
	print("texte brut")
}
