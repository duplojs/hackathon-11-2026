import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

const result = DEither.asyncGroup([
	() => {
		DCommon.print("factory 1");
		return DEither.success(1);
	},
	() => {
		DCommon.print("factory 2");
		return DEither.success(2);
	},
]);

DCommon.print("synchronous effect before await");
DCommon.print(await result);
