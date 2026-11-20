import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

const result = DEither.rightAsyncPipe(
	DEither.left("already-stopped", 7),
	(value) => {
		DCommon.print("first step must not run");
		return DEither.success(value + 1);
	},
	(value) => {
		DCommon.print("second step must not run");
		return value + 1;
	},
);

DCommon.print(await result);
