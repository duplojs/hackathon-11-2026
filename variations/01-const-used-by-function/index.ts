// const de premier niveau lue par une fonction du même fichier :
// elle doit rester visible depuis la fonction (variable de package en Go).
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

const offset = 10;

function addOffset(
	value: number,
): (
	| DEither.Success<number>
	| DEither.Fail
) {
	return DEither.success(value + offset);
}

const result = addOffset(5);

if (DEither.isRight(result)) {
	DCommon.print(result);
}
