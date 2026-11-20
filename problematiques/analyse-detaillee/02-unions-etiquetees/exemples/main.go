// Problématique 02 : représenter une union TypeScript en Go.
// Exécution : go run ./02-unions-etiquetees/exemples
// Benchmark : go test -bench . -benchmem ./02-unions-etiquetees/exemples
package main

import (
	"fmt"
	"unsafe"
)

// Membres de l'union, simplifiés : le vrai runtime y ajoute les clés DuploJS
// (right, success, information) pour reproduire l'affichage de Node.
type Fail struct{}

type Success[T any] struct {
	Value T
}

// Union étiquetée générique : une étiquette + un champ par membre.
// Chaque membre garde son propre type Go : aucun `any`, aucune assertion.
type Union2[T0 any, T1 any] struct {
	Tag uint8
	V0  T0
	V1  T1
}

// Les membres sont triés dans un ordre canonique (par représentation Go).
// `Fail | Success<number>` et `Success<number> | Fail` donnent donc le même
// type Go, et les deux annotations restent assignables l'une à l'autre.
type AddResult = Union2[Fail, Success[float64]]

const (
	addResultIsFail    = 0
	addResultIsSuccess = 1
)

// Plusieurs chemins de retour : chaque `return` place sa valeur dans le membre
// qui correspond à son type (« placeValue » dans le transpileur).
func add(one float64, two float64) AddResult {
	if one == -1 {
		return AddResult{Tag: addResultIsFail, V0: Fail{}}
	}

	return AddResult{Tag: addResultIsSuccess, V1: Success[float64]{Value: one + two}}
}

func main() {
	result := add(1, 2)

	// `DEither.isRight(result)` est résolu à la compilation : le checker sait
	// quels membres sont des Right. À l'exécution il ne reste qu'une
	// comparaison d'entier, sans inspecter la valeur.
	if result.Tag == addResultIsSuccess {
		// Rétrécissement : TypeScript voit un `Success<number>`. La variable Go
		// garde le type union, et on lit directement le bon champ.
		fmt.Println(result.V1.Value)
	}

	failed := add(-1, 2)

	if failed.Tag == addResultIsSuccess {
		fmt.Println("jamais affiché")
	} else {
		fmt.Println("échec")
	}

	// Coût mémoire de la représentation (voir HISTORIQUE.md).
	fmt.Println("taille AddResult      :", unsafe.Sizeof(result), "octets (sur la pile)")
	var boxed EitherInterface = SuccessBox{Value: 3}
	fmt.Println("taille interface      :", unsafe.Sizeof(boxed), "octets + 8 octets alloués sur le tas par résultat")
}
