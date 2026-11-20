import * as DEither from "@duplojs/lang/either";

// Même add que l exercice 05 : échec si one === -1, sinon succès.
export function add(
	one: number,
	two: number,
) {
	if (one === -1) {
		return DEither.fail();
	}
	return DEither.success(one + two);
}

// Succès qui porte déjà un tableau : sert à tester coalescing sur un tableau.
export function pair(
	one: number,
) {
	if (one === -1) {
		return DEither.fail();
	}
	return DEither.success([one, one]);
}
