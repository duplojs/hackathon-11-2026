// Deux traductions Go possibles de l'exemple du prof, pour comparer leur coût.
package profbench

import "regexp"

// jsLength : longueur au sens JS (unités UTF-16). len() en Go compte des octets.
func jsLength(text string) int {
	length := 0
	for _, character := range text {
		if character >= 0x10000 {
			length += 2
		} else {
			length++
		}
	}
	return length
}

// ---------- Version A : « naïve », tout passe par any ----------
// Facile à générer pour n'importe quelle union TS, mais chaque valeur rangée
// dans un any est copiée sur le tas (allocation), et il faut des tests de type.

type EitherAny struct {
	IsRight     bool
	Information string
	Kind        string
	Value       any
}

func checkUserNameA(username string) any {
	if regexp.MustCompile("[0-9]").MatchString(username) { // regex recompilée à chaque appel
		return EitherAny{Information: "must-be-not-contain-number"}
	}
	if containsByte(username, '@') {
		return EitherAny{Information: "error", Kind: "error"}
	}
	return EitherAny{IsRight: true, Information: "valid-username", Value: username}
}

func unwrapRightA(input any) any {
	if either, ok := input.(EitherAny); ok && either.IsRight {
		return either.Value
	}
	return input
}

func mainA(username string) any {
	checked := unwrapRightA(checkUserNameA(username))
	if either, ok := checked.(EitherAny); ok && !either.IsRight {
		return either
	}
	return EitherAny{IsRight: true, Information: "success", Kind: "success", Value: float64(jsLength(checked.(string)))}
}

// ---------- Version B : typée, sans any ----------
// Le transpileur connaît les types grâce au checker TS : il peut générer
// des structs précis, passés par valeur, sans allocation.

type Either[L any, R any] struct {
	IsRight     bool
	Information string
	Kind        string
	Left        L
	Right       R
}

// Les deux Left ont des valeurs sans donnée (undefined, null) : 0 octet.
type mainLeft struct{}

var digitPattern = regexp.MustCompile("[0-9]") // compilée une seule fois

func checkUserNameB(username string) Either[mainLeft, string] {
	if digitPattern.MatchString(username) {
		return Either[mainLeft, string]{Information: "must-be-not-contain-number"}
	}
	if containsByte(username, '@') {
		return Either[mainLeft, string]{Information: "error", Kind: "error"}
	}
	return Either[mainLeft, string]{IsRight: true, Information: "valid-username", Right: username}
}

func mainB(username string) Either[mainLeft, float64] {
	// unwrapRight ne coûte rien : on garde le même struct, et le cas « droite »
	// signifie « la chaîne déballée ».
	checked := checkUserNameB(username)
	if !checked.IsRight { // DEither.isLeft(checkedUsername)
		return Either[mainLeft, float64]{Information: checked.Information, Kind: checked.Kind}
	}
	return Either[mainLeft, float64]{IsRight: true, Information: "success", Kind: "success", Right: float64(jsLength(checked.Right))}
}

func containsByte(text string, b byte) bool {
	for i := 0; i < len(text); i++ {
		if text[i] == b {
			return true
		}
	}
	return false
}

// ---------- Version A2 : any, mais regex compilée une seule fois ----------
// Sert à séparer les deux coûts de la version A.

func checkUserNameA2(username string) any {
	if digitPattern.MatchString(username) {
		return EitherAny{Information: "must-be-not-contain-number"}
	}
	if containsByte(username, '@') {
		return EitherAny{Information: "error", Kind: "error"}
	}
	return EitherAny{IsRight: true, Information: "valid-username", Value: username}
}

func mainA2(username string) any {
	checked := unwrapRightA(checkUserNameA2(username))
	if either, ok := checked.(EitherAny); ok && !either.IsRight {
		return either
	}
	return EitherAny{IsRight: true, Information: "success", Kind: "success", Value: float64(jsLength(checked.(string)))}
}
