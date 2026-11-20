import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import { add, double, increment } from "./add";

const result = add(1, 2);

const doubled = DEither.whenIsRight(result, double);

DCommon.print(doubled);

const piped = DCommon.pipe(
	result,
	DEither.whenIsRight(increment),
	DEither.whenIsRight(double),
);

DCommon.print(piped);
