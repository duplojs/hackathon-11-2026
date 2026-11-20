// Scénario de référence pour l'ADR-1.
// Reprend la logique des exercices 04, 06, 07 et 09. Sa sortie (expected.txt) est
// la vérité que chaque représentation Go doit reproduire à l'identique.
// Exécution : node_modules/.bin/tsx research/either/reference/scenario.ts > research/either/reference/expected.txt
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import * as DString from "@duplojs/lang/string";

// Exercice 04 : Fail | Success<number>
function add04(one: number, two: number) {
	if (one === -1) {
		return DEither.fail();
	}
	return DEither.success(one + two);
}

// Exercice 06 : Left<"negative-operand", number> | Success<number>
function add(one: number, two: number) {
	if (one < 0 || two < 0) {
		return DEither.left("negative-operand", one < 0 ? one : two);
	}
	return DEither.success(one + two);
}

// Exercice 07 : divide
function divide(value: number, divisor: number) {
	if (divisor === 0) {
		return DEither.left("division-by-zero", divisor);
	}
	return DEither.success(value / divisor);
}

// Exercices 07/08 : rightPipe
function calculate(one: number, two: number, divisor: number) {
	return DEither.rightPipe(
		add(one, two),
		(value) => divide(value, divisor),
	);
}

// Exercice 07 : matchInformation
function message(result: ReturnType<typeof calculate>) {
	return DEither.matchInformation(
		result,
		{
			"negative-operand": () => "un opérande est négatif",
			"division-by-zero": () => "division par zéro impossible",
			success: DString.to,
		},
	);
}

DCommon.print(add04(-1, 2));
DCommon.print(add04(1, 2));
DCommon.print(add(1, 2));
DCommon.print(add(-1, 2));
DCommon.print(add(1, -2));
DCommon.print(calculate(1, 2, 1));
DCommon.print(calculate(2, 3, 0));
DCommon.print(calculate(-1, 2, 1));
DCommon.print(calculate(1, 2, 4));
DCommon.print(message(calculate(1, 2, 1)));
DCommon.print(message(calculate(2, 3, 0)));
DCommon.print(message(calculate(-1, 2, 1)));

// Exercice 09 : group, tout ou rien
const failing: [number, number, number][] = [
	[1, 2, 1],
	[4, 5, 3],
	[2, 3, 0],
];
const passing: [number, number, number][] = [
	[1, 2, 1],
	[4, 5, 3],
];
DCommon.print(DEither.group(DArray.map(failing, ([one, two, divisor]) => calculate(one, two, divisor))));
DCommon.print(DEither.group(DArray.map(passing, ([one, two, divisor]) => calculate(one, two, divisor))));
