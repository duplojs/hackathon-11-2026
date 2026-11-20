// Code Go écrit à la main (runtime), copié tel quel dans shard_dependencies
// par le transpileur. Voir sharedDependency.ts à côté de ce fichier.
package shard_dependencies

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
	panic("shard_dependencies.StringTo : inatteignable (contrainte Stringable)")
}
