import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DString from "@duplojs/lang/string";

function check(value: number) {
	if (value < 0) {
		return DEither.left("negative", "valeur négative");
	}
	if (value === 0) {
		return DEither.left("zero", 0);
	}
	return DEither.success(value * 10);
}

DCommon.print(check(-1));
DCommon.print(check(0));
DCommon.print(check(4));

const message = DEither.matchInformation(check(-1), {
	negative: (text) => text,
	zero: (zero) => DString.to(zero),
	success: (value) => DString.to(value),
});

DCommon.print(message);
