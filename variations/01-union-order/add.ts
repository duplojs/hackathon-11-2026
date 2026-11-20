import * as DEither from "@duplojs/lang/either";

// Union dans l'ordre inverse de projects/01 : doit produire le même type Go.
export function add(
	one: number,
	two: number,
): (
	| DEither.Fail
	| DEither.Success<number>
) {
	return DEither.success(one + two);
}
