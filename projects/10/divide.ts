import * as DEither from "@duplojs/lang/either";

export function divide(
	value: number,
	divisor: number,
) {
	if (divisor === 0) {
		return DEither.left("division-by-zero", divisor);
	}
	return DEither.success(value / divisor);
}
