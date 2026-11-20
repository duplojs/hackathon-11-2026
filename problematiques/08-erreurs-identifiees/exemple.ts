import * as DEither from "@duplojs/lang/either";
import * as DString from "@duplojs/lang/string";

function add(one: number, two: number) {
	if (one < 0 || two < 0) {
		return DEither.left("negative-operand", one < 0 ? one : two);
	}

	return DEither.success(one + two);
}

function divide(value: number, divisor: number) {
	if (divisor === 0) {
		return DEither.left("division-by-zero", divisor);
	}

	return DEither.success(value / divisor);
}

function message(one: number, two: number, divisor: number) {
	return DEither.matchInformation(
		DEither.rightPipe(add(one, two), (value) => divide(value, divisor)),
		{
			"negative-operand": () => "un opérande est négatif",
			"division-by-zero": () => "division par zéro impossible",
			success: (value) => DString.to(value),
		},
	);
}

console.log(message(1, 2, 1));
console.log(message(-1, 2, 1));
console.log(message(1, 2, 0));
