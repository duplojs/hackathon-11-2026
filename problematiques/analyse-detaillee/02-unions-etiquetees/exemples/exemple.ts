// Problématique 02 : représenter une union TypeScript en Go.
// Exécution : pnpm exec tsx problematiques/analyse-detaillee/02-unions-etiquetees/exemples/exemple.ts
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

// Pas d'annotation de retour : le checker infère `Fail | Success<number>`.
function add(one: number, two: number) {
	if (one === -1) {
		return DEither.fail();
	}

	return DEither.success(one + two);
}

const result = add(1, 2);

// `isRight` est un garde de type : dans le bloc, `result` est un `Success<number>`.
if (DEither.isRight(result)) {
	DCommon.print(DEither.unwrapRight(result));
}

const failed = add(-1, 2);

if (DEither.isRight(failed)) {
	DCommon.print("jamais affiché");
} else {
	DCommon.print("échec");
}
