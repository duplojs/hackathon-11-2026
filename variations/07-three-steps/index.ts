import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

const result = DEither.rightPipe(
	DEither.success(2),
	(value) => DEither.success(value + 1),
	(value) => {
		if (value > 0) {
			return DEither.left("second-step", value);
		}

		return DEither.success(value);
	},
	(value) => {
		DCommon.print("third step must not run");
		return DEither.success(value + 1);
	},
);

DCommon.print(result);
