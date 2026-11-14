import * as DEither from "@duplojs/lang/either";
import { add } from "./add";
import { divide } from "./divide";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import * as DString from "@duplojs/lang/string";

const inputs: [number, number, number][] = [
	[1, 2, 1],
	[4, 5, 3],
	[2, 3, 0],
];

const calculations = DArray.map(
	inputs,
	([one, two, divisor]) => DEither.rightPipe(
		add(one, two),
		(value) => divide(value, divisor),
	),
);

const display = DCommon.pipe(
	calculations,
	DArray.map(
		DEither.whenIsRightOtherwise(
			DString.to,
			() => "échec",
		),
	),
);

DCommon.print(display);
