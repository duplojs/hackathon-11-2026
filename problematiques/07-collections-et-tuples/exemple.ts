import * as DArray from "@duplojs/lang/array";
import * as DEither from "@duplojs/lang/either";

function divide(value: number, divisor: number) {
	if (divisor === 0) {
		return DEither.left("division-by-zero", divisor);
	}

	return DEither.success(value / divisor);
}

const inputs: [number, number, number][] = [
	[1, 2, 1],
	[4, 5, 3],
	[2, 3, 0],
];

// Chaque calcul garde son propre résultat, succès ou échec.
const calculations = DArray.map(
	inputs,
	([one, two, divisor]) => divide(one + two, divisor),
);

// La transaction ne réussit que si tous les calculs réussissent.
const transaction = DEither.group(calculations);

console.log(DArray.map(calculations, (result) => DEither.isRight(result)).join(","));
console.log(DEither.isRight(transaction));
