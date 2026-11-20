// coalescing sur une valeur qui est déjà un tableau : identité (même référence, pas d'enveloppe).
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

function pair(): (
	| DEither.Success<readonly number[]>
	| DEither.Fail
) {
	return DEither.success([1, 2]);
}

const items = DEither.whenIsRight(pair(), DArray.coalescing);

DCommon.print(items);
