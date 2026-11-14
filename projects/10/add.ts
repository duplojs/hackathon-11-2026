import * as DEither from "@duplojs/lang/either";

export function add(
	one: number,
	two: number,
) {
	if (one < 0 || two < 0) {
		return DEither.left("negative-operand", one < 0 ? one : two);
	}
	return DEither.success(one + two);
}
