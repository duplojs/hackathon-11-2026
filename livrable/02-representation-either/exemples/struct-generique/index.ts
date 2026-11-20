// Référence TypeScript : les trois constructeurs utilisés par les exercices,
// isRight, et le cas qui justifie le champ Kind.
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

// Type déduit : Left<"negative-operand", number> | Success<number>
function add(one: number, two: number) {
	if (one < 0 || two < 0) {
		return DEither.left("negative-operand", one < 0 ? one : two);
	}
	return DEither.success(one + two);
}

// Type déduit : Fail | Success<number>
function check(value: number) {
	if (value === 0) {
		return DEither.fail();
	}
	return DEither.success(value);
}

const sum = add(1, 2);

if (DEither.isRight(sum)) {
	DCommon.print(sum);
}

DCommon.print(add(-4, 2));
DCommon.print(check(0));

// Même information ("success"), même valeur (3)… mais pas le même affichage
// que DEither.success(3) : il manque la clé `success: null`.
DCommon.print(DEither.right("success", 3));
