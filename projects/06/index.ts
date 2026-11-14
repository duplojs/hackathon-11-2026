import * as DEither from "@duplojs/lang/either";
import { add } from "./add";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import * as DString from "@duplojs/lang/string";

const result = add(-1, 2);

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
		success: (value) => DString.to(value),
	},
);

DCommon.print(newResult);
DCommon.print(message);
