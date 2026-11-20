import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

const result = DEither.rightPipe(
	DEither.success(2),
	(value) => value + 3,
	(value) => value * 2,
);

DCommon.print(result);
