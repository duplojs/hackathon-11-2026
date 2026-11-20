import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

const calculations: (
	| DEither.Left<"failure", number>
	| DEither.Success<number>
)[] = [
	DEither.success(2),
	DEither.success(3),
];

DCommon.print(DEither.group(calculations));
