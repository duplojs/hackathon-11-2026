package main

import (
	"reflect"
	"strconv"
)

// Piste ÉCARTÉE (première version du transpileur) : un `Pipe` et un `Apply`
// génériques au sens dynamique. Chaque étape est reçue en `any` et appelée par
// réflexion. Ça marche pour n'importe quel nombre d'étapes, mais :
//   - le compilateur Go ne vérifie plus aucun type (erreur seulement à l'exécution) ;
//   - chaque appel alloue (reflect.Value, slices d'arguments, boxing en `any`).

func apply(function any, arguments ...any) any {
	functionValue := reflect.ValueOf(function)
	inputs := make([]reflect.Value, len(arguments))
	for index, argument := range arguments {
		inputs[index] = reflect.ValueOf(argument)
	}
	return functionValue.Call(inputs)[0].Interface()
}

func reflectPipe(input any, steps ...any) any {
	accumulator := input
	for _, step := range steps {
		accumulator = apply(step, accumulator)
	}
	return accumulator
}

// Les étapes doivent elles aussi accepter des types dynamiques.
func coalescingAny(value float64) []float64 {
	return []float64{value}
}

func mapToTextAny(values []float64) []string {
	output := make([]string, len(values))
	for index, value := range values {
		output[index] = strconv.FormatFloat(value, 'f', -1, 64)
	}
	return output
}
