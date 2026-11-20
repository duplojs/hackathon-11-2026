package main

// Piste ÉCARTÉE, conservée pour le benchmark : l'union comme interface Go.
// C'est la traduction « orientée objet » classique : une interface scellée par
// une méthode privée, puis un switch de type pour retrouver le membre.

type EitherInterface interface {
	isEither()
}

type FailBox struct{}

type SuccessBox struct {
	Value float64
}

func (FailBox) isEither()    {}
func (SuccessBox) isEither() {}

func addWithInterface(one float64, two float64) EitherInterface {
	if one == -1 {
		return FailBox{}
	}

	// Convertir une struct non vide en interface la place sur le tas.
	return SuccessBox{Value: one + two}
}

func readWithInterface(result EitherInterface) float64 {
	switch member := result.(type) {
	case SuccessBox:
		return member.Value
	default:
		return 0
	}
}
