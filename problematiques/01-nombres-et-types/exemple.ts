import type * as DNumber from "@duplojs/lang/number";

// number & DNumber.Positive : une contrainte qui n'existe que dans les types.
function double(value: number & DNumber.Positive) {
	return value * 2;
}

const sum = 0.1 + 0.2;
const half = 3 / 2;

console.log(sum);
console.log(half);
console.log(double(4 as number & DNumber.Positive));
