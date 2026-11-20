import * as DCommon from "@duplojs/lang/common";

function show(value: string | number | null) {
	if (value === null) {
		return "rien";
	}
	if (typeof value === "number") {
		return value > 1 ? "grand" : "petit";
	}
	return value;
}

const values: (string | number)[] = [1, "a", 2];
const flags = [true, false];
const grid = [[1, 2], [3]];

DCommon.print(values);
DCommon.print(flags);
DCommon.print(grid);
DCommon.print(show(3));
DCommon.print(show("x"));
DCommon.print(show(null));
