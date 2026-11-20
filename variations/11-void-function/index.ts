import * as DCommon from "@duplojs/lang/common";

function report(value: number) {
	if (value < 0) {
		DCommon.print("négatif");
		return;
	}
	DCommon.print(value);
}

report(-1);
report(5);
