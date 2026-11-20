// Package plain prototype la forme Plain de l'ADR-2 (union non-Either,
// PLAN_HACKATHON.md §0.5) côté affichage : Print doit tester d'abord
// l'interface { InspectPlain() (any, bool) } (valeur nue, sans l'enveloppe
// Either), puis se replier sur le format Either existant quand InspectPlain
// renvoie false. Ce fichier valide uniquement l'ordre de priorité de ce
// dispatch ; le format détaillé d'un Either quelconque reste celui de
// research/either/inspect (et, côté transpileur, de defaults/inspect.ts).
package plain

import "research/either/inspect"

type kind uint8

const (
	kindSuccess kind = iota
	kindFail
	kindPlain
)

// either imite shard_dependencies.Either[V] une fois l'ADR-2 appliquée :
// Kind gagne une 5e valeur (Plain), InspectPlain s'ajoute à InspectEntries.
type either struct {
	Kind  kind
	Value []float64
}

// InspectPlain renvoie (Value, true) seulement pour la forme Plain (§8) :
// IsRight()/IsLeft() valent false pour Plain, donc rien d'autre ne
// distingue une valeur nue d'un Either réel pour Print.
func (e either) InspectPlain() (any, bool) {
	if e.Kind == kindPlain {
		return e.Value, true
	}

	return nil, false
}

type plainProvider interface {
	InspectPlain() (any, bool)
}

// Print reproduit l'ordre de priorité que defaults/inspect.ts doit encoder :
// InspectPlain d'abord (valeur nue) ; sinon le format Either (ici un
// gabarit minimal pour Fail, le formateur complet étant hors de portée de
// ce prototype).
func Print(e either) string {
	var provider plainProvider = e

	if value, ok := provider.InspectPlain(); ok {
		return inspect.Numbers(value.([]float64))
	}

	return "Fail"
}

func Plain(value []float64) either {
	return either{Kind: kindPlain, Value: value}
}

func Fail() either {
	return either{Kind: kindFail}
}
