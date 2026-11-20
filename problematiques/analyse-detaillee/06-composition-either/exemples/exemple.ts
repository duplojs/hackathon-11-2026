// Problématique 06 : composer des résultats Either.
// Exécution : pnpm exec tsx problematiques/analyse-detaillee/06-composition-either/exemples/exemple.ts
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function add(one: number, two: number) {
	if (one < 0 || two < 0) {
		return DEither.left("negative-operand", one < 0 ? one : two);
	}

	return DEither.success(one + two);
}

function divide(value: number, divisor: number) {
	if (divisor === 0) {
		return DEither.left("division-by-zero", divisor);
	}

	return DEither.success(value / divisor);
}

// 1. rightPipe : enchaîne des étapes dépendantes, s'arrête au premier échec.
//    Une étape qui renvoie une valeur simple est enveloppée dans un Success.
function calculate(one: number, two: number, divisor: number) {
	return DEither.rightPipe(
		add(one, two),
		(sum) => divide(sum, divisor),
		(quotient) => quotient * 10,
	);
}

// 2. whenIsRight : transforme seulement la valeur d'un succès.
const doubled = DEither.whenIsRight(calculate(1, 2, 1), (value) => value * 2);

// 3. whenIsRightOtherwise : un traitement pour chaque issue.
//    Les deux branches ont des types différents -> le résultat est une union.
function display(one: number, two: number, divisor: number) {
	return DEither.whenIsRightOtherwise(
		calculate(one, two, divisor),
		(value) => value,
		() => "calcul impossible",
	);
}

DCommon.print(DEither.unwrapRight(doubled));
DCommon.print(display(4, 5, 3));
DCommon.print(display(4, 5, 0));
DCommon.print(display(-1, 5, 3));
