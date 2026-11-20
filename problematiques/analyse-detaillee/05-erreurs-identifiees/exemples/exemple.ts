// Problématique 05 : erreurs identifiées et traitement selon l'information.
// Exécution : pnpm exec tsx problematiques/analyse-detaillee/05-erreurs-identifiees/exemples/exemple.ts
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DString from "@duplojs/lang/string";

// Deux échecs distincts, chacun avec son information et son contexte.
// Type inféré : Left<"negative-operand", number>
//             | Left<"division-by-zero", 0>
//             | Success<number>
function divide(value: number, divisor: number) {
	if (value < 0) {
		return DEither.left("negative-operand", value);
	}

	if (divisor === 0) {
		return DEither.left("division-by-zero", divisor);
	}

	return DEither.success(value / divisor);
}

function describe(value: number, divisor: number): string {
	return DEither.matchInformation(
		divide(value, divisor),
		{
			"negative-operand": (operand) => `opérande négatif : ${DString.to(operand)}`,
			"division-by-zero": () => "division par zéro impossible",
			success: (quotient) => `résultat : ${DString.to(quotient)}`,
		},
	);
}

DCommon.print(describe(6, 3));
DCommon.print(describe(-4, 2));
DCommon.print(describe(6, 0));
