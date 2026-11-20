// Copie du runtime écrit à la main du transpileur (src/transpiler/transformers/duplojs/…),
// seul le nom du paquet change : shard_dependencies -> duplo. Utilisé par les exemples du livrable.
package duplo

// Stringable : les seuls types Go que StringTo sait convertir comme JS.
// La contrainte est vérifiée par le compilateur Go : passer un tableau ou une
// struct à StringTo ne compile pas, au lieu de planter à l'exécution.
type Stringable interface {
	float64 | string | bool
}

// StringTo correspond à DString.to(value), c'est-à-dire `${value}` en JS.
//
// Les nombres utilisent formatNumber (print.go), qui écrit les nombres comme JS
// (1e+21, NaN…), sauf -0 : `${-0}` vaut "0" en JS, alors que l'affichage de Node écrit -0.
// Le switch sur any(value) sert seulement à choisir la conversion : la contrainte
// Stringable garantit qu'on tombe toujours dans un des trois cas.
func StringTo[T Stringable](value T) string {
	switch typed := any(value).(type) {
	case float64:
		if typed == 0 {
			return "0"
		}
		return formatNumber(typed)
	case string:
		return typed
	case bool:
		if typed {
			return "true"
		}
		return "false"
	}
	panic("duplo.StringTo : inatteignable (contrainte Stringable)")
}
