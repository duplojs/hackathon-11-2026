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

export function double(
	value: number,
): DEither.Success<number> {
	return DEither.success(value * 2);
}

export function increment(
	value: number,
): DEither.Success<number> {
	return DEither.success(value + 1);
}
