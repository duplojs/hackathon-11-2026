import * as DEither from "@duplojs/lang/either";

export function add(
	one: number,
	two: number,
): (
	| DEither.Success<number>
	| DEither.Fail
) {
	return DEither.success(one + two);
}
