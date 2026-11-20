// Fonctions fléchées qui capturent une variable extérieure (closure), dont une à corps-bloc
// avec plusieurs return, dans un pipe avec map curryfié.
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";

const offset = 10;

const shifted = DCommon.pipe(
	[1, 2, 3],
	DArray.map((value) => value + offset),
	DArray.map((value) => {
		if (value > 11) {
			return value;
		}
		return 0;
	}),
);

DCommon.print(shifted);
