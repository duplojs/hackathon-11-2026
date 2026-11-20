// Opérateurs unaires et inégalité stricte : -x sur une variable, ! sur un booléen, !==.
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

function check(
	value: number,
	enabled: boolean,
) {
	const negated = -value;
	if (!enabled) {
		return DEither.fail();
	}
	if (negated !== -3) {
		return DEither.fail();
	}
	return DEither.success(negated);
}

DCommon.print(check(3, true));
DCommon.print(check(3, false));
DCommon.print(check(4, true));
