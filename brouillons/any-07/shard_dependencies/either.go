// BROUILLON (version any) : futur either/either.go.
package shard_dependencies

// Either est la représentation Go d'un Either DuploJS : un seul struct, le
// même pour TOUS les Either (Success, Fail, Left, et leurs unions).
//
//	IsRight      true pour un Right (succès), false pour un Left (échec).
//	Information  l'information DuploJS : "success", "fail", "division-by-zero"...
//	Kind         le marqueur ajouté par success(), fail(), ok(), error()...
//	             "" pour un Either créé par left() ou right().
//	Value        la valeur, de n'importe quel type (any). Pour la relire avec
//	             son vrai type, le code généré écrit Value.(float64).
//
// Kind est nécessaire pour reproduire l'affichage de Node : DEither.success(3)
// affiche une clé « success: null » que DEither.right("success", 3) n'a pas.
type Either struct {
	IsRight     bool
	Information string
	Kind        string
	Value       any
}

const eitherKindPrefix = "@duplojs/lang/kind/@DuplojsLangEither/"

// jsEntries donne les clés et les valeurs de l'objet JS équivalent,
// dans l'ordre où DuploJS les crée (et donc où Node les affiche) :
// right|left, information, value, puis le marqueur s'il existe.
func (either Either) jsEntries() ([]string, []any) {
	side := "left"
	if either.IsRight {
		side = "right"
	}
	keys := []string{
		eitherKindPrefix + side,
		eitherKindPrefix + "information",
		eitherKindPrefix + "value",
	}
	values := []any{JSNull{}, either.Information, either.Value}
	if either.Kind != "" {
		keys = append(keys, eitherKindPrefix+either.Kind)
		values = append(values, JSNull{})
	}
	return keys, values
}
