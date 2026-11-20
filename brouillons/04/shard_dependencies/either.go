// Runtime écrit à la main, copié tel quel dans shard_dependencies.
package shard_dependencies

// Either : un seul struct, passé par valeur. Seul Left ou Right compte, selon IsRight.
// Kind ("success", "fail"… ou "" pour left/right) sert seulement à l'affichage.
type Either[L any, R any] struct {
	IsRight     bool
	Information string
	Kind        string
	Left        L
	Right       R
}

const eitherKindPrefix = "@duplojs/lang/kind/@DuplojsLangEither/"

// jsEntries : clés et valeurs de l'objet JS, dans l'ordre d'affichage de Node.
func (either Either[L, R]) jsEntries() ([]string, []any) {
	keys := make([]string, 0, 4)
	values := make([]any, 0, 4)
	if either.IsRight {
		keys = append(keys, eitherKindPrefix+"right")
		values = append(values, JSNull{}, either.Information, either.Right)
	} else {
		keys = append(keys, eitherKindPrefix+"left")
		values = append(values, JSNull{}, either.Information, either.Left)
	}
	keys = append(keys, eitherKindPrefix+"information", eitherKindPrefix+"value")
	if either.Kind != "" {
		keys = append(keys, eitherKindPrefix+either.Kind)
		values = append(values, JSNull{})
	}
	return keys, values
}
