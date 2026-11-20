// matchInformation en forme CURRYFIÉE dans un pipe, sur un succès puis sur un Left porteur
// d'une valeur ; handler qui lit la valeur du Left.
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DString from "@duplojs/lang/string";

function check(value: number) {
	if (value > 100) {
		return DEither.left("too-big", value);
	}
	return DEither.success(value);
}

const describe = (input: number) => DCommon.pipe(
	check(input),
	DEither.matchInformation({
		"too-big": (value) => `trop grand : ${DString.to(value)}`,
		success: (value) => DString.to(value),
	}),
);

DCommon.print(describe(5));
DCommon.print(describe(500));
