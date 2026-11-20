// return dans un if imbriqué ; type de retour inféré (Fail | Success<number>).
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

function classify(
	one: number,
	two: number,
) {
	if (one >= 0) {
		if (two === 0) {
			return DEither.fail();
		}
	}
	return DEither.success(one + two);
}

DCommon.print(classify(1, 0));
DCommon.print(classify(1, 2));
