// Problématique 08 : regrouper des résultats en une transaction.
// Exécution : pnpm exec tsx problematiques/analyse-detaillee/08-agregation-group/exemples/exemple.ts
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function divide(value: number, divisor: number) {
	console.log(`calcule ${value} / ${divisor}`);
	if (divisor === 0) {
		return DEither.left("division-by-zero", divisor);
	}

	return DEither.success(value / divisor);
}

// 1. Tableau de résultats (longueur variable) -> Success<number[]>.
const results = [divide(6, 3), divide(9, 3)];
DCommon.print(DEither.unwrapRight(DEither.group(results)));

// 2. Tuple de getters (longueur fixe) -> Success<[number, number, number]>.
//    Les getters sont appelés UN PAR UN, et l'exécution s'arrête au premier
//    échec : `divide(8, 2)` n'est jamais calculé.
const transaction = DEither.group([
	() => divide(6, 3),
	() => divide(1, 0),
	() => divide(8, 2),
] as const);

DCommon.print(DEither.isRight(transaction) ? "validée" : "annulée");
