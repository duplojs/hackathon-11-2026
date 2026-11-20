// Référence TypeScript : deux façons d'enchaîner des étapes.
// - pipe : chaque étape reçoit le résultat de la précédente, sans condition ;
// - rightPipe : on s'arrête à la première étape qui renvoie un échec, et on garde cet échec.
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

function divide(value: number, divisor: number) {
	DCommon.print("divide est appelée");
	if (divisor === 0) {
		return DEither.left("division-by-zero", divisor);
	}
	return DEither.success(value / divisor);
}

// 1. rightPipe : add réussit, divide échoue -> l'échec de divide.
DCommon.print(DEither.rightPipe(add(1, 2), (value) => divide(value, 0)));

// 2. rightPipe : add échoue -> divide n'est jamais appelée, l'échec de add est gardé.
DCommon.print(DEither.rightPipe(add(-1, 2), (value) => divide(value, 0)));

// 3. rightPipe à deux étapes : tout réussit.
DCommon.print(DEither.rightPipe(
	add(4, 5),
	(value) => divide(value, 3),
	(value) => DEither.success(value * 2),
));

// 4. pipe avec des étapes curryfiées (exercices 05 à 07).
DCommon.print(DCommon.pipe(
	add(1, 2),
	DEither.whenIsRightOtherwise(DArray.coalescing, () => [-12]),
	DArray.map(DString.to),
));
