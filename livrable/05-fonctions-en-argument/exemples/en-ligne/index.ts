// Référence TypeScript : les fonctions DuploJS qui reçoivent d'autres fonctions.
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import * as DString from "@duplojs/lang/string";

function add(one: number, two: number) {
	if (one < 0 || two < 0) {
		return DEither.left("negative-operand", one < 0 ? one : two);
	}
	return DEither.success(one + two);
}

function double(value: number) {
	return value * 2;
}

const succeeded = add(1, 2);
const failed = add(-1, 2);

// 1. whenIsRightOtherwise : une fonction fléchée pour le succès, une pour l'échec.
const fromSuccess = DEither.whenIsRightOtherwise(
	succeeded,
	(value) => [value, value * 10],
	() => [-12],
);
const fromFailure = DEither.whenIsRightOtherwise(
	failed,
	(value) => [value, value * 10],
	() => [-12],
);
DCommon.print(fromSuccess);
DCommon.print(fromFailure);

// 2. map : une fonction passée par son nom, appliquée à chaque élément.
DCommon.print(DArray.map(fromSuccess, DString.to));

// 3. matchInformation : une fonction par information. Le paramètre reçoit la valeur
//    du bon côté : Left pour "negative-operand", Right pour "success".
DCommon.print(DEither.matchInformation(failed, {
	"negative-operand": (operand) => operand * 100,
	success: double,
}));
DCommon.print(DEither.matchInformation(succeeded, {
	"negative-operand": (operand) => operand * 100,
	success: double,
}));
