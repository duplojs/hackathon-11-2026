import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

const calculations: (
	| DEither.Left<"first", number>
	| DEither.Left<"second", number>
	| DEither.Success<number>
)[] = [
	DEither.left("first", 7),
	DEither.left("second", 9),
	DEither.success(3),
];

DCommon.print(DEither.group(calculations));
