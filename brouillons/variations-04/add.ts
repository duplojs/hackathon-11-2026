import * as DEither from "@duplojs/lang/either";

export function add(
	one: number,
	two: number,
) {
	if (one === -1) {
		return DEither.fail();
	}
	return DEither.success(one + two);
}
