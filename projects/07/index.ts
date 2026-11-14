import * as DEither from "@duplojs/lang/either";
import { add } from "./add";
import { divide } from "./divide";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import * as DString from "@duplojs/lang/string";

const result = DEither.rightPipe(
	add(1, 2),
	(value) => divide(value, 0),
);

if (DEither.isRight(result)) {
	DCommon.print(result);
}

const newResult = DCommon.pipe(
	result,
	DEither.whenIsRightOtherwise(
		DArray.coalescing,
		() => [-12],
	),
	DArray.map(DString.to),
);

const message = DEither.matchInformation(
	result,
	{
		"negative-operand": () => "un opérande est négatif",
		"division-by-zero": () => "division par zéro impossible",
		success: DString.to,
	},
);

DCommon.print(newResult);
DCommon.print(message);
