// BROUILLON (version any) : futurs success.go, fail.go et left.go.
// Plus de [L, R] : Go n'a plus rien à deviner, la valeur est un any.
package shard_dependencies

// EitherSuccess correspond à DEither.success(value).
func EitherSuccess(value any) Either {
	return Either{IsRight: true, Information: "success", Kind: "success", Value: value}
}

// EitherFail correspond à DEither.fail(). La valeur JS est undefined :
// JSUndefined{}, que Print affiche « undefined ». Laisser Value vide (nil)
// ferait planter Print.
func EitherFail() Either {
	return Either{IsRight: false, Information: "fail", Kind: "fail", Value: JSUndefined{}}
}

// EitherLeft correspond à DEither.left(information, value). Kind reste "" :
// left() n'ajoute pas de 4e clé à l'affichage.
func EitherLeft(information string, value any) Either {
	return Either{IsRight: false, Information: information, Value: value}
}
