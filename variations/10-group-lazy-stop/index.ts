import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

const result = DEither.asyncGroup([
	() => {
		DCommon.print("factory 1");
		return DEither.success(1);
	},
	() => {
		DCommon.print("factory 2");
		return DEither.left("second", 2);
	},
	() => {
		DCommon.print("factory 3 must not run");
		return DEither.success(3);
	},
]);

DCommon.print(await result);
