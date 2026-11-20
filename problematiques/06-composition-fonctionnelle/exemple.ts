import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DString from "@duplojs/lang/string";

function divide(value: number, divisor: number) {
	if (divisor === 0) {
		return DEither.left("division-by-zero", divisor);
	}

	return DEither.success(value / divisor);
}

function compute(divisor: number) {
	return DCommon.pipe(
		DEither.rightPipe(
			DEither.success(10),
			(value) => divide(value, divisor),
		),
		DEither.whenIsRightOtherwise(DArray.coalescing, () => [-1]),
		DArray.map(DString.to),
	);
}

console.log(compute(2).join(","));
console.log(compute(0).join(","));
