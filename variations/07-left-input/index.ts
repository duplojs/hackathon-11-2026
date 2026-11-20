import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

const result = DEither.rightPipe(
	DEither.left("already-stopped", 7),
	() => {
		DCommon.print("callback must not run");
		return DEither.success(1);
	},
);

DCommon.print(result);
