import * as DEither from "@duplojs/lang/either";

// Deux chemins de retour : un left ou un success.
function add(one: number, two: number) {
	if (one < 0) {
		return DEither.left("negative-operand", one);
	}

	return DEither.success(one + two);
}

const ok = add(1, 2);
const ko = add(-1, 2);

console.log(DEither.isRight(ok));
console.log(DEither.isRight(ko));
