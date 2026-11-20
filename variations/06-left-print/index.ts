// DEither.left avec information et valeur : affichage d'un Left (sans clé de tag),
// puis isLeft / isRight sur ce Left.
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function check(value: number) {
	if (value > 100) {
		return DEither.left("too-big", value);
	}
	return DEither.success(value);
}

const result = check(142);

DCommon.print(result);

if (DEither.isLeft(result)) {
	DCommon.print("gauche");
}
