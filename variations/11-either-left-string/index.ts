import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

function check(value: number) {
	if (value < 0) {
		return DEither.left("negative", "message");
	}
	return DEither.success(value);
}

DCommon.print(check(-1));
DCommon.print(check(2));
DCommon.print(DEither.isLeft(check(-1)));
