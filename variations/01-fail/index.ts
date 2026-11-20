// Fonction annotée qui renvoie DEither.fail() : affichage d'un Fail (value: undefined).
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function check(
	value: number,
): (
	| DEither.Success<number>
	| DEither.Fail
) {
	return DEither.fail();
}

const result = check(1);

DCommon.print(result);

if (DEither.isRight(result)) {
	DCommon.print("jamais affiché");
}
