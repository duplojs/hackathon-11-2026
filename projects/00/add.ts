import * as DEither from "@duplojs/lang/either";

export function add(
	one: number,
	two: number,
) {
	return DEither.success(one + two);
}
